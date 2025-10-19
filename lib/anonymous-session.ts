import { cookies } from 'next/headers';
import { prisma } from './prisma';

let ANONYMOUS_SESSION_COOKIE = 'anonymous_session';
let SESSION_DURATION_DAYS = 90; // 90 days

/**
 * Get or create an anonymous session for unauthenticated users
 */
export let getOrCreateAnonymousSession = async (): Promise<string> => {
  let cookieStore = await cookies();
  let existingToken = cookieStore.get(ANONYMOUS_SESSION_COOKIE)?.value;

  // If we have a token, verify it exists and is valid
  if (existingToken) {
    let session = await prisma.anonymousSession.findUnique({
      where: { sessionToken: existingToken }
    });

    if (session && session.expiresAt > new Date()) {
      return session.sessionToken;
    }

    // Session expired or doesn't exist, clean up
    if (session) {
      await prisma.anonymousSession.delete({
        where: { id: session.id }
      });
    }
  }

  // Create new session
  let expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  let newSession = await prisma.anonymousSession.create({
    data: {
      expiresAt
    }
  });

  return newSession.sessionToken;
};

/**
 * Set the anonymous session cookie
 */
export async function setAnonymousSessionCookie(sessionToken: string) {
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
}

/**
 * Get anonymous session from cookie (doesn't create if missing)
 */
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

/**
 * Migrate anonymous session servers to a user account
 */
export async function migrateAnonymousServers(
  anonymousSessionToken: string,
  userId: string
): Promise<number> {
  let session = await prisma.anonymousSession.findUnique({
    where: { sessionToken: anonymousSessionToken }
  });

  if (!session) return 0;

  // Update all servers to belong to the user
  let serversResult = await prisma.customMCPServer.updateMany({
    where: { anonymousSessionId: session.id },
    data: {
      userId,
      anonymousSessionId: null
    }
  });

  // Also migrate OAuth registrations
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

  // Also migrate server connections
  let connectionsResult = await prisma.serverConnection.updateMany({
    where: { anonymousSessionId: session.id },
    data: {
      userId,
      anonymousSessionId: null
    }
  });

  // Optionally delete the anonymous session
  await prisma.anonymousSession.delete({
    where: { id: session.id }
  });

  return serversResult.count;
}

/**
 * Clean up expired anonymous sessions
 */
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
