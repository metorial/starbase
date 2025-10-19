'use client';

import type { AuthChallenge, MCPServer } from '@/types/mcp';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { probeServerAuth } from './mcp-auth-probe';
import { listAllCapabilities, listCapability } from './mcp-capabilities';
import { createTransport } from './mcp-transport';

export interface MCPBrowserConnection {
  server: MCPServer;
  client: Client;
  transport: SSEClientTransport | StreamableHTTPClientTransport;
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'auth_required';
  error?: string;
  authChallenge?: AuthChallenge;
  capabilities?: {
    tools?: Array<{
      name: string;
      description?: string;
      inputSchema: any;
    }>;
    resources?: Array<{
      uri: string;
      name: string;
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
    return probeServerAuth(server, '[MCP Browser]');
  }

  /**
   * Connect to an MCP server from the browser
   * Can optionally pass auth headers for servers that require authentication
   */
  async connect(
    server: MCPServer,
    authHeaders?: Record<string, string>
  ): Promise<MCPBrowserConnection> {
    // Check if already connected
    let existing = this.connections.get(server.id);
    if (existing && existing.status === 'connected') {
      return existing;
    }

    // Create appropriate transport based on server transport type
    let transport = createTransport(server, authHeaders);

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
      connection.capabilities = await listAllCapabilities(connection);

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
