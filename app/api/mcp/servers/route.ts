import {
  getOrCreateAnonymousSession,
  setAnonymousSessionCookie
} from '@/lib/anonymous-session';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

let postSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  description: z.string().optional(),
  category: z.string().optional(),
  transport: z.enum(['sse', 'streamable_http'])
});

export let GET = async () => {
  try {
    let session = await auth();

    if (session?.user?.id) {
      let servers = await prisma.customMCPServer.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' }
      });

      return NextResponse.json({ servers });
    }

    let anonymousToken = await getOrCreateAnonymousSession();
    await setAnonymousSessionCookie(anonymousToken);

    let anonymousSession = await prisma.anonymousSession.findUnique({
      where: { sessionToken: anonymousToken },
      include: { customMCPServers: true }
    });

    return NextResponse.json({
      servers: anonymousSession?.customMCPServers || []
    });
  } catch (error) {
    console.error('Error fetching custom servers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

export let POST = async (request: Request) => {
  try {
    let body = await request.json();
    let validatedData = postSchema.parse(body);
    let { name, url, description, category, transport } = validatedData;

    let session = await auth();

    if (session?.user?.id) {
      let server = await prisma.customMCPServer.create({
        data: {
          name,
          url,
          description,
          category: category || 'Custom',
          transport,
          userId: session.user.id
        }
      });

      return NextResponse.json({ server }, { status: 201 });
    }

    let anonymousToken = await getOrCreateAnonymousSession();
    await setAnonymousSessionCookie(anonymousToken);

    let anonymousSession = await prisma.anonymousSession.findUnique({
      where: { sessionToken: anonymousToken }
    });

    if (!anonymousSession) {
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    let server = await prisma.customMCPServer.create({
      data: {
        name,
        url,
        description,
        category: category || 'Custom',
        transport,
        anonymousSessionId: anonymousSession.id
      }
    });

    return NextResponse.json({ server }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error creating custom server:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
