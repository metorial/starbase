import { getOrCreateAnonymousSession, setAnonymousSessionCookie } from './anonymous-session';
import { auth } from './auth';
import { prisma } from './prisma';

export interface SessionContext {
  userId: string | undefined;
  anonymousSessionId: string | undefined;
}

export let getSessionContext = async (): Promise<SessionContext> => {
  let session = await auth();

  if (session?.user?.id) {
    return {
      userId: session.user.id,
      anonymousSessionId: undefined
    };
  }

  // Handle anonymous session
  let anonymousToken = await getOrCreateAnonymousSession();
  await setAnonymousSessionCookie(anonymousToken);

  let anonymousSession = await prisma.anonymousSession.findUnique({
    where: { sessionToken: anonymousToken }
  });

  if (!anonymousSession) {
    throw new Error('Failed to create or retrieve anonymous session');
  }

  return {
    userId: undefined,
    anonymousSessionId: anonymousSession.id
  };
};

export let getSessionContextReadonly = async (): Promise<SessionContext> => {
  let session = await auth();

  if (session?.user?.id) {
    return {
      userId: session.user.id,
      anonymousSessionId: undefined
    };
  }

  let anonymousToken = await getOrCreateAnonymousSession();

  let anonymousSession = await prisma.anonymousSession.findUnique({
    where: { sessionToken: anonymousToken }
  });

  return {
    userId: undefined,
    anonymousSessionId: anonymousSession?.id
  };
};
