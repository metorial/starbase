import type { CustomMCPServer } from '@prisma/client';
import type { MCPServer } from '@/types/mcp';

/**
 * Transform a CustomMCPServer from the database into an MCPServer interface
 */
export function presentMCPServer(customServer: CustomMCPServer): MCPServer {
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
}

/**
 * Transform multiple CustomMCPServers into MCPServer interfaces
 */
export function presentMCPServers(customServers: CustomMCPServer[]): MCPServer[] {
  return customServers.map(presentMCPServer);
}
