import LayoutWrapper from '@/components/LayoutWrapper.server';
import type { Metadata } from 'next';
import './globals.css';
import StyledComponentsRegistry from './registry';

export const metadata: Metadata = {
  title: 'Starbase',
  description:
    'Connect to MCP servers and chat with AI agents that can use tools and access resources.'
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
