import type { CustomMCPServer } from '@prisma/client';
import type { MCPServer } from '@/types/mcp';

export let presentMCPServer = (customServer: CustomMCPServer): MCPServer => {
  return {
    id: customServer.id,
    name: customServer.name,
    url: customServer.url,
    description: customServer.description || '',
    domain: new URL(customServer.url).hostname,
    category: customServer.category || 'Custom',
    provider: 'custom',
    transport: customServer.transport as 'sse' | 'streamable_http',
    status: 'active' as const,
    publication_status: 'private' as const,
    created_at: customServer.createdAt.toISOString()
  };
};

export let presentMCPServers = (customServers: CustomMCPServer[]): MCPServer[] => {
  return customServers.map(presentMCPServer);
};
