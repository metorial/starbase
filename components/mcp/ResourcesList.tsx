'use client';

import { useMCP } from '@/contexts/MCPContext';
import { mcpManager } from '@/lib/mcp-client';
import { RiEyeLine, RiFileCodeLine, RiFileTextLine } from '@remixicon/react';
import { useState } from 'react';
import styled from 'styled-components';

let Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

let ResourceCard = styled.div`
  border: 1px solid #ccc;
  background: #ffffff;
`;

let ResourceHeader = styled.button`
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

let ResourceIcon = styled.div`
  width: 36px;
  height: 36px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

let ResourceInfo = styled.div`
  flex: 1;
`;

let ResourceName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #000000;
`;

let ResourceDescription = styled.div`
  font-size: 13px;
  color: #666666;
  margin-top: 2px;
`;

let ResourceUri = styled.div`
  font-size: 12px;
  color: #999999;
  font-family: 'Monaco', 'Courier New', monospace;
  margin-top: 2px;
`;

let ResourceContent = styled.div`
  padding: 16px;
  border-top: 1px solid #ccc;
  background: #fafafa;
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

let MimeType = styled.div`
  display: inline-block;
  padding: 4px 8px;
  background: #f5f5f5;
  border: 1px solid #ccc;
  font-size: 12px;
  font-family: 'Monaco', 'Courier New', monospace;
  color: #666666;
  margin-bottom: 12px;
`;

let SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #000000;
  margin: 0 0 12px 0;
  padding-top: 12px;

  &:first-child {
    padding-top: 0;
  }
`;

let TemplateBadge = styled.div`
  display: inline-block;
  padding: 2px 6px;
  background: #f0f9ff;
  border: 1px solid #0c4a6e;
  color: #0c4a6e;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-left: 8px;
`;

interface ResourcesListProps {
  serverId: string;
}

let ResourcesList = ({ serverId }: ResourcesListProps) => {
  let { connection } = useMCP();
  let [expandedResource, setExpandedResource] = useState<string | null>(null);
  let [loading, setLoading] = useState(false);
  let [result, setResult] = useState<Record<string, string | null>>({});

  let resources = connection?.capabilities?.resources || [];
  let resourceTemplates = connection?.capabilities?.resourceTemplates || [];

  if (resources.length === 0 && resourceTemplates.length === 0) {
    return (
      <EmptyState>No resources or resource templates available for this server</EmptyState>
    );
  }

  let handleRead = async (uri: string) => {
    setLoading(true);
    setResult(prev => ({ ...prev, [uri]: null }));

    try {
      let response = await mcpManager.readResource(serverId, uri);
      setResult(prev => ({ ...prev, [uri]: JSON.stringify(response, null, 2) }));
    } catch (error) {
      setResult(prev => ({
        ...prev,
        [uri]: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      {resources.length > 0 && (
        <>
          <SectionTitle>Resources ({resources.length})</SectionTitle>
          {resources.map(resource => (
            <ResourceCard key={resource.uri}>
              <ResourceHeader
                onClick={() =>
                  setExpandedResource(expandedResource === resource.uri ? null : resource.uri)
                }
              >
                <ResourceIcon>
                  <RiFileTextLine size={18} color="#666666" />
                </ResourceIcon>
                <ResourceInfo>
                  <ResourceName>{resource.name || resource.uri}</ResourceName>
                  {resource.description && (
                    <ResourceDescription>{resource.description}</ResourceDescription>
                  )}
                  <ResourceUri>{resource.uri}</ResourceUri>
                </ResourceInfo>
              </ResourceHeader>

              {expandedResource === resource.uri && (
                <ResourceContent>
                  {resource.mimeType && <MimeType>{resource.mimeType}</MimeType>}

                  <Button onClick={() => handleRead(resource.uri)} disabled={loading}>
                    <RiEyeLine size={16} />
                    {loading ? 'Reading...' : 'Read Resource'}
                  </Button>

                  {result[resource.uri] && <Result>{result[resource.uri]}</Result>}
                </ResourceContent>
              )}
            </ResourceCard>
          ))}
        </>
      )}

      {resourceTemplates.length > 0 && (
        <>
          <SectionTitle>Resource Templates ({resourceTemplates.length})</SectionTitle>
          {resourceTemplates.map(template => (
            <ResourceCard key={template.uriTemplate}>
              <ResourceHeader
                onClick={() =>
                  setExpandedResource(
                    expandedResource === template.uriTemplate ? null : template.uriTemplate
                  )
                }
              >
                <ResourceIcon>
                  <RiFileCodeLine size={18} color="#0c4a6e" />
                </ResourceIcon>
                <ResourceInfo>
                  <ResourceName>
                    {template.name}
                    <TemplateBadge>Template</TemplateBadge>
                  </ResourceName>
                  {template.description && (
                    <ResourceDescription>{template.description}</ResourceDescription>
                  )}
                  <ResourceUri>{template.uriTemplate}</ResourceUri>
                </ResourceInfo>
              </ResourceHeader>

              {expandedResource === template.uriTemplate && (
                <ResourceContent>
                  {template.mimeType && <MimeType>{template.mimeType}</MimeType>}
                  <ResourceDescription style={{ fontStyle: 'italic', marginTop: 0 }}>
                    This is a resource template. Replace parameters in the URI template to read
                    specific resources.
                  </ResourceDescription>
                </ResourceContent>
              )}
            </ResourceCard>
          ))}
        </>
      )}
    </Container>
  );
};

export default ResourcesList;
