import { handleApiError } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';
import { getSessionContext } from '@/lib/session-utils';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

let postSchema = z.object({
  name: z.string().optional(),
  servers: z
    .array(
      z.object({
        serverUrl: z.string(),
        serverName: z.string(),
        transport: z.string().optional(),
        connectionId: z.string().optional()
      })
    )
    .optional()
});

export let GET = async () => {
  try {
    let { userId, anonymousSessionId } = await getSessionContext();

    let chats = await prisma.chat.findMany({
      where: userId ? { userId } : { anonymousSessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1
        },
        servers: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({ chats });
  } catch (error) {
    return handleApiError(error);
  }
};

export let POST = async (request: Request) => {
  try {
    let { userId, anonymousSessionId } = await getSessionContext();

    let body = await request.json();
    let validatedData = postSchema.parse(body);
    let { name, servers } = validatedData;

    let chat = await prisma.chat.create({
      data: {
        name,
        userId,
        anonymousSessionId,
        servers: servers
          ? {
              create: servers.map(s => ({
                serverUrl: s.serverUrl,
                serverName: s.serverName,
                transport: s.transport || 'sse',
                connectionId: s.connectionId
              }))
            }
          : undefined
      },
      include: {
        messages: true,
        servers: true
      }
    });

    return NextResponse.json({ chat }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
};
