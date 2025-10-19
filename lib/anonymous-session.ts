import { cookies } from 'next/headers';
import { prisma } from './prisma';

let ANONYMOUS_SESSION_COOKIE = 'anonymous_session';
let SESSION_DURATION_DAYS = 90;

export let getOrCreateAnonymousSession = async (): Promise<string> => {
  let cookieStore = await cookies();
  let existingToken = cookieStore.get(ANONYMOUS_SESSION_COOKIE)?.value;

  if (existingToken) {
    let session = await prisma.anonymousSession.findUnique({
      where: { sessionToken: existingToken }
    });

    if (session && session.expiresAt > new Date()) {
      return session.sessionToken;
    }

    if (session) {
      await prisma.anonymousSession.delete({
        where: { id: session.id }
      });
    }
  }

  let expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  let newSession = await prisma.anonymousSession.create({
    data: {
      expiresAt
    }
  });

  return newSession.sessionToken;
};

export let setAnonymousSessionCookie = async (sessionToken: string) => {
  let cookieStore = await cookies();
  let expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  cookieStore.set(ANONYMOUS_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/'
  });
};

export let getAnonymousSessionFromCookie = async (): Promise<string | null> => {
  let cookieStore = await cookies();
  let token = cookieStore.get(ANONYMOUS_SESSION_COOKIE)?.value;

  if (!token) return null;

  // Verify session exists and is valid
  let session = await prisma.anonymousSession.findUnique({
    where: { sessionToken: token }
  });

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  return token;
};

export let migrateAnonymousServers = async (
  anonymousSessionToken: string,
  userId: string
): Promise<number> => {
  let session = await prisma.anonymousSession.findUnique({
    where: { sessionToken: anonymousSessionToken }
  });

  if (!session) return 0;

  let serversResult = await prisma.customMCPServer.updateMany({
    where: { anonymousSessionId: session.id },
    data: {
      userId,
      anonymousSessionId: null
    }
  });

  let oauthResult = await prisma.oAuthRegistration.updateMany({
    where: {
      anonymousSessionId: session.id,
      isExpired: false
    },
    data: {
      userId,
      anonymousSessionId: null
    }
  });

  await prisma.serverConnection.updateMany({
    where: { anonymousSessionId: session.id },
    data: {
      userId,
      anonymousSessionId: null
    }
  });

  await prisma.anonymousSession.delete({
    where: { id: session.id }
  });

  return serversResult.count;
};

export let cleanupExpiredSessions = async (): Promise<number> => {
  let result = await prisma.anonymousSession.deleteMany({
    where: {
      expiresAt: {
        lte: new Date()
      }
    }
  });

  return result.count;
};
