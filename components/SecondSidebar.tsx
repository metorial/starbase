'use client';

import { useMCP } from '@/contexts/MCPContext';
import mcpServersData from '@/data/mcp-servers.json';
import type { MCPServer } from '@/types/mcp';
import { RiAddLine, RiServerLine } from '@remixicon/react';
import Fuse from 'fuse.js';
import { useMemo, useState } from 'react';
import styled from 'styled-components';
import ChatList from './chat/ChatList';
import AddServerModal from './mcp/AddServerModal';
import type { NavSection } from './Sidebar';

let SecondSidebarContainer = styled.aside`
  width: 400px;
  height: 100vh;
  background: #ffffff;
  border-right: 1px solid #ccc;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 70px;
  top: 0;
  z-index: 99;
  overflow: hidden;
  padding-bottom: 46px; /* Height of PoweredByBar */
  box-sizing: border-box;
`;

let Header = styled.div`
  padding: 24px;
  border-bottom: 1px solid #ccc;
  flex-shrink: 0;
`;

let Title = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #000000;
  line-height: 1.4;
`;

let Description = styled.p`
  margin: 4px 0 0 0;
  font-size: 13px;
  color: #666666;
  line-height: 1.5;
`;

let Content = styled.div`
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  min-height: 0;
`;

let ServerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

let ServerItem = styled.button<{ $active?: boolean }>`
  width: 100%;
  padding: 12px;
  background: ${props => (props.$active ? '#f5f5f5' : '#ffffff')};
  border: 1px solid ${props => (props.$active ? '#000000' : '#ccc')};
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: background-color 150ms;

  &:hover {
    background: #f5f5f5;
  }
`;

let ServerIcon = styled.div`
  width: 36px;
  height: 36px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

let ServerInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

let ServerName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #000000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

let ServerDescription = styled.div`
  font-size: 12px;
  color: #666666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
`;

let CategoryBadge = styled.span`
  display: inline-block;
  padding: 2px 6px;
  background: #f5f5f5;
  border: 1px solid #ccc;
  font-size: 10px;
  color: #666666;
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

let AddButton = styled.button`
  width: 100%;
  padding: 12px;
  background: #000000;
  border: 1px solid #000000;
  color: #ffffff;
  text-align: center;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 150ms;
  margin-bottom: 16px;

  &:hover {
    background: #333333;
  }
`;

let ChatAddButton = styled(AddButton)`
  width: calc(100% - 32px);
  margin: 16px;
  margin-bottom: 0;
  flex-shrink: 0;
`;

let ChatListWrapper = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

let SearchInput = styled.input`
  width: 100%;
  padding: 12px;
  background: #ffffff;
  border: 1px solid #ccc;
  font-size: 14px;
  font-family: inherit;
  margin-bottom: 16px;

  &:focus {
    outline: none;
    border-color: #000000;
  }

  &::placeholder {
    color: #999999;
  }
`;

let EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: #666666;
  font-size: 14px;
`;

interface SecondSidebarProps {
  section: NavSection;
  selectedChatId?: string | null;
  onChatSelect?: (chatId: string) => void;
  refreshTrigger?: number;
  onNewChat?: () => void;
}

