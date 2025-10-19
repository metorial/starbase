import type { AuthChallenge, MCPServer } from '@/types/mcp';
import { getDefaultDiscoveryUrl, parseWWWAuthenticate } from './mcp-auth';

let createProxyUrl = (targetUrl: string, method: 'GET' | 'OPTIONS'): string => {
  let proxyBase = '/api/mcp/proxy';
  let params = new URLSearchParams({
    target: targetUrl
  });
  return `${proxyBase}?${params.toString()}`;
};

let checkOAuthDiscovery = async (serverUrl: string): Promise<boolean> => {
  try {
    let discoveryUrl = getDefaultDiscoveryUrl(serverUrl);
    let proxyUrl = createProxyUrl(discoveryUrl, 'GET');

    let response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    return response.ok;
  } catch (error) {
    console.log('[MCP Auth Probe] Discovery check failed:', error);
    return false;
  }
};

export let probeServerAuth = async (
  server: MCPServer,
  logPrefix: string = '[MCP]'
): Promise<AuthChallenge | null> => {
  try {
    let hasOAuthDiscovery = await checkOAuthDiscovery(server.url);
    console.log(`${logPrefix} OAuth discovery check for ${server.url}:`, hasOAuthDiscovery);

    let proxyUrl = createProxyUrl(server.url, 'OPTIONS');
    let response = await fetch(proxyUrl, {
      method: 'OPTIONS',
      redirect: 'manual'
    });

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

      if (hasOAuthDiscovery) {
        return {
          type: 'oauth',
          discoveryUrl: getDefaultDiscoveryUrl(server.url),
          realm: authChallenge?.realm,
          scope: authChallenge?.scope
        };
      }

      if (authChallenge?.type === 'oauth' && !authChallenge.discoveryUrl) {
        authChallenge.discoveryUrl = getDefaultDiscoveryUrl(server.url);
      }

      if (authChallenge) {
        return authChallenge;
      }

      if (hasOAuthDiscovery) {
        return {
          type: 'oauth',
          discoveryUrl: getDefaultDiscoveryUrl(server.url)
        };
      }

      return {
        type: 'custom_headers'
      };
    }

    return null;
  } catch (error) {
    console.error(`${logPrefix} Auth probe failed:`, error);
    return null;
  }
};
