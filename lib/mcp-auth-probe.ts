import type { AuthChallenge, MCPServer } from '@/types/mcp';
import { getDefaultDiscoveryUrl, parseWWWAuthenticate } from './mcp-auth';

/**
 * Probe server for auth requirements by making a test request
 */
export async function probeServerAuth(
  server: MCPServer,
  logPrefix: string = '[MCP]'
): Promise<AuthChallenge | null> {
  try {
    // Try OPTIONS first (more compatible with CORS)
    let response = await fetch(server.url, {
      method: 'OPTIONS',
      redirect: 'manual'
    });

    // If OPTIONS doesn't return 401, try GET with a small timeout
    if (response.status !== 401) {
      let controller = new AbortController();
      let timeoutId = setTimeout(() => controller.abort(), 3000);

      try {
        response = await fetch(server.url, {
          method: 'GET',
          redirect: 'manual',
          signal: controller.signal
        });
      } catch (fetchError) {
        // Timeout or abort is okay for auth probing
        if (fetchError instanceof Error && fetchError.name !== 'AbortError') {
          throw fetchError;
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }

    if (response.status === 401) {
      let wwwAuth = response.headers.get('WWW-Authenticate');
      let authChallenge: AuthChallenge | null = null;

      if (wwwAuth) {
        authChallenge = parseWWWAuthenticate(wwwAuth);
      }

      // If we have an OAuth challenge but no discovery URL, use default per MCP spec
      if (authChallenge?.type === 'oauth' && !authChallenge.discoveryUrl) {
        authChallenge.discoveryUrl = getDefaultDiscoveryUrl(server.url);
      }

      // If still no auth challenge, but 401 returned, assume OAuth with default discovery
      if (!authChallenge) {
        authChallenge = {
          type: 'oauth',
          discoveryUrl: getDefaultDiscoveryUrl(server.url)
        };
      }

      return authChallenge;
    }

    return null;
  } catch (error) {
    console.error(`${logPrefix} Auth probe failed:`, error);
    return null;
  }
}
