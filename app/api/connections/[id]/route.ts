import {
  getOrCreateAnonymousSession,
  setAnonymousSessionCookie
} from '@/lib/anonymous-session';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  deleteConnection,
  getConnection,
  updateDisplayName,
  updateLastUsed
} from '@/lib/server-connection';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

let patchSchema = z.object({
  displayName: z.string()
});

export let GET = async (_request: Request, { params }: RouteParams) => {
  try {
    let { id } = await params;

    let session = await auth();

    let userId: string | undefined;
    let anonymousSessionId: string | undefined;

    if (session?.user?.id) {
      userId = session.user.id;
    } else {
      let anonymousToken = await getOrCreateAnonymousSession();
      await setAnonymousSessionCookie(anonymousToken);

      let anonymousSession = await prisma.anonymousSession.findUnique({
        where: { sessionToken: anonymousToken }
      });

      if (!anonymousSession) {
        console.error('[Connection API] Failed to get anonymous session');
        return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
      }

      anonymousSessionId = anonymousSession.id;
    }

    let connection = await getConnection(id, userId, anonymousSessionId);

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    await updateLastUsed(id);

    return NextResponse.json({ connection });
  } catch (error) {
    console.error('[Connection API] Error fetching connection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

export let PATCH = async (request: Request, { params }: RouteParams) => {
  try {
    let { id } = await params;
    let body = await request.json();
    let validatedData = patchSchema.parse(body);
    let { displayName } = validatedData;

    let session = await auth();

    let userId: string | undefined;
    let anonymousSessionId: string | undefined;

    if (session?.user?.id) {
      userId = session.user.id;
    } else {
      let anonymousToken = await getOrCreateAnonymousSession();
      await setAnonymousSessionCookie(anonymousToken);

      let anonymousSession = await prisma.anonymousSession.findUnique({
        where: { sessionToken: anonymousToken }
      });

      if (!anonymousSession) {
        return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
      }

      anonymousSessionId = anonymousSession.id;
    }

    await updateDisplayName(id, displayName, userId, anonymousSessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    console.error('Error updating connection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

export let DELETE = async (_request: Request, { params }: RouteParams) => {
  try {
    let { id } = await params;

    let session = await auth();

    let userId: string | undefined;
    let anonymousSessionId: string | undefined;

    if (session?.user?.id) {
      userId = session.user.id;
    } else {
      let anonymousToken = await getOrCreateAnonymousSession();
      await setAnonymousSessionCookie(anonymousToken);

      let anonymousSession = await prisma.anonymousSession.findUnique({
        where: { sessionToken: anonymousToken }
      });

      if (!anonymousSession) {
        return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
      }

      anonymousSessionId = anonymousSession.id;
    }

    await deleteConnection(id, userId, anonymousSessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting connection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
