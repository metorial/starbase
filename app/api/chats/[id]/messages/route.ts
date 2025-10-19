import { getOrCreateAnonymousSession } from '@/lib/anonymous-session';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import Anthropic from '@anthropic-ai/sdk';
import { streamText } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string };
}

let messageSchema = z.object({
  message: z.string().optional(),
  model: z.string().default('claude-sonnet-4-5-20250929'),
  tools: z.record(z.string(), z.any()).optional(),
  toolResults: z
    .array(
      z.object({
        toolCallId: z.string(),
        result: z.any(),
        isError: z.boolean().optional()
      })
    )
    .optional()
});

let getUserContext = async () => {
  let session = await auth();
  let anonymousSessionId: string | null = null;

  if (!session?.user) {
    let token = await getOrCreateAnonymousSession();
    let anonSession = await prisma.anonymousSession.findUnique({
      where: { sessionToken: token }
    });
    anonymousSessionId = anonSession?.id || null;
  }

  return {
    userId: session?.user?.id || null,
    anonymousSessionId
  };
};

export let POST = async (request: Request, { params }: RouteParams) => {
  try {
    let { userId, anonymousSessionId } = await getUserContext();

    if (!userId && !anonymousSessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let { id: chatId } = params;
    let body = await request.json();
    let validatedData = messageSchema.parse(body);
    let { message, model, tools, toolResults } = validatedData;

    let chat = await prisma.chat.findUnique({
      where: {
        id: chatId,
        ...(userId ? { userId } : { anonymousSessionId })
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        },
        servers: true
      }
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    if (toolResults && toolResults.length > 0) {
      await prisma.chatMessage.create({
        data: {
          chatId,
          role: 'user',
          content: `[Tool results: ${toolResults.length} tools executed]`,
          toolCalls: JSON.stringify({ toolResults })
        }
      });
    } else if (message) {
      await prisma.chatMessage.create({
        data: {
          chatId,
          role: 'user',
          content: message
        }
      });
    }

    let allMessages = chat.messages.map((m, index) => {
      let role = m.role as 'user' | 'assistant' | 'system';

      let isLastMessage = index === chat.messages.length - 1;
      if (
        toolResults &&
        toolResults.length > 0 &&
        isLastMessage &&
        role === 'assistant' &&
        m.toolCalls
      ) {
        try {
          let toolCallsData =
            typeof m.toolCalls === 'string' ? JSON.parse(m.toolCalls) : m.toolCalls;
          let content: any[] = [];

          if (m.content) {
            content.push({
              type: 'text',
              text: m.content
            });
          }

          if (toolCallsData.toolCalls && Array.isArray(toolCallsData.toolCalls)) {
            for (let tc of toolCallsData.toolCalls) {
              content.push({
                type: 'tool_use',
                id: tc.id,
                name: tc.name,
                input: tc.input
              });
            }
          }

          return {
            role,
            content
          };
        } catch (error) {
          console.error('[Chat API] Error parsing tool calls:', error);
          return {
            role,
            content: m.content
          };
        }
      }

      return {
        role,
        content: m.content
      };
    });

    if (!toolResults && message) {
      allMessages.push({ role: 'user' as const, content: message });
    }

    let systemMessages: string[] = [];
    let conversationMessages: Array<{ role: 'user' | 'assistant'; content: any }> = [];

    for (let msg of allMessages) {
      if (msg.role === 'system') {
        systemMessages.push(msg.content);
      } else {
        let hasContent = Array.isArray(msg.content)
          ? msg.content.length > 0
          : msg.content && msg.content.trim().length > 0;

        if (hasContent) {
          conversationMessages.push(msg as { role: 'user' | 'assistant'; content: any });
        }
      }
    }

    if (toolResults && toolResults.length > 0) {
      let toolResultBlocks = toolResults.map(tr => ({
        type: 'tool_result' as const,
        tool_use_id: tr.toolCallId,
        content: JSON.stringify(tr.result),
        is_error: tr.isError || false
      }));

      conversationMessages.push({
        role: 'user',
        content: toolResultBlocks
      });
    }

    let llmModel;
    if (model.startsWith('claude')) {
      llmModel = anthropic(model);
    } else if (model.startsWith('gpt')) {
      llmModel = openai(model);
    } else if (model.startsWith('gemini')) {
      console.warn('[Chat API] Gemini models not configured, falling back to Claude');
      llmModel = anthropic('claude-sonnet-4-5-20250929');
    } else {
      llmModel = anthropic('claude-sonnet-4-5-20250929');
    }

    let anthropicTools: Anthropic.Messages.Tool[] | undefined = undefined;
    let toolMetadata = new Map<string, any>();

    if (tools && Object.keys(tools).length > 0) {
      anthropicTools = [];

      for (let [toolName, toolDef] of Object.entries(tools)) {
        let { description, parameters, _meta } = toolDef as any;

        try {
          let inputSchema = parameters || { type: 'object' };
          if (!inputSchema.type) {
            inputSchema.type = 'object';
          }

          let sanitizedToolName = toolName
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .substring(0, 128);

          if (!sanitizedToolName || sanitizedToolName.length === 0) {
            console.warn(`[Chat API] Skipping tool with invalid name: ${toolName}`);
            continue;
          }

          anthropicTools.push({
            name: sanitizedToolName,
            description: description || `MCP tool: ${toolName}`,
            input_schema: inputSchema
          });

          toolMetadata.set(sanitizedToolName, { ..._meta, originalName: toolName });
        } catch (error) {
          console.error(`[Chat API] Error creating tool ${toolName}:`, error);
        }
      }
    }

    if (anthropicTools && anthropicTools.length > 0 && model.startsWith('claude')) {
      let anthropicClient = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });

      let stream = await anthropicClient.messages.stream({
        model,
        max_tokens: 4096,
        messages: conversationMessages.map(m => ({
          role: m.role,
          content: m.content
        })),
        tools: anthropicTools,
        system: systemMessages.length > 0 ? systemMessages.join('\n\n') : undefined
      });

      let readableStream = new ReadableStream({
        async start(controller) {
          try {
            let fullText = '';
            let toolCalls: any[] = [];

            for await (let event of stream) {
              if (event.type === 'content_block_delta') {
                if (event.delta.type === 'text_delta') {
                  let text = event.delta.text;
                  fullText += text;

                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify({ type: 'text', text })}\n\n`
                    )
                  );
                }
              } else if (event.type === 'content_block_start') {
                if (event.content_block.type === 'tool_use') {
                  let toolCall = event.content_block;
                  toolCalls.push(toolCall);

                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify({
                        type: 'tool_call',
                        tool_call: {
                          id: toolCall.id,
                          name: toolCall.name,
                          input: toolCall.input
                        }
                      })}\n\n`
                    )
                  );
                }
              }
            }

            let messageContent =
              fullText ||
              (toolCalls.length > 0
                ? `[Used ${toolCalls.length} tool${toolCalls.length > 1 ? 's' : ''}]`
                : 'No response');

            await prisma.chatMessage.create({
              data: {
                chatId,
                role: 'assistant',
                content: messageContent,
                toolCalls: toolCalls.length > 0 ? JSON.stringify({ toolCalls }) : undefined
              }
            });

            if (!chat.name && chat.messages.length === 0 && fullText) {
              try {
                let titleStream = await anthropicClient.messages.create({
                  model,
                  max_tokens: 100,
                  messages: [
                    { role: 'user', content: message! },
                    { role: 'assistant', content: fullText },
                    { role: 'user', content: 'Generate a concise title (3-5 words):' }
                  ],
                  system:
                    'Generate a short, descriptive title (3-5 words max) for this conversation. Return ONLY the title, no quotes or punctuation at the end.'
                });

                let titleText =
                  titleStream.content[0].type === 'text'
                    ? titleStream.content[0].text.trim().replace(/^["']|["']$/g, '')
                    : '';

                if (titleText) {
                  await prisma.chat.update({
                    where: { id: chatId },
                    data: { name: titleText }
                  });
                }
              } catch (error) {
                console.error('[Chat API] Failed to generate title:', error);
              }
            }

            await prisma.chat.update({
              where: { id: chatId },
              data: { updatedAt: new Date() }
            });

            controller.close();
          } catch (error) {
            console.error('[Chat API] Stream error:', error);
            controller.error(error);
          }
        }
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked'
        }
      });
    }

    let result = streamText({
      model: llmModel,
      messages: conversationMessages,
      system: systemMessages.length > 0 ? systemMessages.join('\n\n') : undefined,
      onFinish: async ({ text, toolCalls, toolResults: llmToolResults }) => {
        try {
          let messageContent =
            text ||
            (toolCalls && toolCalls.length > 0
              ? `[Used ${toolCalls.length} tool${toolCalls.length > 1 ? 's' : ''}]`
              : 'No response');

          await prisma.chatMessage.create({
            data: {
              chatId,
              role: 'assistant',
              content: messageContent,
              toolCalls: toolCalls
                ? JSON.stringify({ toolCalls, toolResults: llmToolResults })
                : undefined
            }
          });

          if (!chat.name && chat.messages.length === 0 && message) {
            try {
              let titleResult = await streamText({
                model: llmModel,
                system:
                  "Generate a short, descriptive title (3-5 words max) for this conversation based on the user's first message and assistant's response. Return ONLY the title, no quotes or punctuation at the end.",
                messages: [
                  { role: 'user', content: message },
                  { role: 'assistant', content: text },
                  { role: 'user', content: 'Generate a concise title now (3-5 words):' }
                ]
              });

              let generatedTitle = '';
              for await (let chunk of titleResult.textStream) {
                generatedTitle += chunk;
              }

              generatedTitle = generatedTitle.trim().replace(/^["']|["']$/g, '');

              if (generatedTitle && generatedTitle.length > 0) {
                await prisma.chat.update({
                  where: { id: chatId },
                  data: { name: generatedTitle }
                });
              }
            } catch (error) {
              console.error('[Chat API] Failed to generate title:', error);
            }
          }

          await prisma.chat.update({
            where: { id: chatId },
            data: { updatedAt: new Date() }
          });
        } catch (error) {
          console.error('[Chat API] Error in onFinish callback:', error);
        }
      }
    });

    return result.toTextStreamResponse();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    console.error('[Chat API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
