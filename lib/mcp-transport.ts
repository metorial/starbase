import type { MCPServer } from '@/types/mcp';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

let extractTargetFromProxyUrl = (proxyUrl: string): string | null => {
  try {
    let url = new URL(proxyUrl, window.location.origin);
    return url.searchParams.get('target');
  } catch {
    return null;
  }
};

let createProxyUrl = (targetUrl: string, authHeaders?: Record<string, string>): string => {
  let proxyBase = '/api/mcp/proxy';
  let params = new URLSearchParams({
    target: targetUrl
  });

  if (authHeaders && Object.keys(authHeaders).length > 0) {
    params.set('auth_headers', JSON.stringify(authHeaders));
  }

  return `${proxyBase}?${params.toString()}`;
};

let createProxyFetch = (
  originalServerUrl: string,
  authHeaders?: Record<string, string>
): typeof fetch => {
  let serverOrigin = new URL(originalServerUrl).origin;

  console.log('[MCP Transport] Creating proxy fetch with server origin:', serverOrigin);

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let targetUrl: string;
    if (input instanceof URL) {
      targetUrl = input.toString();
    } else if (typeof input === 'string') {
      targetUrl = input;
    } else {
      targetUrl = input.url;
    }

    console.log('[MCP Transport] Fetch called with URL:', targetUrl);

    if (targetUrl.includes('/api/mcp/proxy')) {
      console.log('[MCP Transport] Already a proxy URL, using directly');
      return fetch(targetUrl, init);
    }

    if (targetUrl.startsWith('/')) {
      targetUrl = new URL(targetUrl, serverOrigin).toString();
      console.log('[MCP Transport] Resolved relative path to:', targetUrl);
    }

    try {
      let url = new URL(targetUrl);
      let appOrigin = window.location.origin;
      let serverUrl = new URL(serverOrigin);

      let isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      let isAppDomain = url.origin === appOrigin;
      let isNotServerDomain = url.origin !== serverOrigin;

      if ((isLocalhost || isAppDomain) && isNotServerDomain) {
        url.protocol = serverUrl.protocol;
        url.hostname = serverUrl.hostname;
        url.port = serverUrl.port || '';

        targetUrl = url.toString();
        console.log('[MCP Transport] Rewrote domain from', isLocalhost ? 'localhost' : appOrigin, 'to:', targetUrl);
      }
    } catch (e) {
      console.error('[MCP Transport] Failed to rewrite URL:', e);
    }

    let proxyUrl = createProxyUrl(targetUrl, authHeaders);

    console.log('[MCP Transport] Proxying request to:', proxyUrl);

    return fetch(proxyUrl, init);
  };
};

export let createTransport = (
  server: MCPServer,
  authHeaders?: Record<string, string>
): SSEClientTransport | StreamableHTTPClientTransport => {
  let proxyUrl = createProxyUrl(server.url, authHeaders);

  console.log('[MCP Transport] Creating transport for server:', server.url);
  console.log('[MCP Transport] Proxy URL:', proxyUrl);

  if (server.transport === 'sse') {
    return new SSEClientTransport(new URL(proxyUrl, window.location.origin), {
      fetch: createProxyFetch(server.url, authHeaders)
    });
  } else {
    return new StreamableHTTPClientTransport(new URL(proxyUrl, window.location.origin));
  }
};
