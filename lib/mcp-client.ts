import type { AuthChallenge, MCPServer } from '@/types/mcp';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { getDefaultDiscoveryUrl, parseWWWAuthenticate } from './mcp-auth';

export interface MCPConnection {
  server: MCPServer;
  client: Client;
  transport: SSEClientTransport | StreamableHTTPClientTransport;
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'auth_required';
  error?: string;
  authChallenge?: AuthChallenge;
  authHeaders?: Record<string, string>;
  capabilities?: {
    tools?: Array<{
      name: string;
      description?: string;
      inputSchema: any;
    }>;
    resources?: Array<{
      uri: string;
      name?: string;
      description?: string;
      mimeType?: string;
    }>;
    resourceTemplates?: Array<{
      uriTemplate: string;
      name: string;
      description?: string;
      mimeType?: string;
    }>;
    prompts?: Array<{
      name: string;
      description?: string;
      arguments?: Array<{
        name: string;
        description?: string;
        required?: boolean;
      }>;
    }>;
  };
}

export class MCPConnectionManager {
  private connections: Map<string, MCPConnection> = new Map();

  /**
   * Probe server for auth requirements by making a test request
   */
  async probeAuth(server: MCPServer): Promise<AuthChallenge | null> {
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
      console.error('Auth probe failed:', error);
      return null;
    }
  }

  async connect(
    server: MCPServer,
    authHeaders?: Record<string, string>
  ): Promise<MCPConnection> {
    if (authHeaders) {
    }

    // Check if already connected
    let existing = this.connections.get(server.id);
    if (existing && existing.status === 'connected') {
      return existing;
    }

    // First probe for auth if no auth headers provided
    if (!authHeaders) {
      let authChallenge = await this.probeAuth(server);

      if (authChallenge) {
        // Server requires authentication
        let connection: MCPConnection = {
          server,
          client: new Client(
            {
              name: 'starbase-client',
              version: '1.0.0'
            },
            {
              capabilities: {
                tools: {},
                resources: {},
                prompts: {}
              }
            }
          ),
          transport: {} as any, // Placeholder, won't be used
          status: 'auth_required',
          authChallenge
        };

        this.connections.set(server.id, connection);
        return connection;
      }
    } else {
    }

    // Create appropriate transport based on server transport type
    let transport: SSEClientTransport | StreamableHTTPClientTransport;

    if (authHeaders) {
    } else {
    }

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

      transport = new SSEClientTransport(new URL(server.url), sseOptions);
    } else {
      // streamable_http - only needs requestInit
      let httpOptions = authHeaders
        ? {
            requestInit: {
              headers: authHeaders
            }
          }
        : undefined;
      transport = new StreamableHTTPClientTransport(new URL(server.url), httpOptions);
    }

    let connection: MCPConnection = {
      server,
      client: new Client(
        {
          name: 'starbase-client',
          version: '1.0.0'
        },
        {
          capabilities: {
            tools: {},
            resources: {},
            prompts: {}
          }
        }
      ),
      transport,
      status: 'connecting',
      authHeaders
    };

    this.connections.set(server.id, connection);

    try {
      await connection.client.connect(connection.transport);
      connection.status = 'connected';

      // Fetch capabilities
      let [tools, resources, resourceTemplates, prompts] = await Promise.all([
        this.listTools(server.id),
        this.listResources(server.id),
        this.listResourceTemplates(server.id),
        this.listPrompts(server.id)
      ]);

      connection.capabilities = {
        tools,
        resources,
        resourceTemplates,
        prompts
      };

      this.connections.set(server.id, connection);
    } catch (error) {
      // Check if this is an auth error
      console.error('[MCP] Connection failed:', error);
      let errorMessage = error instanceof Error ? error.message : 'Connection failed';
      let errorString = JSON.stringify(error);

      // Extract more details from SSE errors
      let detailedError = errorMessage;
      if (error && typeof error === 'object' && 'code' in error) {
        let sseError = error as any;
        if (sseError.code) {
          detailedError = `${errorMessage} (Status: ${sseError.code})`;
        }
      }

      // Check for various auth error indicators
      let isAuthError =
        errorMessage.includes('401') ||
        errorMessage.includes('Unauthorized') ||
        errorMessage.includes('Authentication required') ||
        errorString.includes('401') ||
        errorString.includes('unauthorized');

      if (isAuthError) {
        let authChallenge = await this.probeAuth(server);
        connection.status = 'auth_required';
        connection.authChallenge = authChallenge || { type: 'custom_headers' };
        connection.error = 'Authentication required';
      } else {
        connection.status = 'error';
        connection.error = detailedError;
      }

      this.connections.set(server.id, connection);
    }

    return connection;
  }

  async disconnect(serverId: string): Promise<void> {
    let connection = this.connections.get(serverId);
    if (connection) {
      try {
        await connection.client.close();
      } catch (error) {
        console.error('Error disconnecting:', error);
      }
      connection.status = 'disconnected';
      this.connections.delete(serverId);
    }
  }

  getConnection(serverId: string): MCPConnection | undefined {
    return this.connections.get(serverId);
  }

  async listTools(serverId: string) {
    let connection = this.connections.get(serverId);
    if (!connection || connection.status !== 'connected') {
      return [];
    }

    try {
      let result = await connection.client.listTools();
      return result.tools;
    } catch (error) {
      console.error('Error listing tools:', error);
      return [];
    }
  }

  async listResources(serverId: string) {
    let connection = this.connections.get(serverId);
    if (!connection || connection.status !== 'connected') {
      return [];
    }

    try {
      let result = await connection.client.listResources();
      return result.resources;
    } catch (error) {
      console.error('Error listing resources:', error);
      return [];
    }
  }

  async listResourceTemplates(serverId: string) {
    let connection = this.connections.get(serverId);
    if (!connection || connection.status !== 'connected') {
      return [];
    }

    try {
      let result = await connection.client.listResourceTemplates();
      return result.resourceTemplates || [];
    } catch (error) {
      // Resource templates are optional, so don't log as error if not supported
      return [];
    }
  }

  async listPrompts(serverId: string) {
    let connection = this.connections.get(serverId);
    if (!connection || connection.status !== 'connected') {
      return [];
    }

    try {
      let result = await connection.client.listPrompts();
      return result.prompts;
    } catch (error) {
      console.error('Error listing prompts:', error);
      return [];
    }
  }

  async callTool(serverId: string, name: string, args: any) {
    let connection = this.connections.get(serverId);
    if (!connection || connection.status !== 'connected') {
      throw new Error('Not connected to server');
    }

    return await connection.client.callTool({ name, arguments: args });
  }

  async readResource(serverId: string, uri: string) {
    let connection = this.connections.get(serverId);
    if (!connection || connection.status !== 'connected') {
      throw new Error('Not connected to server');
    }

    return await connection.client.readResource({ uri });
  }

  async getPrompt(serverId: string, name: string, args?: Record<string, string>) {
    let connection = this.connections.get(serverId);
    if (!connection || connection.status !== 'connected') {
      throw new Error('Not connected to server');
    }

    return await connection.client.getPrompt({ name, arguments: args });
  }
}

// Singleton instance
export let mcpManager = new MCPConnectionManager();
