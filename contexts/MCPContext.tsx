'use client';

import { listAllCapabilities } from '@/lib/mcp-capabilities';
import { mcpManager, type MCPConnection } from '@/lib/mcp-client';
import type { MCPServer } from '@/types/mcp';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

interface MCPContextType {
  selectedServer: MCPServer | null;
  selectServer: (server: MCPServer | null) => void;
  connection: MCPConnection | null;
  connect: (server: MCPServer, authHeaders?: Record<string, string>) => Promise<MCPConnection>;
  disconnect: (serverId: string) => Promise<void>;
  refreshCapabilities: (serverId: string) => Promise<void>;
  customServers: MCPServer[];
  refreshCustomServers: () => Promise<void>;
  createCustomServer: (
    server: Omit<
      MCPServer,
      'id' | 'status' | 'publication_status' | 'created_at' | 'domain' | 'provider'
    >
  ) => Promise<MCPServer>;
  updateCustomServer: (
    id: string,
    server: Partial<Omit<MCPServer, 'id' | 'created_at'>>
  ) => Promise<MCPServer>;
  deleteCustomServer: (id: string) => Promise<void>;
}

let MCPContext = createContext<MCPContextType | undefined>(undefined);

export let MCPProvider = ({ children }: { children: ReactNode }) => {
  let [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);
  let [connection, setConnection] = useState<MCPConnection | null>(null);
  let [customServers, setCustomServers] = useState<MCPServer[]>([]);

  let selectServer = useCallback((server: MCPServer | null) => {
    setSelectedServer(server);
    if (server) {
      let existing = mcpManager.getConnection(server.id);
      if (existing) {
        setConnection(existing);
      } else {
        setConnection(null);
      }
    } else {
      setConnection(null);
    }
  }, []);

  let connect = useCallback(
    async (server: MCPServer, authHeaders?: Record<string, string>) => {
      try {
        let conn = await mcpManager.connect(server, authHeaders);
        setConnection(conn);
        setSelectedServer(server);
        return conn;
      } catch (error) {
        console.error('Failed to connect:', error);
        throw error;
      }
    },
    []
  );

  let disconnect = useCallback(
    async (serverId: string) => {
      await mcpManager.disconnect(serverId);
      if (connection?.server.id === serverId) {
        setConnection(null);
        setSelectedServer(null);
      }
    },
    [connection]
  );

  let refreshCapabilities = useCallback(async (serverId: string) => {
    let conn = mcpManager.getConnection(serverId);
    if (conn && conn.status === 'connected') {
      conn.capabilities = await listAllCapabilities(conn);
      setConnection({ ...conn });
    }
  }, []);

  let refreshCustomServers = useCallback(async () => {
    try {
      let response = await fetch('/api/mcp/servers');
      if (response.ok) {
        let data = await response.json();
        // Transform custom servers to match MCPServer interface
        let servers: MCPServer[] = data.servers.map((server: any) => ({
          id: server.id,
          name: server.name,
          description: server.description || '',
          domain: new URL(server.url).hostname,
          category: server.category,
          url: server.url,
          provider: 'custom',
          transport: server.transport,
          status: 'active' as const,
          publication_status: 'private' as const,
          created_at: server.createdAt
        }));
        setCustomServers(servers);
      }
    } catch (error) {
      console.error('Failed to fetch custom servers:', error);
    }
  }, []);

  let createCustomServer = useCallback(
    async (
      server: Omit<
        MCPServer,
        'id' | 'status' | 'publication_status' | 'created_at' | 'domain' | 'provider'
      >
    ): Promise<MCPServer> => {
      let response = await fetch('/api/mcp/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: server.name,
          url: server.url,
          description: server.description,
          category: server.category,
          transport: server.transport
        })
      });

      if (!response.ok) {
        let error = await response.json();
        throw new Error(error.error || 'Failed to create server');
      }

      let data = await response.json();
      await refreshCustomServers();

      return {
        id: data.server.id,
        name: data.server.name,
        description: data.server.description || '',
        domain: new URL(data.server.url).hostname,
        category: data.server.category,
        url: data.server.url,
        provider: 'custom',
        transport: data.server.transport,
        status: 'active',
        publication_status: 'private',
        created_at: data.server.createdAt
      };
    },
    [refreshCustomServers]
  );

  let updateCustomServer = useCallback(
    async (
      id: string,
      server: Partial<Omit<MCPServer, 'id' | 'created_at'>>
    ): Promise<MCPServer> => {
      let response = await fetch(`/api/mcp/servers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: server.name,
          url: server.url,
          description: server.description,
          category: server.category,
          transport: server.transport
        })
      });

      if (!response.ok) {
        let error = await response.json();
        throw new Error(error.error || 'Failed to update server');
      }

      let data = await response.json();
      await refreshCustomServers();

      return {
        id: data.server.id,
        name: data.server.name,
        description: data.server.description || '',
        domain: new URL(data.server.url).hostname,
        category: data.server.category,
        url: data.server.url,
        provider: 'custom',
        transport: data.server.transport,
        status: 'active',
        publication_status: 'private',
        created_at: data.server.createdAt
      };
    },
    [refreshCustomServers]
  );

  let deleteCustomServer = useCallback(
    async (id: string) => {
      let response = await fetch(`/api/mcp/servers/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        let error = await response.json();
        throw new Error(error.error || 'Failed to delete server');
      }

      await refreshCustomServers();

      // If the deleted server is currently selected, clear selection
      if (selectedServer?.id === id) {
        setSelectedServer(null);
        setConnection(null);
      }
    },
    [refreshCustomServers, selectedServer]
  );

  // Fetch custom servers on mount
  useEffect(() => {
    refreshCustomServers();
  }, [refreshCustomServers]);

  return (
    <MCPContext.Provider
      value={{
        selectedServer,
        selectServer,
        connection,
        connect,
        disconnect,
        refreshCapabilities,
        customServers,
        refreshCustomServers,
        createCustomServer,
        updateCustomServer,
        deleteCustomServer
      }}
    >
      {children}
    </MCPContext.Provider>
  );
};

export let useMCP = () => {
  let context = useContext(MCPContext);
  if (context === undefined) {
    throw new Error('useMCP must be used within MCPProvider');
  }
  return context;
};
