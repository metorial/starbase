'use client';

import { MCPBrowserConnectionManager } from '@/lib/mcp-client-browser';
import type { AuthChallenge } from '@/types/mcp';
import {
  RiAlertLine,
  RiCheckLine,
  RiDeleteBinLine,
  RiSendPlane2Line,
  RiServerLine,
  RiSettings3Line,
  RiShieldKeyholeLine
} from '@remixicon/react';
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import CustomHeadersModal from '../mcp/CustomHeadersModal';
import OAuthModal from '../mcp/OAuthModal';
import ServerSelectionModal from './ServerSelectionModal';

let Container = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  background: #ffffff;
  overflow: hidden;
  min-width: 0;
  width: 100%;
  height: 100%;
`;

let Header = styled.div`
  padding: 16px 24px;
  border-bottom: 1px solid #ccc;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
`;

let HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

let HeaderTitle = styled.h2`
  font-size: 16px;
  font-weight: 600;
  color: #000000;
  margin: 0;
`;

let ServerBadge = styled.div<{ $hasWarnings?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: ${props => (props.$hasWarnings ? '#fef9f0' : '#f0f9ff')};
  border: 1px solid ${props => (props.$hasWarnings ? '#92400e' : '#0c4a6e')};
  color: ${props => (props.$hasWarnings ? '#92400e' : '#0c4a6e')};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms;
  position: relative;
`;

let ServerStatusDropdown = styled.div`
  position: fixed;
  top: 60px;
  left: 520px;
  background: #ffffff;
  border: 1px solid #ccc;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-width: 300px;
  z-index: 1000;
  max-height: calc(100vh - 80px);
  overflow-y: auto;
`;

let ServerStatusHeader = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid #e5e5e5;
  font-size: 13px;
  font-weight: 600;
  color: #000000;
`;

let ServerStatusItem = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid #f5f5f5;
  display: flex;
  align-items: flex-start;
  gap: 8px;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #fafafa;
  }
`;

let ServerStatusIcon = styled.div<{ $status: 'ok' | 'warning' }>`
  color: ${props => (props.$status === 'ok' ? '#15803d' : '#92400e')};
  flex-shrink: 0;
  margin-top: 2px;
`;

let ServerStatusDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

let ServerStatusName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #000000;
  margin-bottom: 2px;
`;

let ServerStatusUrl = styled.div`
  font-size: 12px;
  color: #666666;
  font-family: 'Monaco', 'Courier New', monospace;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

let ServerStatusMessage = styled.div<{ $type: 'ok' | 'warning' }>`
  font-size: 12px;
  color: ${props => (props.$type === 'ok' ? '#15803d' : '#92400e')};
  font-weight: 500;
`;

let AuthenticateButton = styled.button`
  margin-top: 8px;
  padding: 6px 12px;
  background: #000000;
  border: none;
  color: #ffffff;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 150ms;

  &:hover {
    background: #333333;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

let ModelSelector = styled.select`
  padding: 6px 12px;
  border: 1px solid #ccc;
  font-size: 13px;
  font-family: inherit;
  background: #ffffff;
  color: #000000;
  cursor: pointer;
  transition: all 150ms;

  &:hover {
    border-color: #000000;
  }

  &:focus {
    outline: none;
    border-color: #000000;
  }
`;

let HeaderActions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

let IconButton = styled.button`
  padding: 8px;
  background: transparent;
  border: 1px solid #ccc;
  color: #666666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms;

  &:hover {
    background: #f5f5f5;
    border-color: #000000;
    color: #000000;
  }

  &.danger:hover {
    background: #fef2f2;
    border-color: #991b1b;
    color: #991b1b;
  }
`;

let Messages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
`;

let Message = styled.div<{ $role: string }>`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  ${props => (props.$role === 'user' ? 'flex-direction: row-reverse;' : '')}
`;

let MessageAvatar = styled.div<{ $role: string }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => (props.$role === 'user' ? '#000000' : '#f0f9ff')};
  color: ${props => (props.$role === 'user' ? '#ffffff' : '#0c4a6e')};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
`;

let MessageContent = styled.div<{ $role: string }>`
  flex: 1;
  min-width: 0;
  max-width: 100%;
  padding: 12px 16px;
  background: ${props => (props.$role === 'user' ? '#f5f5f5' : '#ffffff')};
  border: 1px solid ${props => (props.$role === 'user' ? '#e5e5e5' : '#ccc')};
  font-size: 14px;
  line-height: 1.6;
  color: #000000;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  ${props => (props.$role === 'user' ? 'text-align: right;' : '')}
