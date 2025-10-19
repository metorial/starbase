'use client';

import { useMCP } from '@/contexts/MCPContext';
import { mcpManager } from '@/lib/mcp-client';
import { RiPlayFill, RiToolsLine } from '@remixicon/react';
import { useState } from 'react';
import styled from 'styled-components';

let Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

let ToolCard = styled.div`
  border: 1px solid #ccc;
  background: #ffffff;
`;

let ToolHeader = styled.button`
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

let ToolIcon = styled.div`
  width: 36px;
  height: 36px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

let ToolInfo = styled.div`
  flex: 1;
`;

let ToolName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #000000;
`;

let ToolDescription = styled.div`
  font-size: 13px;
  color: #666666;
  margin-top: 2px;
`;

let ToolContent = styled.div`
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

let TextArea = styled.textarea`
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  font-size: 14px;
  font-family: inherit;
  margin-bottom: 12px;
  min-height: 80px;
  resize: vertical;

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

interface ToolsListProps {
  serverId: string;
}

let ToolsList = ({ serverId }: ToolsListProps) => {
  let { connection } = useMCP();
  let [expandedTool, setExpandedTool] = useState<string | null>(null);
  let [args, setArgs] = useState<Record<string, any>>({});
  let [loading, setLoading] = useState(false);
  let [result, setResult] = useState<string | null>(null);

  let tools = connection?.capabilities?.tools || [];

  if (tools.length === 0) {
    return <EmptyState>No tools available for this server</EmptyState>;
  }

  let handleCall = async (toolName: string) => {
    setLoading(true);
    setResult(null);

    try {
      let response = await mcpManager.callTool(serverId, toolName, args[toolName] || {});
      setResult(JSON.stringify(response, null, 2));
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  let renderInputField = (toolName: string, propName: string, propSchema: any) => {
    let key = `${toolName}.${propName}`;
    let value = args[toolName]?.[propName] || '';

    let updateArg = (val: any) => {
      setArgs(prev => ({
        ...prev,
        [toolName]: {
          ...(prev[toolName] || {}),
          [propName]: val
        }
      }));
    };

    if (propSchema.type === 'string') {
      if (propSchema.enum) {
        return (
          <div key={key}>
            <Label>
              {propName} {propSchema.description && `- ${propSchema.description}`}
            </Label>
            <Input as="select" value={value} onChange={e => updateArg(e.target.value)}>
              <option value="">Select...</option>
              {propSchema.enum.map((opt: string) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Input>
          </div>
        );
      }
      return (
        <div key={key}>
          <Label>
            {propName} {propSchema.description && `- ${propSchema.description}`}
          </Label>
          <Input
            type="text"
            value={value}
            onChange={e => updateArg(e.target.value)}
            placeholder={propSchema.description || propName}
          />
        </div>
      );
    }

    if (propSchema.type === 'number' || propSchema.type === 'integer') {
      return (
        <div key={key}>
          <Label>
            {propName} {propSchema.description && `- ${propSchema.description}`}
          </Label>
          <Input
            type="number"
            value={value}
            onChange={e => updateArg(Number(e.target.value))}
            placeholder={propSchema.description || propName}
          />
        </div>
      );
    }

    if (propSchema.type === 'boolean') {
      return (
        <div key={key}>
          <Label>
            <input
              type="checkbox"
              checked={!!value}
              onChange={e => updateArg(e.target.checked)}
            />{' '}
            {propName} {propSchema.description && `- ${propSchema.description}`}
          </Label>
        </div>
      );
    }

    if (propSchema.type === 'object' || propSchema.type === 'array') {
      return (
        <div key={key}>
          <Label>
            {propName} (JSON) {propSchema.description && `- ${propSchema.description}`}
          </Label>
          <TextArea
            value={typeof value === 'string' ? value : JSON.stringify(value || {}, null, 2)}
            onChange={e => {
              try {
                updateArg(JSON.parse(e.target.value));
              } catch {
                updateArg(e.target.value);
              }
            }}
            placeholder={`Enter JSON for ${propName}`}
          />
        </div>
      );
    }

    return (
      <div key={key}>
        <Label>{propName}</Label>
        <Input type="text" value={value} onChange={e => updateArg(e.target.value)} />
      </div>
    );
  };

  return (
    <Container>
      {tools.map(tool => (
        <ToolCard key={tool.name}>
          <ToolHeader
            onClick={() => setExpandedTool(expandedTool === tool.name ? null : tool.name)}
          >
            <ToolIcon>
              <RiToolsLine size={18} color="#666666" />
            </ToolIcon>
            <ToolInfo>
              <ToolName>{tool.name}</ToolName>
              {tool.description && <ToolDescription>{tool.description}</ToolDescription>}
            </ToolInfo>
          </ToolHeader>

          {expandedTool === tool.name && (
            <ToolContent>
              {tool.inputSchema?.properties &&
              Object.keys(tool.inputSchema.properties).length > 0 ? (
                <>
                  {Object.entries(tool.inputSchema.properties).map(
                    ([propName, propSchema]: [string, any]) =>
                      renderInputField(tool.name, propName, propSchema)
                  )}
                  <Button onClick={() => handleCall(tool.name)} disabled={loading}>
                    <RiPlayFill size={16} />
                    {loading ? 'Calling...' : 'Call Tool'}
                  </Button>
                </>
              ) : (
                <Button onClick={() => handleCall(tool.name)} disabled={loading}>
                  <RiPlayFill size={16} />
                  {loading ? 'Calling...' : 'Call Tool'}
                </Button>
              )}

              {result && <Result>{result}</Result>}
            </ToolContent>
          )}
        </ToolCard>
      ))}
    </Container>
  );
};

export default ToolsList;
