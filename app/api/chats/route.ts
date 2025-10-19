import { getOrCreateAnonymousSession } from '@/lib/anonymous-session';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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
    let session = await auth();

    let anonymousSessionId: string | null = null;
    if (!session?.user) {
      let token = await getOrCreateAnonymousSession();
      let anonSession = await prisma.anonymousSession.findUnique({
        where: { sessionToken: token }
      });
      anonymousSessionId = anonSession?.id || null;
    }

    let userId = session?.user?.id;

    if (!userId && !anonymousSessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    console.error('Error fetching chats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

export let POST = async (request: Request) => {
  try {
    let session = await auth();

    let anonymousSessionId: string | null = null;
    if (!session?.user) {
      let token = await getOrCreateAnonymousSession();
      let anonSession = await prisma.anonymousSession.findUnique({
        where: { sessionToken: token }
      });
      anonymousSessionId = anonSession?.id || null;
    }

    let userId = session?.user?.id;

    if (!userId && !anonymousSessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error creating chat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
