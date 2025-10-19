import { handleApiError } from '@/lib/api-utils';
import {
  getActiveConnections,
  saveCustomHeadersConnection,
  saveOAuthConnection
} from '@/lib/server-connection';
import { getSessionContext } from '@/lib/session-utils';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

let postSchema = z
  .object({
    serverUrl: z.string(),
    serverName: z.string(),
    authType: z.enum(['oauth', 'custom_headers']),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    transport: z.enum(['sse', 'streamable_http']).optional()
  })
  .refine(
    data => {
      if (data.authType === 'oauth' && !data.accessToken) {
        return false;
      }
      if (data.authType === 'custom_headers' && !data.headers) {
        return false;
      }
      return true;
    },
    {
      message: 'Invalid auth configuration'
    }
  );

export let GET = async () => {
  try {
    let { userId, anonymousSessionId } = await getSessionContext();

    let connections = await getActiveConnections(userId, anonymousSessionId);

    let safeConnections = connections.map(conn => ({
      id: conn.id,
      serverUrl: conn.serverUrl,
      serverName: conn.serverName,
      authType: conn.authType,
      lastUsedAt: conn.lastUsedAt,
      hasCredentials: true
    }));

    return NextResponse.json({ connections: safeConnections });
  } catch (error) {
    return handleApiError(error);
  }
};

export let POST = async (request: Request) => {
  try {
    let body = await request.json();
    let validatedData = postSchema.parse(body);
    let { serverUrl, serverName, authType, accessToken, refreshToken, headers, transport } =
      validatedData;

    let { userId, anonymousSessionId } = await getSessionContext();

    if (authType === 'oauth') {
      await saveOAuthConnection(
        serverUrl,
        serverName,
        accessToken!,
        refreshToken,
        userId,
        anonymousSessionId,
        transport
      );
    } else {
      await saveCustomHeadersConnection(
        serverUrl,
        serverName,
        headers as Record<string, string>,
        userId,
        anonymousSessionId,
        transport
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
};
