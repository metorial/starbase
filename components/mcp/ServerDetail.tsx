'use client';

import { useMCP } from '@/contexts/MCPContext';
import { createAuthHeaders } from '@/lib/mcp-auth';
import type { CustomHeaders } from '@/types/mcp';
import {
  RiArrowDownSLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiLinkM,
  RiLoader4Line,
  RiRefreshLine
} from '@remixicon/react';
import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import ConnectionsList from './ConnectionsList';
import CustomHeadersModal from './CustomHeadersModal';
import OAuthModal from './OAuthModal';
import PromptsList from './PromptsList';
import ResourcesList from './ResourcesList';
import ToolsList from './ToolsList';

let Container = styled.div`
  padding: 40px;
  max-width: 1200px;
  height: 100%;
  overflow-y: auto;
`;

let Header = styled.div`
  margin-bottom: 32px;
`;

let TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
`;

let Title = styled.h1`
  font-size: 32px;
  font-weight: 700;
  color: #000000;
  margin: 0;
`;

let StatusBadge = styled.div<{ $status: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: ${props => {
    switch (props.$status) {
      case 'connected':
        return '#f0f9ff';
      case 'connecting':
        return '#fef9f0';
      case 'auth_required':
        return '#fef9f0';
      case 'error':
        return '#fef2f2';
      default:
        return '#f5f5f5';
    }
  }};
  border: 1px solid
    ${props => {
      switch (props.$status) {
        case 'connected':
          return '#0c4a6e';
        case 'connecting':
          return '#92400e';
        case 'auth_required':
          return '#92400e';
        case 'error':
          return '#991b1b';
        default:
          return '#ccc';
      }
    }};
  color: ${props => {
    switch (props.$status) {
      case 'connected':
        return '#0c4a6e';
      case 'connecting':
        return '#92400e';
      case 'auth_required':
        return '#92400e';
      case 'error':
        return '#991b1b';
      default:
        return '#666';
    }
  }};
  font-size: 13px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

let Domain = styled.div`
  font-size: 14px;
  color: #666666;
  font-family: 'Monaco', 'Courier New', monospace;
`;

let ServerMetadata = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
`;

