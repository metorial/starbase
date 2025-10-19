'use client';

import mcpServersData from '@/data/mcp-servers.json';
import * as Dialog from '@radix-ui/react-dialog';
import { RiAlertLine, RiCheckLine, RiCloseLine, RiSearchLine } from '@remixicon/react';
import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

let Overlay = styled(Dialog.Overlay)`
  background: rgba(0, 0, 0, 0.5);
  position: fixed;
  inset: 0;
  z-index: 1000;
  animation: fadeIn 150ms;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

let Content = styled(Dialog.Content)`
  background: white;
  border: 1px solid #ccc;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90vw;
  max-width: 600px;
  max-height: 85vh;
  z-index: 1001;
  animation: slideIn 150ms;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translate(-50%, -48%);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%);
    }
  }
`;

let Header = styled.div`
  padding: 24px;
  border-bottom: 1px solid #ccc;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
`;

let Title = styled(Dialog.Title)`
  font-size: 18px;
  font-weight: 600;
  color: #000000;
  margin: 0;
`;

let CloseButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  color: #666666;
  padding: 4px;
  display: flex;
  align-items: center;

  &:hover {
    color: #000000;
  }
`;

let Body = styled.div`
  padding: 24px;
  flex: 1 1 auto;
  overflow-y: auto;
  min-height: 0;
`;

let Description = styled.p`
  font-size: 14px;
  color: #666666;
  margin: 0 0 16px 0;
  line-height: 1.5;
`;

let SearchWrapper = styled.div`
  position: relative;
  margin-bottom: 16px;
`;

let SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #666666;
  pointer-events: none;
`;

let SearchInput = styled.input`
  width: 100%;
  padding: 10px 12px 10px 40px;
  border: 1px solid #ccc;
  font-size: 14px;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: #000000;
  }

  &::placeholder {
    color: #999999;
  }
`;

let ServerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

let ServerCount = styled.div`
  font-size: 13px;
  color: #666666;
  margin-bottom: 12px;
  font-weight: 500;
`;

let ServerItem = styled.div<{ $selected?: boolean }>`
  padding: 16px;
  border: 2px solid ${props => (props.$selected ? '#0c4a6e' : '#e5e5e5')};
  background: ${props => (props.$selected ? '#f0f9ff' : '#ffffff')};
  cursor: pointer;
  transition: all 150ms;
  display: flex;
  align-items: flex-start;
  gap: 12px;

  &:hover {
    border-color: ${props => (props.$selected ? '#0c4a6e' : '#ccc')};
  }
`;

let ServerCheckbox = styled.div<{ $checked?: boolean }>`
  width: 20px;
  height: 20px;
  border: 2px solid ${props => (props.$checked ? '#0c4a6e' : '#ccc')};
  background: ${props => (props.$checked ? '#0c4a6e' : '#ffffff')};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 150ms;
`;

let ServerInfo = styled.div`
  flex: 1;
`;

let ServerName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #000000;
  margin-bottom: 4px;
`;

let ServerUrl = styled.div`
  font-size: 13px;
  color: #666666;
  font-family: 'Monaco', 'Courier New', monospace;
  margin-bottom: 8px;
`;

let ConnectionSelect = styled.select`
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  font-size: 13px;
  font-family: inherit;
  background: #ffffff;

  &:focus {
    outline: none;
    border-color: #000000;
  }
`;

let EmptyState = styled.div`
  text-align: center;
  padding: 40px 24px;
  color: #666666;
  font-size: 14px;
`;

let Footer = styled.div`
  padding: 24px;
  border-top: 1px solid #ccc;
  background: #ffffff;
  flex-shrink: 0;
`;

let Actions = styled.div`
  display: flex;
  gap: 12px;
`;

let Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: 12px;
  background: ${props => (props.$variant === 'primary' ? '#000000' : '#ffffff')};
  border: 1px solid #000000;
  color: ${props => (props.$variant === 'primary' ? '#ffffff' : '#000000')};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms;

  &:hover {
    background: ${props => (props.$variant === 'primary' ? '#333333' : '#f5f5f5')};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

let WarningBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #fef9f0;
  border: 1px solid #92400e;
  color: #92400e;
  font-size: 12px;
  font-weight: 500;
  margin-top: 8px;
`;

interface ChatServer {
  serverUrl: string;
  serverName: string;
  transport: string;
  connectionId: string | null;
}

interface ServerSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (servers: ChatServer[]) => void;
  initialServers: ChatServer[];
}

interface AvailableServer {
  id: string;
  url: string;
  name: string;
  transport: string;
}

interface Connection {
  id: string;
  serverUrl: string;
  serverName: string;
  authType: string;
}

let ServerSelectionModal = ({
  open,
  onClose,
  onSave,
  initialServers
}: ServerSelectionModalProps) => {
  let [availableServers, setAvailableServers] = useState<AvailableServer[]>([]);
  let [connections, setConnections] = useState<Connection[]>([]);
  let [selectedServers, setSelectedServers] = useState<Map<string, string | null>>(new Map());
  let [loading, setLoading] = useState(true);
  let [searchQuery, setSearchQuery] = useState('');

  // Filter and limit servers
  let filteredServers = useMemo(() => {
    let query = searchQuery.toLowerCase().trim();
    if (!query) {
      return availableServers.slice(0, 10);
    }

    let filtered = availableServers.filter(
      server =>
        server.name.toLowerCase().includes(query) || server.url.toLowerCase().includes(query)
    );
    return filtered.slice(0, 10);
  }, [availableServers, searchQuery]);

  useEffect(() => {
    if (open) {
      fetchData();
      // Initialize selected servers from props
      let map = new Map<string, string | null>();
      initialServers.forEach(s => {
        map.set(s.serverUrl, s.connectionId);
      });
      setSelectedServers(map);
    }
  }, [open, initialServers]);

  let fetchData = async () => {
    try {
      setLoading(true);

      // Fetch custom servers
      let customServersResponse = await fetch('/api/mcp/servers');
      let customServers = customServersResponse.ok
        ? (await customServersResponse.json()).servers
        : [];

      // Get default servers from imported data
      let defaultServers = mcpServersData.servers || [];

      // Combine both lists (custom first, then default)
      setAvailableServers([...customServers, ...defaultServers]);

      // Fetch connections
      let connectionsResponse = await fetch('/api/connections');
      if (connectionsResponse.ok) {
        let connectionsData = await connectionsResponse.json();
        setConnections(connectionsData.connections);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  let toggleServer = (serverUrl: string, serverName: string) => {
    let newMap = new Map(selectedServers);
    if (newMap.has(serverUrl)) {
      newMap.delete(serverUrl);
    } else {
      // Find matching connection if available
      let matchingConnection = connections.find(c => c.serverUrl === serverUrl);
      newMap.set(serverUrl, matchingConnection?.id || null);
    }
    setSelectedServers(newMap);
  };

  let updateConnection = (serverUrl: string, connectionId: string) => {
    let newMap = new Map(selectedServers);
    newMap.set(serverUrl, connectionId || null);
    setSelectedServers(newMap);
  };

  let handleSave = () => {
    let servers: ChatServer[] = [];
    selectedServers.forEach((connectionId, serverUrl) => {
      let server = availableServers.find(s => s.url === serverUrl);
      if (server) {
        servers.push({
          serverUrl,
          serverName: server.name,
          transport: server.transport || 'sse',
          connectionId
        });
      }
    });
    onSave(servers);
  };

  let getServerConnections = (serverUrl: string) => {
    return connections.filter(c => c.serverUrl === serverUrl);
  };

  if (loading) {
    return (
      <Dialog.Root open={open} onOpenChange={onClose}>
        <Dialog.Portal>
          <Overlay />
          <Content>
            <Header>
              <Title>Select MCP Servers</Title>
              <Dialog.Close asChild>
                <CloseButton>
                  <RiCloseLine size={20} />
                </CloseButton>
              </Dialog.Close>
            </Header>
            <Body>
              <EmptyState>Loading servers...</EmptyState>
            </Body>
          </Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Overlay />
        <Content>
          <Header>
            <Title>Select MCP Servers</Title>
            <Dialog.Close asChild>
              <CloseButton>
                <RiCloseLine size={20} />
              </CloseButton>
            </Dialog.Close>
          </Header>

          <Body>
            <Description>
              Choose which MCP servers to connect to this chat. If you have saved connections,
              you can select them to use their credentials.
            </Description>

            <SearchWrapper>
              <SearchIcon>
                <RiSearchLine size={18} />
              </SearchIcon>
              <SearchInput
                type="text"
                placeholder="Search servers by name or URL..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </SearchWrapper>

            {availableServers.length === 0 ? (
              <EmptyState>No MCP servers available. Add a custom server first.</EmptyState>
            ) : (
              <>
                <ServerCount>
                  Showing {filteredServers.length} of {availableServers.length} servers
                  {searchQuery && ` (filtered)`}
                </ServerCount>
                <ServerList>
                  {filteredServers.map(server => {
                    let isSelected = selectedServers.has(server.url);
                    let serverConnections = getServerConnections(server.url);
                    let selectedConnectionId = selectedServers.get(server.url);

                    return (
                      <ServerItem
                        key={server.id}
                        $selected={isSelected}
                        onClick={() => toggleServer(server.url, server.name)}
                      >
                        <ServerCheckbox $checked={isSelected}>
                          {isSelected && <RiCheckLine size={16} color="#ffffff" />}
                        </ServerCheckbox>
                        <ServerInfo>
                          <ServerName>{server.name}</ServerName>
                          <ServerUrl>{server.url}</ServerUrl>

                          {isSelected && serverConnections.length > 0 && (
                            <ConnectionSelect
                              value={selectedConnectionId || ''}
                              onChange={e => {
                                e.stopPropagation();
                                updateConnection(server.url, e.target.value);
                              }}
                              onClick={e => e.stopPropagation()}
                            >
                              <option value="">No saved connection</option>
                              {serverConnections.map(conn => (
                                <option key={conn.id} value={conn.id}>
                                  {conn.authType === 'oauth' ? 'OAuth' : 'Custom Headers'} -{' '}
                                  {conn.serverName}
                                </option>
                              ))}
                            </ConnectionSelect>
                          )}

                          {isSelected && !selectedConnectionId && (
                            <WarningBadge onClick={e => e.stopPropagation()}>
                              <RiAlertLine size={14} />
                              No saved connection - may require authentication
                            </WarningBadge>
                          )}
                        </ServerInfo>
                      </ServerItem>
                    );
                  })}
                </ServerList>
              </>
            )}
          </Body>

          <Footer>
            <Actions>
              <Button $variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                $variant="primary"
                onClick={handleSave}
                disabled={selectedServers.size === 0}
              >
                Save ({selectedServers.size} selected)
              </Button>
            </Actions>
          </Footer>
        </Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default ServerSelectionModal;
