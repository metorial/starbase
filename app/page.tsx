'use client';

import ChatInterface from '@/components/chat/ChatInterface';
import ServerDetail from '@/components/mcp/ServerDetail';
import { useNavigation } from '@/contexts/NavigationContext';
import { RiAddLine } from '@remixicon/react';
import styled from 'styled-components';

let EmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666666;
  padding: 40px;
  text-align: center;
  height: 100%;
`;

let EmptyTitle = styled.h3`
  font-size: 24px;
  font-weight: 600;
  color: #000000;
  margin: 0 0 12px 0;
`;

let EmptyDescription = styled.p`
  font-size: 14px;
  color: #666666;
  margin: 0 0 24px 0;
  max-width: 400px;
`;

let StartChatButton = styled.button`
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

let Home = () => {
  let { selectedSection, selectedChatId, setSelectedChatId, triggerRefresh } = useNavigation();

  let handleChatCreated = (chatId: string) => {
    setSelectedChatId(chatId);
    triggerRefresh();
  };

  let handleChatDeleted = () => {
    setSelectedChatId(null);
    triggerRefresh();
  };

  let handleNewChat = () => {
    setSelectedChatId('new');
  };

  // Render different content based on selected section
  if (selectedSection === 'chat') {
    return (
      <>
        {selectedChatId ? (
          <ChatInterface
            chatId={selectedChatId}
            onChatCreated={handleChatCreated}
            onChatDeleted={handleChatDeleted}
          />
        ) : (
          <EmptyState>
            <EmptyTitle>Welcome to Chat</EmptyTitle>
            <EmptyDescription>
              Connect to MCP servers and start a conversation with AI that can use tools and
              access resources.
            </EmptyDescription>
            <StartChatButton onClick={handleNewChat}>
              <RiAddLine size={18} />
              Start New Chat
            </StartChatButton>
          </EmptyState>
        )}
      </>
    );
  }

  // Default: show server detail for other sections
  return <ServerDetail />;
};

export default Home;
