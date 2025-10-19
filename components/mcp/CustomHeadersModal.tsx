'use client';

import type { AuthChallenge, CustomHeaders } from '@/types/mcp';
import * as Dialog from '@radix-ui/react-dialog';
import { RiAddLine, RiCloseLine, RiDeleteBinLine } from '@remixicon/react';
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

let HeaderRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  margin-bottom: 12px;
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

let IconButton = styled.button`
  background: transparent;
  border: 1px solid #ccc;
  cursor: pointer;
  color: #666666;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms;

  &:hover {
    background: #f5f5f5;
    border-color: #000000;
    color: #000000;
  }

  &.delete:hover {
    background: #fef2f2;
    border-color: #991b1b;
    color: #991b1b;
  }
`;

let Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 10px 16px;
  background: ${props => (props.$variant === 'primary' ? '#000000' : '#ffffff')};
  border: 1px solid #000000;
  color: ${props => (props.$variant === 'primary' ? '#ffffff' : '#000000')};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms;
  width: 100%;
  margin-top: 16px;

  &:hover {
    background: ${props => (props.$variant === 'primary' ? '#333333' : '#f5f5f5')};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

let InfoMessage = styled.div`
  padding: 12px;
  background: #fef9f0;
  border: 1px solid #92400e;
  color: #92400e;
  font-size: 13px;
  margin-bottom: 16px;
  line-height: 1.5;
`;

let ErrorMessage = styled.div`
  padding: 12px;
  background: #fef2f2;
  border: 1px solid #991b1b;
  color: #991b1b;
  font-size: 13px;
  margin-bottom: 16px;
`;

let AddButton = styled.button`
  padding: 10px 16px;
  background: #ffffff;
  border: 1px solid #000000;
  color: #000000;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;

  &:hover {
    background: #f5f5f5;
  }
`;

interface CustomHeadersModalProps {
  open: boolean;
  onClose: () => void;
  authChallenge: AuthChallenge;
  serverName: string;
  serverUrl: string;
  serverTransport: 'sse' | 'streamable_http';
  onAuth: (headers: CustomHeaders) => void;
}

let CustomHeadersModal = ({
  open,
  onClose,
  authChallenge,
  serverName,
  serverUrl,
  serverTransport,
  onAuth
}: CustomHeadersModalProps) => {
  let [headers, setHeaders] = useState<Array<{ key: string; value: string }>>([
    { key: 'Authorization', value: 'Bearer ' }
  ]);
  let [error, setError] = useState<string | null>(null);

  let addHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  let removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  let updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    let newHeaders = [...headers];
    newHeaders[index][field] = value;
    setHeaders(newHeaders);
  };

  let handleSubmit = async () => {
    setError(null);

    // Validate headers
    let invalidHeaders = headers.filter(h => !h.key.trim() || !h.value.trim());
    if (invalidHeaders.length > 0) {
      setError('All header fields must have both a key and value');
      return;
    }

    // Convert to CustomHeaders format
    let customHeaders: CustomHeaders = {};
    headers.forEach(h => {
      customHeaders[h.key.trim()] = h.value.trim();
    });

    // Save connection for quick reconnect
    try {
      await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverUrl,
          serverName,
          authType: 'custom_headers',
          headers: customHeaders,
          transport: serverTransport
        })
      });
    } catch (saveErr) {
      console.error('[CustomHeaders] Failed to save connection:', saveErr);
      // Continue anyway - connection will work, just won't be saved
    }

    onAuth(customHeaders);
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Overlay />
        <Content>
          <Header>
            <Title>Custom Authentication Headers</Title>
            <Dialog.Close asChild>
              <CloseButton>
                <RiCloseLine size={20} />
              </CloseButton>
            </Dialog.Close>
          </Header>

          <Body>
            <InfoMessage>
              {serverName} requires custom authentication headers.
              {authChallenge.realm && ` Realm: ${authChallenge.realm}`}
              <br />
              Enter the necessary headers below (e.g., Authorization, API-Key).
            </InfoMessage>

            {error && <ErrorMessage>{error}</ErrorMessage>}

            {headers.map((header, index) => (
              <HeaderRow key={index}>
                <div>
                  {index === 0 && <Label>Header Name</Label>}
                  <Input
                    type="text"
                    value={header.key}
                    onChange={e => updateHeader(index, 'key', e.target.value)}
                    placeholder="e.g., Authorization"
                  />
                </div>
                <div>
                  {index === 0 && <Label>Header Value</Label>}
                  <Input
                    type="text"
                    value={header.value}
                    onChange={e => updateHeader(index, 'value', e.target.value)}
                    placeholder="e.g., Bearer YOUR_TOKEN"
                  />
                </div>
                <div style={{ paddingTop: index === 0 ? '28px' : '0' }}>
                  <IconButton
                    type="button"
                    className="delete"
                    onClick={() => removeHeader(index)}
                    disabled={headers.length === 1}
                  >
                    <RiDeleteBinLine size={18} />
                  </IconButton>
                </div>
              </HeaderRow>
            ))}

            <AddButton onClick={addHeader}>
              <RiAddLine size={18} />
              Add Header
            </AddButton>

            <Button $variant="primary" onClick={handleSubmit}>
              Connect with Custom Headers
            </Button>
          </Body>
        </Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default CustomHeadersModal;
