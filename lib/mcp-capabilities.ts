import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

export type CapabilityType = 'tools' | 'resources' | 'resourceTemplates' | 'prompts';

export interface ConnectionLike {
  client: Client;
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'auth_required';
}

export let listCapability = async <T>(
  connection: ConnectionLike | undefined,
  capabilityType: CapabilityType,
  logError: boolean = true
): Promise<T[]> => {
  if (!connection || connection.status !== 'connected') {
    return [];
  }

  try {
    let result: any;

    switch (capabilityType) {
      case 'tools':
        result = await connection.client.listTools();
        return result.tools as T[];

      case 'resources':
        result = await connection.client.listResources();
        return result.resources as T[];

      case 'resourceTemplates':
        result = await connection.client.listResourceTemplates();
        return (result.resourceTemplates || []) as T[];

      case 'prompts':
        result = await connection.client.listPrompts();
        return result.prompts as T[];

      default:
        return [];
    }
  } catch (error) {
    if (logError && capabilityType !== 'resourceTemplates') {
      console.error(`Error listing ${capabilityType}:`, error);
    }
    return [];
  }
};

export let listAllCapabilities = async (connection: ConnectionLike | undefined) => {
  let [tools, resources, resourceTemplates, prompts] = await Promise.all([
    listCapability(connection, 'tools'),
    listCapability(connection, 'resources'),
    listCapability(connection, 'resourceTemplates'),
    listCapability(connection, 'prompts')
  ]);

  return {
    tools: tools.length > 0 ? tools : undefined,
    resources: resources.length > 0 ? resources : undefined,
    resourceTemplates: resourceTemplates.length > 0 ? resourceTemplates : undefined,
    prompts: prompts.length > 0 ? prompts : undefined
  } as {
    tools?: any[];
    resources?: any[];
    resourceTemplates?: any[];
    prompts?: any[];
  };
};
