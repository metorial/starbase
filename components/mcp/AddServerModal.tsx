'use client';

import type { MCPServer } from '@/types/mcp';
import * as Dialog from '@radix-ui/react-dialog';
import { RiCloseLine } from '@remixicon/react';
import { useState } from 'react';
import styled from 'styled-components';

let Overlay = styled(Dialog.Overlay)`
  background: rgba(0, 0, 0, 0.5);
  position: fixed;
  inset: 0;
  z-index: 1000;

  &[data-state='open'] {
    animation: fadeIn 150ms;
  }

  &[data-state='closed'] {
    animation: fadeOut 150ms;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes fadeOut {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
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
  overflow-y: auto;
  z-index: 1001;

  &[data-state='open'] {
    animation: slideIn 150ms;
  }

  &[data-state='closed'] {
    animation: slideOut 150ms;
  }

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

  @keyframes slideOut {
    from {
      opacity: 1;
      transform: translate(-50%, -50%);
    }
    to {
      opacity: 0;
      transform: translate(-50%, -48%);
    }
  }
`;

let Header = styled.div`
  padding: 24px;
  border-bottom: 1px solid #ccc;
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  justify-content: center;

  &:hover {
    color: #000000;
  }
`;

let Body = styled.div`
  padding: 24px;
`;

let FormGroup = styled.div`
  margin-bottom: 20px;
`;

let Label = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #000000;
  margin-bottom: 6px;
`;

let Input = styled.input`
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  font-size: 14px;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: #000000;
  }
`;

let TextArea = styled.textarea`
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  font-size: 14px;
  font-family: inherit;
  min-height: 80px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #000000;
  }
`;

let Select = styled.select`
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  font-size: 14px;
  font-family: inherit;
  background: white;

  &:focus {
    outline: none;
    border-color: #000000;
  }
`;

let ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
`;

let Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: 10px 16px;
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

let ErrorMessage = styled.div`
  padding: 12px;
  background: #fef2f2;
  border: 1px solid #991b1b;
  color: #991b1b;
  font-size: 13px;
  margin-bottom: 16px;
`;

interface AddServerModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (
    server: Omit<
      MCPServer,
      'id' | 'status' | 'publication_status' | 'created_at' | 'domain' | 'provider'
    >
  ) => Promise<void>;
  editingServer?: MCPServer | null;
}

let AddServerModal = ({ open, onClose, onSave, editingServer }: AddServerModalProps) => {
  let [name, setName] = useState(editingServer?.name || '');
  let [url, setUrl] = useState(editingServer?.url || '');
  let [description, setDescription] = useState(editingServer?.description || '');
  let [category, setCategory] = useState(editingServer?.category || 'Custom');
  let [transport, setTransport] = useState<'sse' | 'streamable_http'>(
    editingServer?.transport || 'streamable_http'
  );
  let [error, setError] = useState<string | null>(null);
  let [loading, setLoading] = useState(false);

  let handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError('Server name is required');
      return;
    }

    if (!url.trim()) {
      setError('Server URL is required');
      return;
    }

    try {
      new URL(url);
    } catch {
      setError('Invalid URL format');
      return;
    }

    setLoading(true);

    try {
      await onSave({
        name: name.trim(),
        url: url.trim(),
        description: description.trim(),
        category,
        transport
      });

      // Reset form and close
      setName('');
      setUrl('');
      setDescription('');
      setCategory('Custom');
      setTransport('streamable_http');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Overlay />
        <Content>
          <Header>
            <Title>{editingServer ? 'Edit Server' : 'Add Custom Server'}</Title>
            <Dialog.Close asChild>
              <CloseButton>
                <RiCloseLine size={20} />
              </CloseButton>
            </Dialog.Close>
          </Header>

          <Body>
            <form onSubmit={handleSubmit}>
              {error && <ErrorMessage>{error}</ErrorMessage>}

              <FormGroup>
                <Label htmlFor="name">Server Name *</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., My Custom MCP Server"
                  disabled={loading}
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="url">Server URL *</Label>
                <Input
                  id="url"
                  type="text"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="e.g., https://api.example.com/mcp"
                  disabled={loading}
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="description">Description</Label>
                <TextArea
                  id="description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Optional description of what this server provides"
                  disabled={loading}
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  type="text"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="e.g., Custom, Development, Productivity"
                  disabled={loading}
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="transport">Transport Protocol *</Label>
                <Select
                  id="transport"
                  value={transport}
                  onChange={e => setTransport(e.target.value as 'sse' | 'streamable_http')}
                  disabled={loading}
                >
                  <option value="streamable_http">Streamable HTTP</option>
                  <option value="sse">Server-Sent Events (SSE)</option>
                </Select>
              </FormGroup>

              <ButtonGroup>
                <Button type="button" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" $variant="primary" disabled={loading}>
                  {loading ? 'Saving...' : editingServer ? 'Update Server' : 'Add Server'}
                </Button>
              </ButtonGroup>
            </form>
          </Body>
        </Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default AddServerModal;
