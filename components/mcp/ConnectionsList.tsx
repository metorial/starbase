'use client';

import { useState } from 'react';
import styled from 'styled-components';

interface Connection {
  id: string;
  serverUrl: string;
  serverName: string;
  displayName: string | null;
  authType: string;
  lastUsedAt: Date;
}

interface ConnectionsListProps {
  connections: Connection[];
  onConnectionClick: (connection: Connection) => void;
  onRenameConnection: (id: string, displayName: string | null) => Promise<void>;
}

let ConnectionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
`;

let ConnectionItem = styled.div<{ $isClickable?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e5e5e5;
  cursor: ${props => (props.$isClickable ? 'pointer' : 'default')};
  transition: all 0.2s ease;

  &:hover {
    ${props =>
      props.$isClickable &&
      `
      border-color: #000000;
      background: #f5f5f5;
    `}
  }
`;

let ConnectionInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`;

let ConnectionName = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: #000000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

let ConnectionUrl = styled.div`
  font-size: 14px;
  color: #666666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

let ConnectionMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #666666;
`;

let AuthBadge = styled.span<{ $authType: string }>`
  padding: 4px 8px;
  background: ${props =>
    props.$authType === 'oauth' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(139, 92, 246, 0.1)'};
  color: ${props => (props.$authType === 'oauth' ? '#3b82f6' : '#8b5cf6')};
  border-radius: 4px;
  font-weight: 500;
`;

let LastUsed = styled.span`
  white-space: nowrap;
`;

let EditButton = styled.button`
  padding: 6px 12px;
  background: transparent;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  color: #000000;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: #f5f5f5;
    border-color: #000000;
  }
`;

let EditInput = styled.input`
  padding: 8px 12px;
  background: #ffffff;
  border: 1px solid #000000;
  border-radius: 6px;
  color: #000000;
  font-size: 16px;
  font-weight: 500;
  flex: 1;
  min-width: 0;

  &:focus {
    outline: none;
    border-color: #000000;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
  }
`;

let EditActions = styled.div`
  display: flex;
  gap: 8px;
`;

let SaveButton = styled.button`
  padding: 6px 12px;
  background: #000000;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    opacity: 0.9;
  }
`;

let CancelButton = styled.button`
  padding: 6px 12px;
  background: transparent;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  color: #000000;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: #f5f5f5;
  }
`;

let EmptyState = styled.div`
  padding: 32px;
  text-align: center;
  color: #666666;
  font-size: 14px;
`;

let ConnectionsList = ({
  connections,
  onConnectionClick,
  onRenameConnection
}: ConnectionsListProps) => {
  let [editingId, setEditingId] = useState<string | null>(null);
  let [editValue, setEditValue] = useState('');

  let handleStartEdit = (connection: Connection, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(connection.id);
    setEditValue(connection.displayName || connection.serverName);
  };

  let handleSave = async (id: string, originalName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let trimmedValue = editValue.trim();

    // If empty or same as server name, set to null (use default)
    let newDisplayName =
      !trimmedValue || trimmedValue === originalName ? null : trimmedValue;

    await onRenameConnection(id, newDisplayName);
    setEditingId(null);
    setEditValue('');
  };

  let handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditValue('');
  };

  let formatLastUsed = (date: Date) => {
    let now = new Date();
    let diffMs = now.getTime() - new Date(date).getTime();
    let diffMins = Math.floor(diffMs / 60000);
    let diffHours = Math.floor(diffMs / 3600000);
    let diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Date(date).toLocaleDateString();
  };

  if (connections.length === 0) {
    return (
      <EmptyState>
        No saved connections yet. Connect to a server to save it for quick access.
      </EmptyState>
    );
  }

  return (
    <ConnectionsContainer>
      {connections.map(connection => {
        let isEditing = editingId === connection.id;
        let displayName = connection.displayName || connection.serverName;

        return (
          <ConnectionItem
            key={connection.id}
            onClick={() => !isEditing && onConnectionClick(connection)}
            $isClickable={!isEditing}
          >
            <ConnectionInfo>
              {isEditing ? (
                <EditInput
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleSave(connection.id, connection.serverName, e as any);
                    } else if (e.key === 'Escape') {
                      handleCancel(e as any);
                    }
                  }}
                  autoFocus
                  placeholder="Connection name"
                />
              ) : (
                <>
                  <ConnectionName>{displayName}</ConnectionName>
                  <ConnectionUrl>{connection.serverUrl}</ConnectionUrl>
                </>
              )}
            </ConnectionInfo>

            <ConnectionMeta>
              {!isEditing && (
                <>
                  <AuthBadge $authType={connection.authType}>
                    {connection.authType === 'oauth' ? 'OAuth' : 'Custom Headers'}
                  </AuthBadge>
                  <LastUsed>{formatLastUsed(connection.lastUsedAt)}</LastUsed>
                </>
              )}

              {isEditing ? (
                <EditActions>
                  <SaveButton
                    onClick={e => handleSave(connection.id, connection.serverName, e)}
                  >
                    Save
                  </SaveButton>
                  <CancelButton onClick={handleCancel}>Cancel</CancelButton>
                </EditActions>
              ) : (
                <EditButton onClick={e => handleStartEdit(connection, e)}>Rename</EditButton>
              )}
            </ConnectionMeta>
          </ConnectionItem>
        );
      })}
    </ConnectionsContainer>
  );
}

export default ConnectionsList;
