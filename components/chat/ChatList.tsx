'use client';

import { RiServerLine } from '@remixicon/react';
import { useEffect, useState } from 'react';
import styled from 'styled-components';

let Container = styled.div`
  flex: 1 1 auto;
  overflow-y: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

let ChatItem = styled.div<{ $active?: boolean }>`
  padding: 12px 16px;
  border-bottom: 1px solid #e5e5e5;
  cursor: pointer;
  background: ${props => (props.$active ? '#ffffff' : 'transparent')};
  transition: background 150ms;

  &:hover {
    background: ${props => (props.$active ? '#ffffff' : '#f5f5f5')};
  }
`;

let ChatName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #000000;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

let ChatPreview = styled.div`
  font-size: 13px;
  color: #666666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

let ChatMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  flex-wrap: wrap;
`;

let ServerBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background: #f0f9ff;
  border: 1px solid #0c4a6e;
  color: #0c4a6e;
  font-size: 11px;
  font-weight: 500;
  border-radius: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
`;

let EmptyState = styled.div`
  padding: 40px 16px;
  text-align: center;
  color: #666666;
  font-size: 14px;
`;

interface Chat {
  id: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
  messages: Array<{ role: string; content: string }>;
  servers: Array<{ serverName: string }>;
}

interface ChatListProps {
  selectedChatId: string | null;
  onChatSelect: (chatId: string) => void;
  refreshTrigger: number;
}

let ChatList = ({
  selectedChatId,
  onChatSelect,
  refreshTrigger
}: ChatListProps) => {
  let [chats, setChats] = useState<Chat[]>([]);
  let [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChats();
  }, [refreshTrigger]);

  let fetchChats = async () => {
    try {
      setLoading(true);
      let response = await fetch('/api/chats');
      if (response.ok) {
        let data = await response.json();
        setChats(data.chats);
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setLoading(false);
    }
  };

  let getChatName = (chat: Chat) => {
    if (chat.name) return chat.name;
    if (chat.messages.length > 0) {
      let firstMessage = chat.messages[0].content;
      return firstMessage.length > 50 ? firstMessage.substring(0, 50) + '...' : firstMessage;
    }
    return 'New Chat';
  };

  let getChatPreview = (chat: Chat) => {
    if (chat.messages.length === 0) return 'No messages yet';
    let lastMessage = chat.messages[0];
    return lastMessage.content;
  };

  if (loading) {
    return <EmptyState>Loading chats...</EmptyState>;
  }

  if (chats.length === 0) {
    return <EmptyState>No chats yet. Start a new conversation!</EmptyState>;
  }

  return (
    <Container>
      {chats.map(chat => (
        <ChatItem
          key={chat.id}
          $active={selectedChatId === chat.id}
          onClick={() => onChatSelect(chat.id)}
        >
          <ChatName>{getChatName(chat)}</ChatName>
          <ChatPreview>{getChatPreview(chat)}</ChatPreview>
          {chat.servers.length > 0 && (
            <ChatMeta>
              {chat.servers.map((server, index) => (
                <ServerBadge key={index}>
                  <RiServerLine size={12} />
                  {server.serverName}
                </ServerBadge>
              ))}
            </ChatMeta>
          )}
        </ChatItem>
      ))}
    </Container>
  );
};

export default ChatList;
