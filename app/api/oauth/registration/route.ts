import {
  getOrCreateAnonymousSession,
  setAnonymousSessionCookie
} from '@/lib/anonymous-session';
import { auth } from '@/lib/auth';
import { createRegistration, getActiveRegistration } from '@/lib/oauth-registration';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

let postSchema = z.object({
  serverUrl: z.string().url(),
  discoveryUrl: z.string().url(),
  clientId: z.string().min(1),
  clientSecret: z.string().optional()
});

export let GET = async (request: Request) => {
  try {
    let { searchParams } = new URL(request.url);
    let serverUrl = searchParams.get('serverUrl');
    let discoveryUrl = searchParams.get('discoveryUrl');

    if (!serverUrl || !discoveryUrl) {
      return NextResponse.json(
        { error: 'serverUrl and discoveryUrl are required' },
        { status: 400 }
      );
    }

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

    let registration = await getActiveRegistration(serverUrl, userId, anonymousSessionId);

    if (!registration) {
      return NextResponse.json({ registration: null });
    }

    return NextResponse.json({
      registration: {
        clientId: registration.clientId,
        clientSecret: registration.clientSecret,
        discoveryUrl: registration.discoveryUrl,
        createdAt: registration.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching OAuth registration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

export let POST = async (request: Request) => {
  try {
    let body = await request.json();
    let validatedData = postSchema.parse(body);
    let { serverUrl, discoveryUrl, clientId, clientSecret } = validatedData;

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

    let registration = await createRegistration(
      serverUrl,
      discoveryUrl,
      clientId,
      clientSecret,
      userId,
      anonymousSessionId
    );

    return NextResponse.json(
      {
        registration: {
          clientId: registration.clientId,
          clientSecret: registration.clientSecret,
          discoveryUrl: registration.discoveryUrl,
          createdAt: registration.createdAt
        }
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    console.error('Error creating OAuth registration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