`;

let StreamingCursor = styled.span`
  display: inline-block;
  width: 8px;
  height: 16px;
  background: #000000;
  margin-left: 2px;
  animation: blink 1s infinite;

  @keyframes blink {
    0%,
    50% {
      opacity: 1;
    }
    51%,
    100% {
      opacity: 0;
    }
  }
`;

let SystemMessage = styled.div`
  padding: 12px 16px;
  background: #fef9f0;
  border: 1px solid #92400e;
  border-left: 4px solid #92400e;
  font-size: 13px;
  line-height: 1.6;
  color: #78350f;
  white-space: pre-wrap;
  word-wrap: break-word;
  display: flex;
  align-items: flex-start;
  gap: 8px;

  &::before {
    content: '⚠️';
    flex-shrink: 0;
  }
`;

let InputArea = styled.div`
  border-top: 1px solid #ccc;
  padding: 16px 24px;
  background: #fafafa;
  flex-shrink: 0;
`;

let InputWrapper = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-end;
`;

let TextArea = styled.textarea`
  flex: 1;
  padding: 12px;
  border: 1px solid #ccc;
  font-size: 14px;
  font-family: inherit;
  resize: none;
  min-height: 44px;
  max-height: 200px;

  &:focus {
    outline: none;
    border-color: #000000;
  }

  &:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }
`;

let SendButton = styled.button`
  padding: 12px 16px;
  background: #000000;
  border: none;
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: all 150ms;

  &:hover:not(:disabled) {
    background: #333333;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

let SetupPrompt = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
  overflow-y: auto;
`;

let SetupTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: #000000;
  margin: 0 0 12px 0;
`;

let SetupDescription = styled.p`
  font-size: 14px;
  color: #666666;
  margin: 0 0 24px 0;
  max-width: 400px;
`;

let SetupButton = styled.button`
  padding: 12px 24px;
  background: #000000;
  border: none;
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 150ms;

  &:hover {
    background: #333333;
  }
`;

let EmptyStateContainer = styled.div`
  padding: 24px;
  background: #fef9f0;
  border: 1px solid #92400e;
  border-left: 4px solid #92400e;
  margin: 16px 24px;
`;

let EmptyStateTitle = styled.h4`
  font-size: 14px;
  font-weight: 600;
  color: #78350f;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

let EmptyStateDescription = styled.p`
  font-size: 13px;
  color: #78350f;
  margin: 0 0 16px 0;
  line-height: 1.5;
`;

let ServerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
`;

let ServerItem = styled.div`
  padding: 12px;
  background: #ffffff;
  border: 1px solid #d97706;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

let ServerInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

let ServerName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #000000;
  margin-bottom: 2px;
`;

let ServerUrl = styled.div`
  font-size: 12px;
  color: #666666;
  font-family: 'Monaco', 'Courier New', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

let ServerStatus = styled.div`
  font-size: 12px;
  color: #92400e;
  font-weight: 500;
`;

