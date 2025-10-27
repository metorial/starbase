'use client';

import { MCPProvider } from '@/contexts/MCPContext';
import { NavigationProvider, useNavigation } from '@/contexts/NavigationContext';
import styled from 'styled-components';
import SecondSidebar from './SecondSidebar';
import Sidebar from './Sidebar';

interface LayoutWrapperClientProps {
  children: React.ReactNode;
  authComponent: React.ReactNode;
}

let LayoutContainer = styled.div`
  display: flex;
  height: 100vh;
  overflow: hidden;
  padding-bottom: 46px;
`;

let MainContent = styled.main`
  flex: 1;
  margin-left: 470px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
`;

let PoweredByBar = styled.a`
  background: #000000;
  color: #ffffff;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 500;
  border-top: 1px solid #333333;
  flex-shrink: 0;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
`;

let MetorialLogo = styled.svg`
  width: 18px;
  height: 22px;
  flex-shrink: 0;
`;

let LayoutContent = ({ children, authComponent }: LayoutWrapperClientProps) => {
  let {
    selectedSection,
    setSelectedSection,
    selectedChatId,
    setSelectedChatId,
    refreshTrigger
  } = useNavigation();

  let handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId);
  };

  let handleNewChat = () => {
    setSelectedChatId('new');
  };

  return (
    <LayoutContainer>
      <Sidebar
        authComponent={authComponent}
        selectedSection={selectedSection}
        onSectionChange={setSelectedSection}
      />
      <SecondSidebar
        section={selectedSection}
        selectedChatId={selectedChatId}
        onChatSelect={handleChatSelect}
        refreshTrigger={refreshTrigger}
        onNewChat={handleNewChat}
      />
      <MainContent>{children}</MainContent>
      <PoweredByBar href="https://metorial.com" target="_blank" rel="noopener">
        From
        <MetorialLogo
          width="45"
          height="56"
          viewBox="0 0 45 56"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M22.12 0L44.24 44.24L38.36 56L22.12 20.5L5.88 56L0 44.24L22.12 0Z"
            fill="white"
          />
        </MetorialLogo>
        Metorial
      </PoweredByBar>
    </LayoutContainer>
  );
};

let LayoutWrapperClient = ({ children, authComponent }: LayoutWrapperClientProps) => {
  return (
    <NavigationProvider>
      <MCPProvider>
        <LayoutContent authComponent={authComponent}>{children}</LayoutContent>
      </MCPProvider>
    </NavigationProvider>
  );
};

export default LayoutWrapperClient;
