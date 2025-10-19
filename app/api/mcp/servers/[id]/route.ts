import { getAnonymousSessionFromCookie } from '@/lib/anonymous-session';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

let putSchema = z.object({
  name: z.string().optional(),
  url: z.string().url().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  transport: z.enum(['sse', 'streamable_http']).optional()
});

export let PUT = async (request: Request, { params }: RouteParams) => {
  try {
    let { id } = await params;
    let body = await request.json();
    let validatedData = putSchema.parse(body);
    let { name, url, description, category, transport } = validatedData;

    let session = await auth();

    let whereClause: any = { id };

    if (session?.user?.id) {
      whereClause.userId = session.user.id;
    } else {
      let anonymousToken = await getAnonymousSessionFromCookie();
      if (!anonymousToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      let anonymousSession = await prisma.anonymousSession.findUnique({
        where: { sessionToken: anonymousToken }
      });

      if (!anonymousSession) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      whereClause.anonymousSessionId = anonymousSession.id;
    }

    let existingServer = await prisma.customMCPServer.findFirst({
      where: whereClause
    });

    if (!existingServer) {
      return NextResponse.json({ error: 'Server not found or unauthorized' }, { status: 404 });
    }

    let server = await prisma.customMCPServer.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(url && { url }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
        ...(transport && { transport })
      }
    });

    return NextResponse.json({ server });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error updating custom server:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

export let DELETE = async (_request: Request, { params }: RouteParams) => {
  try {
    let { id } = await params;

    let session = await auth();

    let whereClause: any = { id };

    if (session?.user?.id) {
      whereClause.userId = session.user.id;
    } else {
      let anonymousToken = await getAnonymousSessionFromCookie();
      if (!anonymousToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      let anonymousSession = await prisma.anonymousSession.findUnique({
        where: { sessionToken: anonymousToken }
      });

      if (!anonymousSession) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      whereClause.anonymousSessionId = anonymousSession.id;
    }

    let existingServer = await prisma.customMCPServer.findFirst({
      where: whereClause
    });

    if (!existingServer) {
      return NextResponse.json({ error: 'Server not found or unauthorized' }, { status: 404 });
    }

    await prisma.customMCPServer.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting custom server:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