let SetupConnectionButton = styled.button`
  padding: 8px 16px;
  background: #000000;
  border: none;
  color: #ffffff;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 150ms;
  flex-shrink: 0;

  &:hover {
    background: #333333;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

interface ChatInterfaceProps {
  chatId: string;
  onChatCreated?: (chatId: string) => void;
  onChatDeleted?: () => void;
}

interface ChatServer {
  serverUrl: string;
  serverName: string;
  transport: string;
  connectionId: string | null;
}

interface StreamingMessage {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

let ChatInterface = ({ chatId, onChatCreated, onChatDeleted }: ChatInterfaceProps) => {
  let [chat, setChat] = useState<any>(null);
  let [loading, setLoading] = useState(true);
  let [showServerModal, setShowServerModal] = useState(false);
  let [showServerStatus, setShowServerStatus] = useState(false);
  let [selectedServers, setSelectedServers] = useState<ChatServer[]>([]);
  let [selectedModel, setSelectedModel] = useState('claude-sonnet-4-5-20250929');
  let [authenticatingServer, setAuthenticatingServer] = useState<ChatServer | null>(null);
  let [authChallenge, setAuthChallenge] = useState<AuthChallenge | null>(null);
  let [showOAuthModal, setShowOAuthModal] = useState(false);
  let [showHeadersModal, setShowHeadersModal] = useState(false);
  let [streamingMessages, setStreamingMessages] = useState<StreamingMessage[]>([]);
  let [serverConnectionStates, setServerConnectionStates] = useState<
    Map<string, 'connecting' | 'connected' | 'error'>
  >(new Map());
  let [isConnecting, setIsConnecting] = useState(false);
  let messagesEndRef = useRef<HTMLDivElement>(null);
  let mcpManagerRef = useRef<MCPBrowserConnectionManager | null>(null);

  let isNewChat = chatId === 'new';

  // Initialize MCP manager
  if (!mcpManagerRef.current) {
    mcpManagerRef.current = new MCPBrowserConnectionManager();
  }

  // Check if any servers are missing connections
  let hasServerWarnings = selectedServers.some(s => !s.connectionId);

  // Check if all servers are connected and ready
  let allServersConnected =
    selectedServers.length > 0 &&
    selectedServers.every(s => {
      let state = serverConnectionStates.get(s.serverUrl);
      return state === 'connected';
    });

  // Fetch chat data if not new
  useEffect(() => {
    if (!isNewChat) {
      fetchChat();
    } else {
      setLoading(false);
      setShowServerModal(true); // Show server selection immediately for new chats
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, isNewChat]);

  let fetchChat = async () => {
    try {
      setLoading(true);
      let response = await fetch(`/api/chats/${chatId}`);
      if (response.ok) {
        let data = await response.json();
        setChat(data.chat);
        setSelectedServers(
          data.chat.servers.map((s: any) => ({
            serverUrl: s.serverUrl,
            serverName: s.serverName,
            transport: s.transport || 'sse', // Default to SSE if not set
            connectionId: s.connectionId
          }))
        );
      }
    } catch (error) {
      console.error('Failed to fetch chat:', error);
    } finally {
      setLoading(false);
    }
  };

  let handleServersSaved = async (servers: ChatServer[]) => {
    setSelectedServers(servers);
    setShowServerModal(false);

    if (isNewChat && servers.length > 0) {
      // Create new chat with selected servers
      try {
        let response = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ servers })
        });

        if (response.ok) {
          let data = await response.json();
          onChatCreated?.(data.chat.id);
        }
      } catch (error) {
        console.error('Failed to create chat:', error);
      }
    } else if (!isNewChat) {
      // Update existing chat servers
      try {
        await fetch(`/api/chats/${chatId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ servers })
        });
        fetchChat();
      } catch (error) {
        console.error('Failed to update chat servers:', error);
      }
    }
  };

  // Connect to MCP servers when chat loads or servers change
  useEffect(() => {
    let connectToServers = async () => {
      if (!mcpManagerRef.current || selectedServers.length === 0) {
        setIsConnecting(false);
        return;
      }

      setIsConnecting(true);

      // Initialize connection states
      let newStates = new Map<string, 'connecting' | 'connected' | 'error'>();
      selectedServers.forEach(s => newStates.set(s.serverUrl, 'connecting'));
      setServerConnectionStates(newStates);

      // Connect to all servers in parallel
      let connectionPromises = selectedServers.map(async server => {
        try {
          let mcpServer = {
            id: server.serverUrl,
            name: server.serverName,
            url: server.serverUrl,
            transport: (server.transport || 'sse') as 'sse' | 'streamable_http',
            category: 'Connected' as const,
            description: '',
            domain: new URL(server.serverUrl).hostname,
            provider: 'custom' as const,
            status: 'active' as const,
            publication_status: 'private' as const,
            created_at: new Date().toISOString()
          };

          // If there's a saved connection, fetch the credentials
          let authHeaders: Record<string, string> | undefined;
          if (server.connectionId) {
            try {
              let response = await fetch(`/api/connections/${server.connectionId}`);
              if (response.ok) {
                let data = await response.json();
                let { credentials, authType } = data.connection;

                // Create auth headers based on type
                if (authType === 'oauth' && credentials.accessToken) {
                  authHeaders = {
                    Authorization: `Bearer ${credentials.accessToken}`
                  };
                } else if (authType === 'custom_headers' && credentials.headers) {
                  authHeaders = credentials.headers;
                }
              } else {
                let errorText = await response.text();
                console.error(
                  '[ChatInterface] Failed to fetch connection credentials:',
                  response.status,
                  errorText
                );
                throw new Error(`Failed to fetch credentials: ${response.status}`);
              }
            } catch (error) {
              console.error('[ChatInterface] Error fetching credentials:', error);
              throw error;
            }
          } else {
            console.warn(
              '[ChatInterface] No connectionId for server:',
              server.serverName,
              '- attempting connection without credentials'
            );
          }

          let connection = await mcpManagerRef.current!.connect(mcpServer, authHeaders);

          if (connection.status === 'connected') {
            setServerConnectionStates(prev => {
              let updated = new Map(prev);
              updated.set(server.serverUrl, 'connected');
              return updated;
            });
          } else {
            throw new Error(connection.error || 'Connection failed');
          }
        } catch (error) {
          console.error('[ChatInterface] Failed to connect to', server.serverName, error);
          setServerConnectionStates(prev => {
            let updated = new Map(prev);
            updated.set(server.serverUrl, 'error');
            return updated;
          });
        }
      });

      await Promise.all(connectionPromises);
      setIsConnecting(false);
    };

    connectToServers();

    // Cleanup - disconnect when component unmounts or chat changes
    return () => {
      if (mcpManagerRef.current) {
        mcpManagerRef.current.disconnectAll();
      }
    };
  }, [selectedServers, chatId]);

  let handleAuthenticate = async (server: ChatServer) => {
    // Probe server for auth requirements
    try {
      let mcpServer = {
        id: server.serverUrl,
        name: server.serverName,
        url: server.serverUrl,
        transport: (server.transport || 'sse') as 'sse' | 'streamable_http',
        category: 'Connected' as const,
        description: '',
        domain: new URL(server.serverUrl).hostname,
        provider: 'custom' as const,
        status: 'active' as const,
        publication_status: 'private' as const,
        created_at: new Date().toISOString()
      };

      // Probe for auth requirements
      let authChallenge = await mcpManagerRef.current?.probeAuth(mcpServer);

      if (authChallenge) {
        setAuthenticatingServer(server);
        setAuthChallenge(authChallenge);

        // Open the appropriate modal based on auth type
        if (authChallenge.type === 'oauth') {
          setShowOAuthModal(true);
        } else {
          setShowHeadersModal(true);
        }
      } else {
        alert('This server does not require authentication.');
      }
    } catch (error) {
      console.error('[ChatInterface] Failed to authenticate:', error);
      alert('Failed to start authentication. Please try again.');
    }
  };

  let handleAuthSuccess = async () => {
    // Close modals
    setShowOAuthModal(false);
    setShowHeadersModal(false);

    if (!authenticatingServer) return;

    // Fetch updated connections to get the new connection ID
    try {
      let response = await fetch('/api/connections');
      if (response.ok) {
        let data = await response.json();
        let newConnection = data.connections.find(
          (c: any) => c.serverUrl === authenticatingServer.serverUrl
        );

        if (newConnection) {
          // Update the server in selectedServers with the new connectionId
          let updatedServers = selectedServers.map(s =>
            s.serverUrl === authenticatingServer.serverUrl
              ? { ...s, connectionId: newConnection.id }
              : s
          );
          setSelectedServers(updatedServers);

          // If this is an existing chat, update the chat servers
          if (!isNewChat) {
            await fetch(`/api/chats/${chatId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ servers: updatedServers })
            });
            fetchChat();
          }
        }
      }
    } catch (error) {
      console.error('Failed to update server connection:', error);
    } finally {
      setAuthenticatingServer(null);
      setAuthChallenge(null);
    }
  };

  let handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this chat?')) return;

    try {
      let response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        onChatDeleted?.();
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  let scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom('auto');
  }, [chat?.messages, streamingMessages]);

  // Close server status dropdown when clicking outside
  useEffect(() => {
    let handleClickOutside = () => {
      if (showServerStatus) {
        setShowServerStatus(false);
      }
    };

    if (showServerStatus) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showServerStatus]);

  if (loading) {
    return (
      <Container>
        <SetupPrompt>
          <SetupTitle>Loading chat...</SetupTitle>
        </SetupPrompt>
      </Container>
    );
  }

  if (isNewChat && selectedServers.length === 0) {
    return (
      <Container>
        <SetupPrompt>
          <SetupTitle>Select MCP Servers</SetupTitle>
          <SetupDescription>
            Choose which MCP servers you want to connect to this chat. The AI will have access
            to their tools and resources.
          </SetupDescription>
          <SetupButton onClick={() => setShowServerModal(true)}>
            <RiServerLine size={18} />
            Select Servers
          </SetupButton>
        </SetupPrompt>

        <ServerSelectionModal
          open={showServerModal}
          onClose={() => setShowServerModal(false)}
          onSave={handleServersSaved}
          initialServers={selectedServers}
        />
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <HeaderLeft>
          <HeaderTitle>{chat?.name || 'New Chat'}</HeaderTitle>
          {selectedServers.length > 0 && (
            <ServerBadge
              $hasWarnings={hasServerWarnings}
              onClick={() => setShowServerStatus(!showServerStatus)}
            >
              {hasServerWarnings ? <RiAlertLine size={14} /> : <RiServerLine size={14} />}
              {selectedServers.length} {selectedServers.length === 1 ? 'server' : 'servers'}
              {showServerStatus && (
                <ServerStatusDropdown onClick={e => e.stopPropagation()}>
                  <ServerStatusHeader>Server Connection Status</ServerStatusHeader>
                  {selectedServers.map((server, index) => {
                    let hasConnection = !!server.connectionId;
                    let connectionState = serverConnectionStates.get(server.serverUrl);
                    let mcpConnection = mcpManagerRef.current?.getConnection(server.serverUrl);

                    let statusMessage = '';
                    let statusType: 'ok' | 'warning' = 'warning';

                    if (connectionState === 'connecting') {
                      statusMessage = 'Connecting...';
                      statusType = 'warning';
                    } else if (
                      connectionState === 'connected' &&
                      mcpConnection?.capabilities
                    ) {
                      let toolCount = mcpConnection.capabilities.tools?.length || 0;
                      let resourceCount = mcpConnection.capabilities.resources?.length || 0;
                      let promptCount = mcpConnection.capabilities.prompts?.length || 0;
                      statusMessage = `Connected - ${toolCount} tools, ${resourceCount} resources, ${promptCount} prompts`;
                      statusType = 'ok';
                    } else if (connectionState === 'error') {
                      statusMessage = mcpConnection?.error || 'Connection failed';
                      statusType = 'warning';
                    } else if (!hasConnection) {
                      statusMessage = 'No saved connection - requires authentication';
                      statusType = 'warning';
                    } else {
                      statusMessage = 'Not connected';
                      statusType = 'warning';
                    }

                    return (
                      <ServerStatusItem key={index}>
                        <ServerStatusIcon $status={statusType}>
                          {statusType === 'ok' ? (
                            <RiCheckLine size={16} />
                          ) : (
                            <RiAlertLine size={16} />
                          )}
                        </ServerStatusIcon>
                        <ServerStatusDetails>
                          <ServerStatusName>{server.serverName}</ServerStatusName>
                          <ServerStatusUrl>{server.serverUrl}</ServerStatusUrl>
                          <ServerStatusMessage $type={statusType}>
                            {statusMessage}
                          </ServerStatusMessage>
                          {connectionState === 'error' && !hasConnection && (
                            <AuthenticateButton
                              onClick={e => {
                                e.stopPropagation();
                                handleAuthenticate(server);
                              }}
                            >
                              <RiShieldKeyholeLine size={14} />
                              Authenticate
                            </AuthenticateButton>
                          )}
                        </ServerStatusDetails>
                      </ServerStatusItem>
                    );
                  })}
                </ServerStatusDropdown>
              )}
            </ServerBadge>
          )}
        </HeaderLeft>
        <HeaderActions>
          <ModelSelector
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
          >
            <option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5</option>
            <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
            <option value="claude-3-7-sonnet-20250219">Claude 3.7 Sonnet</option>

            <option value="gpt-5">GPT-5</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4o-mini">GPT-4o Mini</option>

            <option value="gemini-1.5">Gemini 1.5</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
          </ModelSelector>
          <IconButton onClick={() => setShowServerModal(true)}>
            <RiSettings3Line size={18} />
          </IconButton>
          {!isNewChat && (
            <IconButton className="danger" onClick={handleDelete}>
              <RiDeleteBinLine size={18} />
            </IconButton>
          )}
        </HeaderActions>
      </Header>

      <Messages>
        {chat?.messages?.map((message: any) => {
          if (message.role === 'system') {
            return <SystemMessage key={message.id}>{message.content}</SystemMessage>;
          }
          return (
            <Message key={message.id} $role={message.role}>
              <MessageAvatar $role={message.role}>
                {message.role === 'user' ? 'U' : 'AI'}
              </MessageAvatar>
              <MessageContent $role={message.role}>{message.content}</MessageContent>
            </Message>
          );
        })}
        {streamingMessages.map((message, index) => (
          <Message key={`streaming-${index}`} $role={message.role}>
            <MessageAvatar $role={message.role}>
              {message.role === 'user' ? 'U' : 'AI'}
            </MessageAvatar>
            <MessageContent $role={message.role}>
              {message.content}
              {message.isStreaming && <StreamingCursor />}
            </MessageContent>
          </Message>
        ))}
        <div ref={messagesEndRef} />
      </Messages>

      <ChatInput
        chatId={isNewChat ? null : chatId}
        selectedModel={selectedModel}
        mcpManager={mcpManagerRef.current}
        allServersConnected={allServersConnected}
        isConnecting={isConnecting}
        serverCount={selectedServers.length}
        onMessageSent={() => {
          setStreamingMessages([]);
          fetchChat();
        }}
        onStreamingUpdate={messages => setStreamingMessages(messages)}
        selectedServers={selectedServers}
        serverConnectionStates={serverConnectionStates}
        onAuthenticate={handleAuthenticate}
      />

      <ServerSelectionModal
        open={showServerModal}
        onClose={() => setShowServerModal(false)}
        onSave={handleServersSaved}
        initialServers={selectedServers}
      />

      {authenticatingServer && authChallenge && (
        <>
          <OAuthModal
            open={showOAuthModal}
            onClose={() => {
              setShowOAuthModal(false);
              setAuthenticatingServer(null);
              setAuthChallenge(null);
            }}
            authChallenge={authChallenge}
            serverName={authenticatingServer.serverName}
            serverUrl={authenticatingServer.serverUrl}
            onAuth={handleAuthSuccess}
          />

          <CustomHeadersModal
            open={showHeadersModal}
            onClose={() => {
              setShowHeadersModal(false);
              setAuthenticatingServer(null);
              setAuthChallenge(null);
            }}
            authChallenge={authChallenge}
            serverName={authenticatingServer.serverName}
            serverUrl={authenticatingServer.serverUrl}
            onAuth={handleAuthSuccess}
          />
        </>
      )}
    </Container>
  );
};

// Separate component for chat input with streaming support
function ChatInput({
  chatId,
  selectedModel,
  mcpManager,
  allServersConnected,
  isConnecting,
  serverCount,
  onMessageSent,
  onStreamingUpdate,
  selectedServers,
  serverConnectionStates,
  onAuthenticate
}: {
  chatId: string | null;
  selectedModel: string;
  mcpManager: MCPBrowserConnectionManager | null;
  allServersConnected: boolean;
  isConnecting: boolean;
  serverCount: number;
  onMessageSent: () => void;
  onStreamingUpdate: (messages: StreamingMessage[]) => void;
  selectedServers: ChatServer[];
  serverConnectionStates: Map<string, 'connecting' | 'connected' | 'error'>;
  onAuthenticate: (server: ChatServer) => void;
}) {
  let [input, setInput] = useState('');
  let [isStreaming, setIsStreaming] = useState(false);

  let handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !chatId || isStreaming || !allServersConnected) return;

    let message = input.trim();
    setInput('');
    setIsStreaming(true);

    try {
      // Show user message immediately
      onStreamingUpdate([{ role: 'user', content: message }]);

      // Get all available tools from connected MCP servers
      let allTools = mcpManager?.getAllTools() || [];

      // Get all available resources
      let allResources = mcpManager?.getAllResources() || [];

      // Get all available prompts
      let allPrompts = mcpManager?.getAllPrompts() || [];

      // Format tools for the LLM (AI SDK format)
      // AI SDK expects tools with { description, parameters } where parameters is a JSON Schema
      let tools: Record<string, any> = {};
      for (let { serverId, serverName, tool } of allTools) {
        let toolKey = `${serverName}__${tool.name}`;

        // Ensure input schema has required 'type' field
        let inputSchema = tool.inputSchema || {};

        // If inputSchema doesn't have a type, add it
        if (!inputSchema.type) {
          inputSchema = {
            type: 'object',
            properties: inputSchema.properties || {},
            required: inputSchema.required || [],
            ...inputSchema
          };
        }

        tools[toolKey] = {
          description: tool.description || `Tool from ${serverName}`,
          parameters: inputSchema,
          // Store metadata for later tool execution
          _meta: {
            serverId,
            serverName,
            originalName: tool.name
          }
        };
      }

      let response = await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          model: selectedModel,
          tools: Object.keys(tools).length > 0 ? tools : undefined
        })
      });

      if (!response.ok) {
        let errorText = await response.text();
        console.error('[ChatInput] API error:', errorText);
        throw new Error(`Failed to send message: ${response.status} ${errorText}`);
      }

      // Add assistant message placeholder
      onStreamingUpdate([
        { role: 'user', content: message },
        { role: 'assistant', content: '', isStreaming: true }
      ]);

      // Parse streaming response for tool calls and text (SSE format)
      let reader = response.body?.getReader();
      if (!reader) {
        onMessageSent();
        return;
      }

      let decoder = new TextDecoder();
      let assistantText = '';
      let buffer = '';
      let pendingToolCalls: Array<{ id: string; name: string; input: any }> = [];

      while (true) {
        let { done, value } = await reader.read();
        if (done) break;

        // Decode the chunk
        let chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process SSE messages
        let lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep incomplete message in buffer

        for (let line of lines) {
          if (line.startsWith('data: ')) {
            try {
              let data = JSON.parse(line.slice(6));

              if (data.type === 'text') {
                assistantText += data.text;
                // Update UI with the new text
                onStreamingUpdate([
                  { role: 'user', content: message },
                  { role: 'assistant', content: assistantText, isStreaming: true }
                ]);
              } else if (data.type === 'tool_call') {
                pendingToolCalls.push(data.tool_call);

                // Show tool call in UI
                assistantText += `\n\n[Calling tool: ${data.tool_call.name}]`;
                onStreamingUpdate([
                  { role: 'user', content: message },
                  { role: 'assistant', content: assistantText, isStreaming: true }
                ]);
              }
            } catch (e) {
              console.warn('[ChatInput] Failed to parse SSE data:', line);
            }
          }
        }
      }

      // Execute tool calls if any and send results back to continue the conversation
      if (pendingToolCalls.length > 0) {
        // Execute all tool calls
        let toolResults: Array<{ toolCallId: string; result: any; isError?: boolean }> = [];

        for (let toolCall of pendingToolCalls) {
          try {
            // Parse tool name to get server and tool
            let [serverName, ...toolNameParts] = toolCall.name.split('__');
            let originalToolName = toolNameParts.join('__');

            // Find the serverId by looking up all tools and finding the matching serverName
            let allToolsData = mcpManager?.getAllTools() || [];
            let toolData = allToolsData.find(
              t => t.serverName === serverName && t.tool.name === originalToolName
            );

            if (!toolData) {
              throw new Error(`Tool not found: ${serverName}__${originalToolName}`);
            }

            let serverId = toolData.serverId;

            // Execute the tool via MCP
            let result = await mcpManager?.callTool(
              serverId,
              originalToolName,
              toolCall.input
            );

            toolResults.push({
              toolCallId: toolCall.id,
              result
            });

            // Update UI to show tool execution
            assistantText += `\n\n[Tool: ${toolCall.name}]\nResult: ${JSON.stringify(
              result,
              null,
              2
            )}`;
            onStreamingUpdate([
              { role: 'user', content: message },
              { role: 'assistant', content: assistantText, isStreaming: true }
            ]);
          } catch (error) {
            console.error('[ChatInput] Tool execution failed:', error);

            toolResults.push({
              toolCallId: toolCall.id,
              result: {
                error: error instanceof Error ? error.message : 'Tool execution failed'
              },
              isError: true
            });

            assistantText += `\n\n[Tool: ${toolCall.name}]\nError: ${error}`;
            onStreamingUpdate([
              { role: 'user', content: message },
              { role: 'assistant', content: assistantText, isStreaming: true }
            ]);
          }
        }

        // Send tool results back to the LLM to continue the conversation

        response = await fetch(`/api/chats/${chatId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: '', // Empty message, we're just sending tool results
            model: selectedModel,
            tools: Object.keys(tools).length > 0 ? tools : undefined,
            toolResults // Send the tool results
          })
        });

        if (!response.ok) {
          let errorText = await response.text();
          console.error('[ChatInput] API error on tool results:', errorText);
          throw new Error(`Failed to send tool results: ${response.status} ${errorText}`);
        }

        // Continue streaming the LLM's response after processing tool results
        let reader2 = response.body?.getReader();
        if (reader2) {
          let decoder2 = new TextDecoder();
          let buffer2 = '';

          while (true) {
            let { done, value } = await reader2.read();
            if (done) break;

            let chunk = decoder2.decode(value, { stream: true });
            buffer2 += chunk;

            let lines = buffer2.split('\n\n');
            buffer2 = lines.pop() || '';

            for (let line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  let data = JSON.parse(line.slice(6));

                  if (data.type === 'text') {
                    assistantText += data.text;
                    onStreamingUpdate([
                      { role: 'user', content: message },
                      { role: 'assistant', content: assistantText, isStreaming: true }
                    ]);
                  }
                } catch (error) {
                  console.error('[ChatInput] Error parsing SSE line:', error);
                }
              }
            }
          }
        }

        // Final update with complete response
        onStreamingUpdate([
          { role: 'user', content: message },
          { role: 'assistant', content: assistantText, isStreaming: false }
        ]);
      }

      onMessageSent();
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsStreaming(false);
    }
  };

  // Determine placeholder text
  let placeholder = 'Type a message...';
  if (!chatId) {
    placeholder = 'Select servers to start chatting';
  } else if (isConnecting) {
    placeholder = `Connecting to ${serverCount} server${serverCount !== 1 ? 's' : ''}...`;
  } else if (!allServersConnected) {
    placeholder = 'Waiting for all servers to connect...';
  }

  // Determine if input should be disabled
  let isDisabled = !chatId || isStreaming || !allServersConnected || isConnecting;

  // Get non-ready servers for empty state (only those with errors, not connecting)
  let nonReadyServers = selectedServers.filter(server => {
    let state = serverConnectionStates.get(server.serverUrl);
    return state === 'error';
  });

  // Only show empty state after initial connection attempt is done and we have errors
  let showEmptyState = !isConnecting && !isStreaming && chatId && nonReadyServers.length > 0;

  return (
    <>
      {showEmptyState && (
        <EmptyStateContainer>
          <EmptyStateTitle>
            <RiAlertLine size={16} />
            MCP Server Connections Required
          </EmptyStateTitle>
          <EmptyStateDescription>
            The following servers need to be set up before you can start chatting. Click
            &quot;Set Up&quot; to authenticate each server.
          </EmptyStateDescription>
          <ServerList>
            {nonReadyServers.map((server, index) => {
              let connectionState = serverConnectionStates.get(server.serverUrl);
              let hasConnection = !!server.connectionId;

              let statusText = 'Not authenticated';
              if (connectionState === 'connecting') {
                statusText = 'Connecting...';
              } else if (connectionState === 'error' && hasConnection) {
                statusText = 'Connection failed';
              } else if (connectionState === 'error' && !hasConnection) {
                statusText = 'Authentication required';
              }

              return (
                <ServerItem key={index}>
                  <ServerInfo>
                    <ServerName>{server.serverName}</ServerName>
                    <ServerUrl>{server.serverUrl}</ServerUrl>
                    <ServerStatus>{statusText}</ServerStatus>
                  </ServerInfo>
                  <SetupConnectionButton
                    onClick={() => onAuthenticate(server)}
                    disabled={connectionState === 'connecting'}
                  >
                    <RiShieldKeyholeLine size={14} />
                    {connectionState === 'connecting' ? 'Connecting...' : 'Set Up'}
                  </SetupConnectionButton>
                </ServerItem>
              );
            })}
          </ServerList>
        </EmptyStateContainer>
      )}
      <InputArea>
        <InputWrapper>
          <TextArea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={placeholder}
            disabled={isDisabled}
          />
          <SendButton onClick={handleSubmit} disabled={isDisabled || !input.trim()}>
            <RiSendPlane2Line size={18} />
            {isStreaming ? 'Sending...' : isConnecting ? 'Connecting...' : 'Send'}
          </SendButton>
        </InputWrapper>
      </InputArea>
    </>
  );
}

export default ChatInterface;