let MetadataBadge = styled.div<{ $variant?: 'auth' | 'transport' | 'category' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: ${props => {
    switch (props.$variant) {
      case 'auth':
        return '#f0f9ff';
      case 'transport':
        return '#fef9f0';
      case 'category':
        return '#f5f5f5';
      default:
        return '#f5f5f5';
    }
  }};
  border: 1px solid
    ${props => {
      switch (props.$variant) {
        case 'auth':
          return '#0c4a6e';
        case 'transport':
          return '#92400e';
        case 'category':
          return '#ccc';
        default:
          return '#ccc';
      }
    }};
  color: ${props => {
    switch (props.$variant) {
      case 'auth':
        return '#0c4a6e';
      case 'transport':
        return '#92400e';
      case 'category':
        return '#666';
      default:
        return '#666';
    }
  }};
  font-size: 12px;
  font-weight: 500;
`;

let Actions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 16px;
`;

let Button = styled.button<{ $variant?: 'primary' | 'danger' }>`
  padding: 10px 16px;
  background: ${props =>
    props.$variant === 'primary'
      ? '#000000'
      : props.$variant === 'danger'
      ? '#ffffff'
      : '#ffffff'};
  border: 1px solid ${props => (props.$variant === 'danger' ? '#991b1b' : '#000000')};
  color: ${props =>
    props.$variant === 'primary'
      ? '#ffffff'
      : props.$variant === 'danger'
      ? '#991b1b'
      : '#000000'};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: ${props =>
      props.$variant === 'primary'
        ? '#333333'
        : props.$variant === 'danger'
        ? '#fef2f2'
        : '#f5f5f5'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

let Tabs = styled.div`
  display: flex;
  gap: 0;
  border-bottom: 1px solid #ccc;
  margin-bottom: 24px;
`;

let Tab = styled.button<{ $active?: boolean }>`
  padding: 12px 24px;
  background: ${props => (props.$active ? '#ffffff' : 'transparent')};
  border: none;
  border-bottom: 2px solid ${props => (props.$active ? '#000000' : 'transparent')};
  color: ${props => (props.$active ? '#000000' : '#666666')};
  font-size: 14px;
  font-weight: ${props => (props.$active ? 600 : 400)};
  cursor: pointer;
  transition: all 150ms;

  &:hover {
    color: #000000;
  }
`;

let EmptyState = styled.div`
  text-align: center;
  padding: 64px 24px;
  color: #666666;
  font-size: 14px;
`;

let NoConnectionsState = styled.div`
  padding: 32px 24px;
  background: #fafafa;
  border: 1px solid #e5e5e5;
  text-align: center;
  margin-bottom: 32px;
`;

let NoConnectionsIcon = styled.div`
  width: 48px;
  height: 48px;
  background: #f5f5f5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  color: #999999;
`;

let NoConnectionsTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #000000;
  margin: 0 0 8px 0;
`;

let NoConnectionsDescription = styled.p`
  font-size: 14px;
  color: #666666;
  margin: 0;
  line-height: 1.5;
`;

let ConnectionsSection = styled.div`
  margin-bottom: 32px;
`;

let SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: #000000;
  margin-bottom: 16px;
`;

let CollapsibleHeader = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0;
  margin-bottom: 16px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  font-weight: 600;
  color: #000000;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.7;
  }
`;

let CollapseIcon = styled.span<{ $expanded: boolean }>`
  display: inline-flex;
  transition: transform 0.2s ease;
  transform: ${props => (props.$expanded ? 'rotate(180deg)' : 'rotate(0deg)')};
`;

type TabType = 'tools' | 'resources' | 'prompts';

let ServerDetail = () => {
  let { selectedServer, connection, connect, disconnect, refreshCapabilities } = useMCP();
  let [activeTab, setActiveTab] = useState<TabType>('tools');
  let [loading, setLoading] = useState(false);
  let [connections, setConnections] = useState<any[]>([]);
  let [loadingConnections, setLoadingConnections] = useState(false);
  let [showOAuthModal, setShowOAuthModal] = useState(false);
  let [showHeadersModal, setShowHeadersModal] = useState(false);
  let [connectionsExpanded, setConnectionsExpanded] = useState(true);

  let loadConnections = useCallback(async () => {
    setLoadingConnections(true);
    try {
      let response = await fetch('/api/connections');
      if (response.ok) {
        let data = await response.json();
        setConnections(data.connections || []);
      }
    } catch (error) {
      console.error('Failed to load connections:', error);
      setConnections([]);
    } finally {
      setLoadingConnections(false);
    }
  }, []);

  // Load connections on mount
  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  // Auto-collapse connections when connected
  useEffect(() => {
    if (connection?.status === 'connected') {
      setConnectionsExpanded(false);
    } else {
      setConnectionsExpanded(true);
    }
  }, [connection?.status]);

  let handleConnectionClick = async (conn: any) => {
    setLoading(true);
    try {
      // First, fetch the full connection data including transport
      let response = await fetch(`/api/connections/${conn.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch connection');
      }

      let data = await response.json();
      let { credentials, authType, transport } = data.connection;

      // Create a server object from the connection
      let server = {
        id: conn.serverUrl,
        name: conn.displayName || conn.serverName,
        description: '',
        domain: new URL(conn.serverUrl).hostname,
        category: 'Saved',
        url: conn.serverUrl,
        provider: '',
        transport: (transport || 'sse') as 'sse' | 'streamable_http',
        status: 'active' as const,
        publication_status: 'private' as const,
        created_at: new Date().toISOString()
      };

      // Connect with saved credentials
      let headers;
      if (authType === 'oauth') {
        headers = createAuthHeaders('bearer', credentials.accessToken);
      } else {
        headers = createAuthHeaders('custom', undefined, credentials.headers);
      }

      let result = await connect(server, headers);

      // If auth failed, try without auth
      if (result?.status === 'auth_required' || result?.status === 'error') {
        let noAuthResult = await connect(server);

        // If still requires auth, show the auth modal
        if (noAuthResult?.status === 'auth_required' && noAuthResult.authChallenge) {
          setLoading(false);
          if (noAuthResult.authChallenge.type === 'oauth') {
            setShowOAuthModal(true);
          } else {
            setShowHeadersModal(true);
          }
          return;
        }
      }
    } catch (error) {
      console.error('Connection failed:', error);
      // Silent failure - don't show error to user
    } finally {
      setLoading(false);
    }
  };

  let handleRenameConnection = async (id: string, displayName: string | null) => {
    try {
      let response = await fetch(`/api/connections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName })
      });

      if (response.ok) {
        // Reload connections to get updated list
        await loadConnections();
      }
    } catch (error) {
      console.error('Failed to rename connection:', error);
    }
  };

  if (!selectedServer) {
    return (
      <Container>
        <EmptyState>Select a server from the sidebar to view its capabilities</EmptyState>
      </Container>
    );
  }

  // Filter connections for the currently selected server
  let serverConnections = connections.filter(conn => conn.serverUrl === selectedServer.url);

  let handleConnect = async () => {
    if (!selectedServer) return;

    setLoading(true);
    try {
      // First, check if we have a saved connection for this server
      if (serverConnections.length > 0) {
        // Use the most recent connection (first in the list)
        let savedConn = serverConnections[0];

        let response = await fetch(`/api/connections/${savedConn.id}`);
        if (response.ok) {
          let data = await response.json();
          let { credentials, authType } = data.connection;

          let headers;
          if (authType === 'oauth') {
            headers = createAuthHeaders('bearer', credentials.accessToken);
          } else {
            headers = createAuthHeaders('custom', undefined, credentials.headers);
          }

          let result = await connect(selectedServer, headers);

          // If auth failed with saved credentials, try without auth
          if (result?.status === 'auth_required' || result?.status === 'error') {
            let conn = await connect(selectedServer);

            // Check if auth is required after no-auth attempt
            if (conn?.status === 'auth_required' && conn.authChallenge) {
              setLoading(false);
              if (conn.authChallenge.type === 'oauth') {
                setShowOAuthModal(true);
              } else {
                setShowHeadersModal(true);
              }
              return;
            }
          }
          return;
        }
      }

      // No saved connection, try without auth
      let conn = await connect(selectedServer);

      // Check if auth is required after connection attempt
      if (conn?.status === 'auth_required' && conn.authChallenge) {
        if (conn.authChallenge.type === 'oauth') {
          setShowOAuthModal(true);
        } else {
          setShowHeadersModal(true);
        }
      }
    } catch (error) {
      console.error('Connection failed:', error);
      // Silent failure - don't show error or prompt for auth
    } finally {
      setLoading(false);
    }
  };

  let handleOAuthSuccess = async (accessToken: string) => {
    if (!selectedServer) return;

    let headers = createAuthHeaders('bearer', accessToken);
    setShowOAuthModal(false);
    setLoading(true);
    try {
      await connect(selectedServer, headers);
      // Reload connections to show the newly saved connection
      await loadConnections();
    } finally {
      setLoading(false);
    }
  };

  let handleCustomHeaders = async (customHeaders: CustomHeaders) => {
    if (!selectedServer) return;

    let headers = createAuthHeaders('custom', undefined, customHeaders);
    setShowHeadersModal(false);
    setLoading(true);
    try {
      await connect(selectedServer, headers);
      // Reload connections to show the newly saved connection
      await loadConnections();
    } finally {
      setLoading(false);
    }
  };

  let handleDisconnect = async () => {
    setLoading(true);
    try {
      await disconnect(selectedServer.id);
    } finally {
      setLoading(false);
    }
  };

  let handleRefresh = async () => {
    if (connection && connection.status === 'connected') {
      setLoading(true);
      try {
        await refreshCapabilities(selectedServer.id);
      } finally {
        setLoading(false);
      }
    }
  };

  let getStatusIcon = () => {
    if (!connection) return null;

    switch (connection.status) {
      case 'connected':
        return <RiCheckboxCircleLine size={16} />;
      case 'connecting':
        return <RiLoader4Line size={16} className="spin" />;
      case 'error':
        return <RiCloseCircleLine size={16} />;
      default:
        return null;
    }
  };

  let getStatusText = () => {
    if (!connection) return 'Not Connected';
    return connection.status;
  };

  let toolsCount = connection?.capabilities?.tools?.length || 0;
  let resourcesCount =
    (connection?.capabilities?.resources?.length || 0) +
    (connection?.capabilities?.resourceTemplates?.length || 0);
  let promptsCount = connection?.capabilities?.prompts?.length || 0;

  return (
    <Container>
      <Header>
        <TitleRow>
          <Title>{selectedServer.name}</Title>
          <StatusBadge $status={connection?.status || 'disconnected'}>
            {getStatusIcon()}
            {getStatusText()}
          </StatusBadge>
        </TitleRow>
        <Domain>{selectedServer.url}</Domain>

        <ServerMetadata>
          <MetadataBadge $variant="category">{selectedServer.category}</MetadataBadge>
          <MetadataBadge $variant="transport">
            {selectedServer.transport.toUpperCase()}
          </MetadataBadge>
        </ServerMetadata>

        <Actions>
          {!connection ||
          connection.status === 'disconnected' ||
          connection.status === 'error' ||
          connection.status === 'auth_required' ? (
            <Button $variant="primary" onClick={handleConnect} disabled={loading}>
              {loading ? 'Connecting...' : 'Connect'}
            </Button>
          ) : (
            <>
              <Button onClick={handleRefresh} disabled={loading}>
                <RiRefreshLine size={16} />
                Refresh
              </Button>
              <Button $variant="danger" onClick={handleDisconnect} disabled={loading}>
                Disconnect
              </Button>
            </>
          )}
        </Actions>
      </Header>

      {serverConnections.length > 0 ? (
        <ConnectionsSection>
          <CollapsibleHeader onClick={() => setConnectionsExpanded(!connectionsExpanded)}>
            <span>Previous Connections ({serverConnections.length})</span>
            <CollapseIcon $expanded={connectionsExpanded}>
              <RiArrowDownSLine size={24} />
            </CollapseIcon>
          </CollapsibleHeader>
          {connectionsExpanded && (
            <ConnectionsList
              connections={serverConnections}
              onConnectionClick={handleConnectionClick}
              onRenameConnection={handleRenameConnection}
            />
          )}
        </ConnectionsSection>
      ) : (
        (!connection || connection.status === 'disconnected') && (
          <NoConnectionsState>
            <NoConnectionsIcon>
              <RiLinkM size={24} />
            </NoConnectionsIcon>
            <NoConnectionsTitle>No Previous Connections</NoConnectionsTitle>
            <NoConnectionsDescription>
              You haven&apos;t connected to this server yet. Click the &quot;Connect&quot;
              button above to establish your first connection.
            </NoConnectionsDescription>
          </NoConnectionsState>
        )
      )}

      {connection && connection.status === 'connected' && (
        <>
          <Tabs>
            <Tab $active={activeTab === 'tools'} onClick={() => setActiveTab('tools')}>
              Tools ({toolsCount})
            </Tab>
            <Tab $active={activeTab === 'resources'} onClick={() => setActiveTab('resources')}>
              Resources ({resourcesCount})
            </Tab>
            <Tab $active={activeTab === 'prompts'} onClick={() => setActiveTab('prompts')}>
              Prompts ({promptsCount})
            </Tab>
          </Tabs>

          {activeTab === 'tools' && <ToolsList serverId={selectedServer.id} />}
          {activeTab === 'resources' && <ResourcesList serverId={selectedServer.id} />}
          {activeTab === 'prompts' && <PromptsList serverId={selectedServer.id} />}
        </>
      )}

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>

      {connection?.authChallenge && (
        <>
          <OAuthModal
            open={showOAuthModal}
            onClose={() => setShowOAuthModal(false)}
            authChallenge={connection.authChallenge}
            serverName={selectedServer.name}
            serverUrl={selectedServer.url}
            serverTransport={selectedServer.transport}
            onAuth={handleOAuthSuccess}
          />

          <CustomHeadersModal
            open={showHeadersModal}
            onClose={() => setShowHeadersModal(false)}
            authChallenge={connection.authChallenge}
            serverName={selectedServer.name}
            serverUrl={selectedServer.url}
            serverTransport={selectedServer.transport}
            onAuth={handleCustomHeaders}
          />
        </>
      )}
    </Container>
  );
};

export default ServerDetail;
