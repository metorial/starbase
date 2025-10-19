import { getOrCreateAnonymousSession } from '@/lib/anonymous-session';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string };
}

let patchSchema = z.object({
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

export let GET = async (request: Request, { params }: RouteParams) => {
  try {
    let { userId, anonymousSessionId } = await getUserContext();

    if (!userId && !anonymousSessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let { id } = params;

    let chat = await prisma.chat.findUnique({
      where: {
        id,
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

    return NextResponse.json({ chat });
  } catch (error) {
    console.error('Error fetching chat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

export let PATCH = async (request: Request, { params }: RouteParams) => {
  try {
    let { userId, anonymousSessionId } = await getUserContext();

    if (!userId && !anonymousSessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let { id } = params;
    let body = await request.json();
    let validatedData = patchSchema.parse(body);
    let { name, servers } = validatedData;

    let existingChat = await prisma.chat.findUnique({
      where: {
        id,
        ...(userId ? { userId } : { anonymousSessionId })
      }
    });

    if (!existingChat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    let chat = await prisma.chat.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(servers
          ? {
              servers: {
                deleteMany: {},
                create: servers.map(s => ({
                  serverUrl: s.serverUrl,
                  serverName: s.serverName,
                  transport: s.transport || 'sse',
                  connectionId: s.connectionId
                }))
              }
            }
          : {}),
        updatedAt: new Date()
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        },
        servers: true
      }
    });

    return NextResponse.json({ chat });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error updating chat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

export let DELETE = async (request: Request, { params }: RouteParams) => {
  try {
    let { userId, anonymousSessionId } = await getUserContext();

    if (!userId && !anonymousSessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let { id } = params;

    let chat = await prisma.chat.deleteMany({
      where: {
        id,
        ...(userId ? { userId } : { anonymousSessionId })
      }
    });

    if (chat.count === 0) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
