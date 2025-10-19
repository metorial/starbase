import {
  decryptCustomHeaders,
  decryptOAuthCredentials,
  encryptCustomHeaders,
  encryptOAuthCredentials
} from './encryption';
import { prisma } from './prisma';

let MAX_CONNECTION_AGE_DAYS = 30;

/**
 * Save an OAuth connection for quick reconnect
 */
export async function saveOAuthConnection(
  serverUrl: string,
  serverName: string,
  accessToken: string,
  refreshToken: string | undefined,
  userId?: string,
  anonymousSessionId?: string,
  transport?: 'sse' | 'streamable_http'
): Promise<void> {
  if (!userId && !anonymousSessionId) {
    throw new Error('Either userId or anonymousSessionId must be provided');
  }

  let encryptedCredentials = encryptOAuthCredentials(accessToken, refreshToken);

  // Delete any existing connection for this server
  await prisma.serverConnection.deleteMany({
    where: {
      serverUrl,
      ...(userId ? { userId } : { anonymousSessionId })
    }
  });

  await prisma.serverConnection.create({
    data: {
      serverUrl,
      serverName,
      authType: 'oauth',
      encryptedCredentials,
      userId,
      anonymousSessionId,
      lastUsedAt: new Date(),
      transport
    }
  });
}

/**
 * Save a custom headers connection for quick reconnect
 */
export async function saveCustomHeadersConnection(
  serverUrl: string,
  serverName: string,
  headers: Record<string, string>,
  userId?: string,
  anonymousSessionId?: string,
  transport?: 'sse' | 'streamable_http'
): Promise<void> {
  if (!userId && !anonymousSessionId) {
    throw new Error('Either userId or anonymousSessionId must be provided');
  }

  let encryptedCredentials = encryptCustomHeaders(headers);

  // Delete any existing connection for this server
  await prisma.serverConnection.deleteMany({
    where: {
      serverUrl,
      ...(userId ? { userId } : { anonymousSessionId })
    }
  });

  await prisma.serverConnection.create({
    data: {
      serverUrl,
      serverName,
      authType: 'custom_headers',
      encryptedCredentials,
      userId,
      anonymousSessionId,
      lastUsedAt: new Date(),
      transport
    }
  });
}

/**
 * Get all active connections for a user or anonymous session
 */
export async function getActiveConnections(
  userId?: string,
  anonymousSessionId?: string
): Promise<
  Array<{
    id: string;
    serverUrl: string;
    serverName: string;
    displayName: string | null;
    authType: string;
    credentials:
      | { accessToken: string; refreshToken: string | null }
      | { headers: Record<string, string> };
    lastUsedAt: Date;
  }>
> {
  if (!userId && !anonymousSessionId) {
    return [];
  }

  let cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - MAX_CONNECTION_AGE_DAYS);

  let connections = await prisma.serverConnection.findMany({
    where: {
      ...(userId ? { userId } : { anonymousSessionId }),
      lastUsedAt: {
        gte: cutoffDate
      }
    },
    orderBy: {
      lastUsedAt: 'desc'
    }
  });

  return connections.map(conn => {
    let credentials: any;

    if (conn.authType === 'oauth') {
      let decrypted = decryptOAuthCredentials(conn.encryptedCredentials);
      credentials = {
        accessToken: decrypted.accessToken,
        refreshToken: decrypted.refreshToken
      };
    } else {
      let decrypted = decryptCustomHeaders(conn.encryptedCredentials);
      credentials = {
        headers: decrypted.headers
      };
    }

    return {
      id: conn.id,
      serverUrl: conn.serverUrl,
      serverName: conn.serverName,
      displayName: conn.displayName,
      authType: conn.authType,
      credentials,
      lastUsedAt: conn.lastUsedAt
    };
  });
}

/**
 * Get a specific connection
 * Now uses foreign key constraints to ensure referential integrity
 */
export async function getConnection(
  id: string,
  userId?: string,
  anonymousSessionId?: string
): Promise<{
  id: string;
  serverUrl: string;
  serverName: string;
  displayName: string | null;
  authType: string;
  transport: string | null;
  credentials:
    | { accessToken: string; refreshToken: string | null }
    | { headers: Record<string, string> };
} | null> {
  let connection = await prisma.serverConnection.findFirst({
    where: {
      id,
      ...(userId ? { userId } : { anonymousSessionId })
    }
  });

  if (!connection) {
    return null;
  }

  let credentials: any;

  if (connection.authType === 'oauth') {
    let decrypted = decryptOAuthCredentials(connection.encryptedCredentials);
    credentials = {
      accessToken: decrypted.accessToken,
      refreshToken: decrypted.refreshToken
    };
  } else {
    let decrypted = decryptCustomHeaders(connection.encryptedCredentials);
    credentials = {
      headers: decrypted.headers
    };
  }

  return {
    id: connection.id,
    serverUrl: connection.serverUrl,
    serverName: connection.serverName,
    displayName: connection.displayName,
    authType: connection.authType,
    transport: connection.transport,
    credentials
  };
}

/**
 * Update last used timestamp
 */
export let updateLastUsed = async (id: string): Promise<void> => {
  await prisma.serverConnection.update({
    where: { id },
    data: { lastUsedAt: new Date() }
  });
};

/**
 * Update connection display name
 */
export async function updateDisplayName(
  id: string,
  displayName: string | null,
  userId?: string,
  anonymousSessionId?: string
): Promise<void> {
  await prisma.serverConnection.updateMany({
    where: {
      id,
      ...(userId ? { userId } : { anonymousSessionId })
    },
    data: { displayName }
  });
}

/**
 * Delete a connection
 */
export async function deleteConnection(
  id: string,
  userId?: string,
  anonymousSessionId?: string
): Promise<void> {
  await prisma.serverConnection.deleteMany({
    where: {
      id,
      ...(userId ? { userId } : { anonymousSessionId })
    }
  });
}

/**
 * Clean up old connections (older than 30 days)
 */
export let cleanupOldConnections = async (): Promise<number> => {
  let cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - MAX_CONNECTION_AGE_DAYS);

  let result = await prisma.serverConnection.deleteMany({
    where: {
      lastUsedAt: {
        lt: cutoffDate
      }
    }
  });

  return result.count;
};

/**
 * Migrate connections from anonymous session to user account
 */
export async function migrateServerConnections(
  anonymousSessionId: string,
  userId: string
): Promise<number> {
  let result = await prisma.serverConnection.updateMany({
    where: { anonymousSessionId },
    data: {
      userId,
      anonymousSessionId: null
    }
  });

  return result.count;
}
