'use client';

import { useMCP } from '@/contexts/MCPContext';
import { mcpManager } from '@/lib/mcp-client';
import { RiPlayFill, RiQuestionLine } from '@remixicon/react';
import { useState } from 'react';
import styled from 'styled-components';

let Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

let PromptCard = styled.div`
  border: 1px solid #ccc;
  background: #ffffff;
`;

let PromptHeader = styled.button`
  width: 100%;
  padding: 16px;
  background: transparent;
  border: none;
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

let PromptIcon = styled.div`
  width: 36px;
  height: 36px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

let PromptInfo = styled.div`
  flex: 1;
`;

let PromptName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #000000;
`;

let PromptDescription = styled.div`
  font-size: 13px;
  color: #666666;
  margin-top: 2px;
`;

let PromptContent = styled.div`
  padding: 16px;
  border-top: 1px solid #ccc;
  background: #fafafa;
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
  margin-bottom: 12px;

  &:focus {
    outline: none;
    border-color: #000000;
  }
`;

let Button = styled.button`
  padding: 10px 16px;
  background: #000000;
  border: 1px solid #000000;
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 150ms;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: #333333;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

let Result = styled.div`
  margin-top: 16px;
  padding: 12px;
  background: #ffffff;
  border: 1px solid #ccc;
  font-size: 13px;
  font-family: 'Monaco', 'Courier New', monospace;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow-y: auto;
`;

let EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: #666666;
  font-size: 14px;
`;

let ArgumentBadge = styled.span<{ $required?: boolean }>`
  display: inline-block;
  padding: 2px 6px;
  background: ${props => (props.$required ? '#fef2f2' : '#f5f5f5')};
  border: 1px solid ${props => (props.$required ? '#991b1b' : '#ccc')};
  color: ${props => (props.$required ? '#991b1b' : '#666666')};
  font-size: 11px;
  font-weight: 500;
  margin-left: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

interface PromptsListProps {
  serverId: string;
}

let PromptsList = ({ serverId }: PromptsListProps) => {
  let { connection } = useMCP();
  let [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
  let [args, setArgs] = useState<Record<string, Record<string, string>>>({});
  let [loading, setLoading] = useState(false);
  let [result, setResult] = useState<Record<string, string | null>>({});

  let prompts = connection?.capabilities?.prompts || [];

  if (prompts.length === 0) {
    return <EmptyState>No prompts available for this server</EmptyState>;
  }

  let handleGet = async (promptName: string) => {
    setLoading(true);
    setResult(prev => ({ ...prev, [promptName]: null }));

    try {
      let response = await mcpManager.getPrompt(serverId, promptName, args[promptName] || {});
      setResult(prev => ({ ...prev, [promptName]: JSON.stringify(response, null, 2) }));
    } catch (error) {
      setResult(prev => ({
        ...prev,
        [promptName]: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
    } finally {
      setLoading(false);
    }
  };

  let updateArg = (promptName: string, argName: string, value: string) => {
    setArgs(prev => ({
      ...prev,
      [promptName]: {
        ...(prev[promptName] || {}),
        [argName]: value
      }
    }));
  };

  return (
    <Container>
      {prompts.map(prompt => (
        <PromptCard key={prompt.name}>
          <PromptHeader
            onClick={() =>
              setExpandedPrompt(expandedPrompt === prompt.name ? null : prompt.name)
            }
          >
            <PromptIcon>
              <RiQuestionLine size={18} color="#666666" />
            </PromptIcon>
            <PromptInfo>
              <PromptName>{prompt.name}</PromptName>
              {prompt.description && (
                <PromptDescription>{prompt.description}</PromptDescription>
              )}
            </PromptInfo>
          </PromptHeader>

          {expandedPrompt === prompt.name && (
            <PromptContent>
              {prompt.arguments && prompt.arguments.length > 0 ? (
                <>
                  {prompt.arguments.map(arg => (
                    <div key={arg.name}>
                      <Label>
                        {arg.name}
                        {arg.required && <ArgumentBadge $required>Required</ArgumentBadge>}
                        {arg.description && ` - ${arg.description}`}
                      </Label>
                      <Input
                        type="text"
                        value={args[prompt.name]?.[arg.name] || ''}
                        onChange={e => updateArg(prompt.name, arg.name, e.target.value)}
                        placeholder={arg.description || arg.name}
                      />
                    </div>
                  ))}
                  <Button onClick={() => handleGet(prompt.name)} disabled={loading}>
                    <RiPlayFill size={16} />
                    {loading ? 'Getting...' : 'Get Prompt'}
                  </Button>
                </>
              ) : (
                <Button onClick={() => handleGet(prompt.name)} disabled={loading}>
                  <RiPlayFill size={16} />
                  {loading ? 'Getting...' : 'Get Prompt'}
                </Button>
              )}

              {result[prompt.name] && <Result>{result[prompt.name]}</Result>}
            </PromptContent>
          )}
        </PromptCard>
      ))}
    </Container>
  );
};

export default PromptsList;
