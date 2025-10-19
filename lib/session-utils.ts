import { getOrCreateAnonymousSession, setAnonymousSessionCookie } from './anonymous-session';
import { auth } from './auth';
import { prisma } from './prisma';

export interface SessionContext {
  userId: string | undefined;
  anonymousSessionId: string | undefined;
}

/**
 * Get the current session context for API routes.
 * Returns either a userId (for authenticated users) or anonymousSessionId (for unauthenticated users).
 * Also sets the anonymous session cookie if needed.
 */
export async function getSessionContext(): Promise<SessionContext> {
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
}

/**
 * Lightweight version that doesn't set cookies (useful for GET requests that don't need to modify session)
 */
export async function getSessionContextReadonly(): Promise<SessionContext> {
  let session = await auth();

  if (session?.user?.id) {
    return {
      userId: session.user.id,
      anonymousSessionId: undefined
    };
  }

  // Handle anonymous session
  let anonymousToken = await getOrCreateAnonymousSession();

  let anonymousSession = await prisma.anonymousSession.findUnique({
    where: { sessionToken: anonymousToken }
  });

  return {
    userId: undefined,
    anonymousSessionId: anonymousSession?.id
  };
}