let SecondSidebar = ({
  section,
  selectedChatId,
  onChatSelect,
  refreshTrigger = 0,
  onNewChat
}: SecondSidebarProps) => {
  let [searchQuery, setSearchQuery] = useState('');
  let [showAddModal, setShowAddModal] = useState(false);
  let { selectedServer, selectServer, customServers, createCustomServer } = useMCP();

  // Get all servers from JSON data
  let allServers = mcpServersData.servers as MCPServer[];

  // Get top 10 most recent servers (by created_at)
  let topServers = useMemo(() => {
    return [...allServers]
      .filter(s => s.isPopular)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [allServers]);

  // Configure Fuse.js for fuzzy search
  let fuse = useMemo(() => {
    return new Fuse(allServers, {
      keys: ['name', 'description', 'domain'],
      threshold: 0.3,
      includeScore: true
    });
  }, [allServers]);

  // Get search results
  let searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return allServers;
    }
    return fuse.search(searchQuery).map(result => result.item);
  }, [searchQuery, fuse, allServers]);

  let renderContent = () => {
    switch (section) {
      case 'chat':
        return (
          <>
            <Header>
              <Title>Chats</Title>
              <Description>Your conversation history</Description>
            </Header>
            <Content style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
              <ChatAddButton onClick={onNewChat}>
                <RiAddLine size={18} />
                New Chat
              </ChatAddButton>
              <ChatListWrapper>
                <ChatList
                  selectedChatId={selectedChatId || null}
                  onChatSelect={onChatSelect || (() => {})}
                  refreshTrigger={refreshTrigger}
                />
              </ChatListWrapper>
            </Content>
          </>
        );

      case 'home':
        return (
          <>
            <Header>
              <Title>MCP Servers</Title>
              <Description>Browse and explore popular MCP servers</Description>
            </Header>
            <Content>
              <AddButton onClick={() => setShowAddModal(true)}>
                <RiAddLine size={18} />
                Add New Server
              </AddButton>
              <ServerList>
                {topServers.map(server => (
                  <ServerItem
                    key={server.id}
                    $active={selectedServer?.id === server.id}
                    onClick={() => selectServer(server)}
                  >
                    <ServerIcon>
                      <RiServerLine size={18} color="#666666" />
                    </ServerIcon>
                    <ServerInfo>
                      <ServerName>{server.name}</ServerName>
                      <ServerDescription>
                        {server.description || server.domain}
                      </ServerDescription>
                      <CategoryBadge>{server.category}</CategoryBadge>
                    </ServerInfo>
                  </ServerItem>
                ))}
              </ServerList>
            </Content>
          </>
        );

      case 'search':
        return (
          <>
            <Header>
              <Title>Search MCP Servers</Title>
              <Description>
                Find servers by name or description ({allServers.length} total)
              </Description>
            </Header>
            <Content>
              <SearchInput
                type="text"
                placeholder="Search servers..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchResults.length > 0 ? (
                <ServerList>
                  {searchResults.map(server => (
                    <ServerItem
                      key={server.id}
                      $active={selectedServer?.id === server.id}
                      onClick={() => selectServer(server)}
                    >
                      <ServerIcon>
                        <RiServerLine size={18} color="#666666" />
                      </ServerIcon>
                      <ServerInfo>
                        <ServerName>{server.name}</ServerName>
                        <ServerDescription>
                          {server.description || server.domain}
                        </ServerDescription>
                        <CategoryBadge>{server.category}</CategoryBadge>
                      </ServerInfo>
                    </ServerItem>
                  ))}
                </ServerList>
              ) : (
                <EmptyState>No servers found matching &quot;{searchQuery}&quot;</EmptyState>
              )}
            </Content>
          </>
        );

      case 'folder':
        return (
          <>
            <Header>
              <Title>My Servers</Title>
              <Description>MCP servers you&apos;ve configured</Description>
            </Header>
            <Content>
              <AddButton onClick={() => setShowAddModal(true)}>
                <RiAddLine size={18} />
                Add Server
              </AddButton>
              {customServers.length > 0 ? (
                <ServerList>
                  {customServers.map(server => (
                    <ServerItem
                      key={server.id}
                      $active={selectedServer?.id === server.id}
                      onClick={() => selectServer(server)}
                    >
                      <ServerIcon>
                        <RiServerLine size={18} color="#666666" />
                      </ServerIcon>
                      <ServerInfo>
                        <ServerName>{server.name}</ServerName>
                        <ServerDescription>
                          {server.description || server.domain}
                        </ServerDescription>
                        <CategoryBadge>{server.category}</CategoryBadge>
                      </ServerInfo>
                    </ServerItem>
                  ))}
                </ServerList>
              ) : (
                <EmptyState>
                  No servers configured yet.
                  <br />
                  Add your first server to get started.
                </EmptyState>
              )}
            </Content>
          </>
        );

      default:
        return null;
    }
  };

  let handleSaveServer = async (
    server: Omit<
      MCPServer,
      'id' | 'status' | 'publication_status' | 'created_at' | 'domain' | 'provider'
    >
  ) => {
    await createCustomServer(server);
  };

  return (
    <>
      <SecondSidebarContainer>{renderContent()}</SecondSidebarContainer>

      <AddServerModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleSaveServer}
      />
    </>
  );
};

export default SecondSidebar;
