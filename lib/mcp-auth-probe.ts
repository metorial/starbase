import type { AuthChallenge, MCPServer } from '@/types/mcp';
import { getDefaultDiscoveryUrl, parseWWWAuthenticate } from './mcp-auth';

/**
 * Create proxy URL for auth probing
 */
function createProxyUrl(targetUrl: string, method: 'GET' | 'OPTIONS'): string {
  const proxyBase = '/api/mcp/proxy';
  const params = new URLSearchParams({
    target: targetUrl
  });
  return `${proxyBase}?${params.toString()}`;
}

/**
 * Check if OAuth discovery document exists at the default location
 */
async function checkOAuthDiscovery(serverUrl: string): Promise<boolean> {
  try {
    let discoveryUrl = getDefaultDiscoveryUrl(serverUrl);
    let proxyUrl = createProxyUrl(discoveryUrl, 'GET');

    let response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    // If we get 200, the discovery document exists
    return response.ok;
  } catch (error) {
    console.log('[MCP Auth Probe] Discovery check failed:', error);
    return false;
  }
}

/**
 * Probe server for auth requirements by making a test request through the proxy
 * First checks for OAuth discovery document, then makes auth probe requests
 */
export async function probeServerAuth(
  server: MCPServer,
  logPrefix: string = '[MCP]'
): Promise<AuthChallenge | null> {
  try {
    // First, proactively check if OAuth discovery document exists
    // This is the proper way to detect OAuth per MCP spec
    let hasOAuthDiscovery = await checkOAuthDiscovery(server.url);
    console.log(`${logPrefix} OAuth discovery check for ${server.url}:`, hasOAuthDiscovery);

    // Try OPTIONS first (more compatible with CORS)
    // Route through proxy to avoid CORS issues
    let proxyUrl = createProxyUrl(server.url, 'OPTIONS');
    let response = await fetch(proxyUrl, {
      method: 'OPTIONS',
      redirect: 'manual'
    });

    // If OPTIONS doesn't return 401, try GET with a small timeout
    if (response.status !== 401) {
      let controller = new AbortController();
      let timeoutId = setTimeout(() => controller.abort(), 3000);

      try {
        proxyUrl = createProxyUrl(server.url, 'GET');
        response = await fetch(proxyUrl, {
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

      // If we found OAuth discovery document, use OAuth auth
      if (hasOAuthDiscovery) {
        return {
          type: 'oauth',
          discoveryUrl: getDefaultDiscoveryUrl(server.url),
          realm: authChallenge?.realm,
          scope: authChallenge?.scope
        };
      }

      // If we have an OAuth challenge from header but no discovery URL, use default
      if (authChallenge?.type === 'oauth' && !authChallenge.discoveryUrl) {
        authChallenge.discoveryUrl = getDefaultDiscoveryUrl(server.url);
      }

      // If we have a parsed challenge, return it
      if (authChallenge) {
        return authChallenge;
      }

      // If no parsed challenge but has OAuth discovery, assume OAuth
      if (hasOAuthDiscovery) {
        return {
          type: 'oauth',
          discoveryUrl: getDefaultDiscoveryUrl(server.url)
        };
      }

      // Otherwise, assume custom headers
      return {
        type: 'custom_headers'
      };
    }

    return null;
  } catch (error) {
    console.error(`${logPrefix} Auth probe failed:`, error);
    return null;
  }
}
