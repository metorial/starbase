import { prisma } from './prisma';

let REGISTRATION_MAX_AGE_DAYS = 7;

export let getActiveRegistration = async (
  serverUrl: string,
  userId?: string,
  anonymousSessionId?: string
): Promise<{
  id: string;
  clientId: string;
  clientSecret: string | null;
  discoveryUrl: string;
  createdAt: Date;
} | null> => {
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
};

export let createRegistration = async (
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
}> => {
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
};

export let needsRenewal = (
  registration: {
    createdAt: Date;
    isExpired?: boolean;
  } | null
): boolean => {
  if (!registration) {
    return true;
  }

  if (registration.isExpired) {
    return true;
  }

  let ageInDays = (Date.now() - registration.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return ageInDays > REGISTRATION_MAX_AGE_DAYS;
};

export let migrateOAuthRegistrations = async (
  anonymousSessionId: string,
  userId: string
): Promise<number> => {
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
};

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
