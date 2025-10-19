import { prisma } from './prisma';

let REGISTRATION_MAX_AGE_DAYS = 7;

/**
 * Get active OAuth registration for a server URL
 * Returns null if no active registration exists or if it's expired/too old
 */
export async function getActiveRegistration(
  serverUrl: string,
  userId?: string,
  anonymousSessionId?: string
): Promise<{
  id: string;
  clientId: string;
  clientSecret: string | null;
  discoveryUrl: string;
  createdAt: Date;
} | null> {
  if (!userId && !anonymousSessionId) {
    return null;
  }

  let whereClause: any = {
    serverUrl,
    isExpired: false
  };

  if (userId) {
    whereClause.userId = userId;
  } else {
    whereClause.anonymousSessionId = anonymousSessionId;
  }

  let registration = await prisma.oAuthRegistration.findFirst({
    where: whereClause,
    orderBy: { createdAt: 'desc' }
  });

  if (!registration) {
    return null;
  }

  // Check if registration is older than 7 days
  let ageInDays = (Date.now() - registration.createdAt.getTime()) / (1000 * 60 * 60 * 24);

  if (ageInDays > REGISTRATION_MAX_AGE_DAYS) {
    // Mark as expired
    await prisma.oAuthRegistration.update({
      where: { id: registration.id },
      data: { isExpired: true }
    });

    return null;
  }

  return {
    id: registration.id,
    clientId: registration.clientId,
    clientSecret: registration.clientSecret,
    discoveryUrl: registration.discoveryUrl,
    createdAt: registration.createdAt
  };
}

/**
 * Create new OAuth registration and mark any existing ones as expired
 */
export async function createRegistration(
  serverUrl: string,
  discoveryUrl: string,
  clientId: string,
  clientSecret: string | undefined,
  userId?: string,
  anonymousSessionId?: string
): Promise<{
  id: string;
  clientId: string;
  clientSecret: string | null;
  discoveryUrl: string;
  createdAt: Date;
}> {
  if (!userId && !anonymousSessionId) {
    throw new Error('Either userId or anonymousSessionId must be provided');
  }

  // Mark all existing registrations for this server as expired
  let whereClause: any = {
    serverUrl,
    isExpired: false
  };

  if (userId) {
    whereClause.userId = userId;
  } else {
    whereClause.anonymousSessionId = anonymousSessionId;
  }

  await prisma.oAuthRegistration.updateMany({
    where: whereClause,
    data: { isExpired: true }
  });

  // Create new registration
  let registration = await prisma.oAuthRegistration.create({
    data: {
      serverUrl,
      discoveryUrl,
      clientId,
      clientSecret: clientSecret || null,
      userId,
      anonymousSessionId
    }
  });

  return {
    id: registration.id,
    clientId: registration.clientId,
    clientSecret: registration.clientSecret,
    discoveryUrl: registration.discoveryUrl,
    createdAt: registration.createdAt
  };
}

/**
 * Check if a registration needs renewal (older than 7 days or expired)
 */
export function needsRenewal(
  registration: {
    createdAt: Date;
    isExpired?: boolean;
  } | null
): boolean {
  if (!registration) {
    return true;
  }

  if (registration.isExpired) {
    return true;
  }

  let ageInDays = (Date.now() - registration.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return ageInDays > REGISTRATION_MAX_AGE_DAYS;
}

/**
 * Migrate OAuth registrations from anonymous session to user account
 */
export async function migrateOAuthRegistrations(
  anonymousSessionId: string,
  userId: string
): Promise<number> {
  // Update all non-expired registrations to belong to the user
  let result = await prisma.oAuthRegistration.updateMany({
    where: {
      anonymousSessionId,
      isExpired: false
    },
    data: {
      userId,
      anonymousSessionId: null
    }
  });

  return result.count;
}

/**
 * Clean up old expired registrations (older than 30 days)
 */
export let cleanupExpiredRegistrations = async (): Promise<number> => {
  let thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let result = await prisma.oAuthRegistration.deleteMany({
    where: {
      isExpired: true,
      createdAt: {
        lt: thirtyDaysAgo
      }
    }
  });

  return result.count;
};
