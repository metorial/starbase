import type { MCPServer } from '@/types/mcp';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

/**
 * Extract the actual target URL from a proxy URL
 */
function extractTargetFromProxyUrl(proxyUrl: string): string | null {
  try {
    const url = new URL(proxyUrl, window.location.origin);
    return url.searchParams.get('target');
  } catch {
    return null;
  }
}

/**
 * Create a proxy URL for MCP connections
 * This routes requests through our edge function proxy to avoid CORS issues
 */
function createProxyUrl(targetUrl: string, authHeaders?: Record<string, string>): string {
  const proxyBase = '/api/mcp/proxy';
  const params = new URLSearchParams({
    target: targetUrl
  });

  // Include auth headers in the proxy URL if provided
  if (authHeaders && Object.keys(authHeaders).length > 0) {
    params.set('auth_headers', JSON.stringify(authHeaders));
  }

  return `${proxyBase}?${params.toString()}`;
}

/**
 * Create a custom fetch function that proxies all requests
 * This is needed for SSE transport where the server provides an endpoint URL
 * that the client then makes POST requests to
 */
function createProxyFetch(
  originalServerUrl: string,
  authHeaders?: Record<string, string>
): typeof fetch {
  // Extract the server origin from the original server URL (not the proxy URL)
  const serverOrigin = new URL(originalServerUrl).origin;

  console.log('[MCP Transport] Creating proxy fetch with server origin:', serverOrigin);

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // Convert input to URL string
    let targetUrl: string;
    if (input instanceof URL) {
      targetUrl = input.toString();
    } else if (typeof input === 'string') {
      targetUrl = input;
    } else {
      targetUrl = input.url;
    }

    console.log('[MCP Transport] Fetch called with URL:', targetUrl);

    // If this is already a proxy URL, use it directly
    if (targetUrl.includes('/api/mcp/proxy')) {
      console.log('[MCP Transport] Already a proxy URL, using directly');
      return fetch(targetUrl, init);
    }

    // If the URL is relative (starts with /), resolve it against the server origin
    if (targetUrl.startsWith('/')) {
      targetUrl = new URL(targetUrl, serverOrigin).toString();
      console.log('[MCP Transport] Resolved relative path to:', targetUrl);
    }

    // If the URL points to the current app's domain or localhost, rewrite to actual server
    // (happens when server sends absolute URLs that get resolved against window.location.origin)
    try {
      const url = new URL(targetUrl);
      const appOrigin = window.location.origin;
      const serverUrl = new URL(serverOrigin);

      // Check if URL is pointing to localhost or the current app domain instead of the MCP server
      const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      const isAppDomain = url.origin === appOrigin;
      const isNotServerDomain = url.origin !== serverOrigin;

      if ((isLocalhost || isAppDomain) && isNotServerDomain) {
        // Replace with the actual server origin
        url.protocol = serverUrl.protocol;
        url.hostname = serverUrl.hostname;
        // Only set port if the server URL has a non-default port
        url.port = serverUrl.port || '';

        targetUrl = url.toString();
        console.log('[MCP Transport] Rewrote domain from', isLocalhost ? 'localhost' : appOrigin, 'to:', targetUrl);
      }
    } catch (e) {
      console.error('[MCP Transport] Failed to rewrite URL:', e);
    }

    // Create a proxy URL for this request
    const proxyUrl = createProxyUrl(targetUrl, authHeaders);

    console.log('[MCP Transport] Proxying request to:', proxyUrl);

    // Make the request through the proxy
    return fetch(proxyUrl, init);
  };
}

/**
 * Create an appropriate MCP transport based on server configuration
 * Routes all connections through the proxy to avoid CORS issues
 */
export function createTransport(
  server: MCPServer,
  authHeaders?: Record<string, string>
): SSEClientTransport | StreamableHTTPClientTransport {
  // Create proxy URL that will forward to the actual server
  const proxyUrl = createProxyUrl(server.url, authHeaders);

  console.log('[MCP Transport] Creating transport for server:', server.url);
  console.log('[MCP Transport] Proxy URL:', proxyUrl);

  if (server.transport === 'sse') {
    // For SSE, use the proxy URL and provide a custom fetch function
    // IMPORTANT: Pass the original server.url (not the proxy URL) to createProxyFetch
    // so it can extract the correct origin for resolving relative paths
    return new SSEClientTransport(new URL(proxyUrl, window.location.origin), {
      fetch: createProxyFetch(server.url, authHeaders)
    });
  } else {
    // streamable_http through proxy
    return new StreamableHTTPClientTransport(new URL(proxyUrl, window.location.origin));
  }
}
