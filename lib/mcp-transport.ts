import type { MCPServer } from '@/types/mcp';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

/**
 * Create an appropriate MCP transport based on server configuration
 */
export function createTransport(
  server: MCPServer,
  authHeaders?: Record<string, string>
): SSEClientTransport | StreamableHTTPClientTransport {
  if (server.transport === 'sse') {
    // For SSE, we need to pass headers for both the initial EventSource connection
    // (via eventSourceInit) and subsequent POST requests (via requestInit)
    // The server-side eventsource library expects headers directly in the constructor options
    let sseOptions = authHeaders
      ? {
          eventSourceInit: {
            headers: authHeaders // For the initial SSE GET request
          } as any, // Cast to any to bypass TypeScript's incomplete type definitions
          requestInit: {
            headers: authHeaders // For POST requests
          }
        }
      : undefined;

    return new SSEClientTransport(new URL(server.url), sseOptions);
  } else {
    // streamable_http - only needs requestInit
    let httpOptions = authHeaders
      ? {
          requestInit: {
            headers: authHeaders
          }
        }
      : undefined;
    return new StreamableHTTPClientTransport(new URL(server.url), httpOptions);
  }
}
