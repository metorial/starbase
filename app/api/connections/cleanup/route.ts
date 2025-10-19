import { handleApiError } from '@/lib/api-utils';
import {
  decryptCustomHeaders,
  decryptOAuthCredentials
} from '@/lib/encryption';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export let POST = async () => {
  try {
    let allConnections = await prisma.serverConnection.findMany();

    let corruptedIds: string[] = [];
    let validCount = 0;

    for (let conn of allConnections) {
      try {
        if (conn.authType === 'oauth') {
          decryptOAuthCredentials(conn.encryptedCredentials);
        } else {
          decryptCustomHeaders(conn.encryptedCredentials);
        }
        validCount++;
      } catch (error) {
        console.log(`[Cleanup] Found corrupted connection ${conn.id} for ${conn.serverUrl}`);
        corruptedIds.push(conn.id);
      }
    }

    if (corruptedIds.length > 0) {
      await prisma.serverConnection.deleteMany({
        where: {
          id: {
            in: corruptedIds
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      totalConnections: allConnections.length,
      validConnections: validCount,
      corruptedConnections: corruptedIds.length,
      deletedIds: corruptedIds
    });
  } catch (error) {
    return handleApiError(error);
  }
};
