import type { AuthChallenge, MCPServer } from '@/types/mcp';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { probeServerAuth } from './mcp-auth-probe';
import { listAllCapabilities, listCapability } from './mcp-capabilities';
import { createTransport } from './mcp-transport';

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
    return probeServerAuth(server, '[MCP]');
  }

  async connect(
    server: MCPServer,
    authHeaders?: Record<string, string>
  ): Promise<MCPConnection> {
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
    }

    // Create appropriate transport based on server transport type
    let transport = createTransport(server, authHeaders);

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
      connection.capabilities = await listAllCapabilities(connection);

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
    return listCapability(connection, 'tools');
  }

  async listResources(serverId: string) {
    let connection = this.connections.get(serverId);
    return listCapability(connection, 'resources');
  }

  async listResourceTemplates(serverId: string) {
    let connection = this.connections.get(serverId);
    return listCapability(connection, 'resourceTemplates', false);
  }

  async listPrompts(serverId: string) {
    let connection = this.connections.get(serverId);
    return listCapability(connection, 'prompts');
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
