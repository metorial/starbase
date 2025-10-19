'use client';

import type { AuthChallenge, MCPServer } from '@/types/mcp';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { getDefaultDiscoveryUrl, parseWWWAuthenticate } from './mcp-auth';

export interface MCPBrowserConnection {
  server: MCPServer;
  client: Client;
  transport: SSEClientTransport | StreamableHTTPClientTransport;
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'auth_required';
  error?: string;
  authChallenge?: AuthChallenge;
  capabilities?: {
    tools: Array<{
      name: string;
      description?: string;
      inputSchema: any;
    }>;
    resources: Array<{
      uri: string;
      name: string;
      description?: string;
      mimeType?: string;
    }>;
    resourceTemplates: Array<{
      uriTemplate: string;
      name: string;
      description?: string;
      mimeType?: string;
    }>;
    prompts: Array<{
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

/**
 * Browser-side MCP connection manager
 * Handles MCP connections in the browser where cookies/auth headers work naturally
 */
export class MCPBrowserConnectionManager {
  private connections: Map<string, MCPBrowserConnection> = new Map();

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
      console.error('[MCP Browser] Auth probe failed:', error);
      return null;
    }
  }

  /**
   * Connect to an MCP server from the browser
   * Can optionally pass auth headers for servers that require authentication
   */
  async connect(
    server: MCPServer,
    authHeaders?: Record<string, string>
  ): Promise<MCPBrowserConnection> {
    if (authHeaders) {
    }

    // Check if already connected
    let existing = this.connections.get(server.id);
    if (existing && existing.status === 'connected') {
      return existing;
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

    let connection: MCPBrowserConnection = {
      server,
      client: new Client(
        {
          name: 'starbase-browser-client',
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
      status: 'connecting'
    };

    this.connections.set(server.id, connection);

    try {
      await connection.client.connect(connection.transport);
      connection.status = 'connected';

      // Fetch all capabilities in parallel
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
      console.error('[MCP Browser] Connection failed:', error);
      connection.status = 'error';
      connection.error = error instanceof Error ? error.message : 'Connection failed';
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
        console.error('[MCP Browser] Error disconnecting:', error);
      }
      connection.status = 'disconnected';
      this.connections.delete(serverId);
    }
  }

  getConnection(serverId: string): MCPBrowserConnection | undefined {
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
      console.error('[MCP Browser] Error listing tools:', error);
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
      console.error('[MCP Browser] Error listing resources:', error);
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
      console.error('[MCP Browser] Error listing prompts:', error);
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

  /**
   * Get all tools from all connected servers
   */
  getAllTools(): Array<{ serverId: string; serverName: string; tool: any }> {
    let allTools: Array<{ serverId: string; serverName: string; tool: any }> = [];

    let entries = Array.from(this.connections.entries());
    for (let [serverId, connection] of entries) {
      if (connection.status === 'connected' && connection.capabilities?.tools) {
        for (let tool of connection.capabilities.tools) {
          allTools.push({
            serverId,
            serverName: connection.server.name,
            tool
          });
        }
      }
    }

    return allTools;
  }

  /**
   * Get all resources from all connected servers
   */
  getAllResources(): Array<{ serverId: string; serverName: string; resource: any }> {
    let allResources: Array<{ serverId: string; serverName: string; resource: any }> = [];

    let entries = Array.from(this.connections.entries());
    for (let [serverId, connection] of entries) {
      if (connection.status === 'connected' && connection.capabilities?.resources) {
        for (let resource of connection.capabilities.resources) {
          allResources.push({
            serverId,
            serverName: connection.server.name,
            resource
          });
        }
      }
    }

    return allResources;
  }

  /**
   * Get all prompts from all connected servers
   */
  getAllPrompts(): Array<{ serverId: string; serverName: string; prompt: any }> {
    let allPrompts: Array<{ serverId: string; serverName: string; prompt: any }> = [];

    let entries = Array.from(this.connections.entries());
    for (let [serverId, connection] of entries) {
      if (connection.status === 'connected' && connection.capabilities?.prompts) {
        for (let prompt of connection.capabilities.prompts) {
          allPrompts.push({
            serverId,
            serverName: connection.server.name,
            prompt
          });
        }
      }
    }

    return allPrompts;
  }

  /**
   * Get connection status for all servers
   */
  getAllConnectionStatuses(): Map<
    string,
    { status: string; error?: string; capabilities?: any }
  > {
    let statuses = new Map<string, { status: string; error?: string; capabilities?: any }>();

    let entries = Array.from(this.connections.entries());
    for (let [serverId, connection] of entries) {
      statuses.set(serverId, {
        status: connection.status,
        error: connection.error,
        capabilities: connection.capabilities
      });
    }

    return statuses;
  }

  /**
   * Disconnect all servers
   */
  async disconnectAll(): Promise<void> {
    let promises = Array.from(this.connections.keys()).map(id => this.disconnect(id));
    await Promise.all(promises);
  }
}
