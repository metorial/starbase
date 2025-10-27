import LayoutWrapper from '@/components/LayoutWrapper.server';
import type { Metadata } from 'next';
import './globals.css';
import StyledComponentsRegistry from './registry';

export let metadata: Metadata = {
  title: 'Starbase by Metorial',
  description:
    'Connect to MCP servers and chat with AI agents that can use tools and access resources.',
  twitter: {
    card: 'summary_large_image',
    title: 'Starbase by Metorial',
    description:
      'Connect to MCP servers and chat with AI agents that can use tools and access resources.',
    site: '@metorialAi',
    creator: '@metorialAi'
  },
  openGraph: {
    title: 'Starbase by Metorial',
    description:
      'Connect to MCP servers and chat with AI agents that can use tools and access resources.',
    type: 'website'
  }
};

let RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <body>
        <StyledComponentsRegistry>
          <LayoutWrapper>{children}</LayoutWrapper>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
};

export default RootLayout;
