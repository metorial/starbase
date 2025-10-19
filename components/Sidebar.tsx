'use client';

import { RiChat3Line, RiFolder2Line, RiHomeLine, RiSearchLine } from '@remixicon/react';
import { usePathname, useRouter } from 'next/navigation';
import styled from 'styled-components';

export type NavSection = 'home' | 'search' | 'folder' | 'chat';

let SidebarContainer = styled.aside`
  width: 70px;
  height: 100vh;
  background: #ffffff;
  border-right: 1px solid #ccc;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
  padding-bottom: 46px; /* Height of PoweredByBar */
  box-sizing: border-box;
`;

let NavItems = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px 0;
`;

let NavItem = styled.button<{ $active?: boolean }>`
  width: 100%;
  height: 60px;
  background: ${props => (props.$active ? '#f5f5f5' : 'transparent')};
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 150ms;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 24px;
    background: #000000;
    opacity: ${props => (props.$active ? 1 : 0)};
    transition: opacity 150ms;
  }

  &:hover {
    background: #f5f5f5;
  }

  &:active {
    background: #e5e5e5;
  }
`;

let BottomSection = styled.div`
  padding: 16px 0;
`;

interface SidebarProps {
  authComponent: React.ReactNode;
  selectedSection: NavSection;
  onSectionChange: (section: NavSection) => void;
}

let Sidebar = ({
  authComponent,
  selectedSection,
  onSectionChange
}: SidebarProps) => {
  let router = useRouter();
  let pathname = usePathname();

  let handleSectionClick = (section: NavSection) => {
    // Make sure we're on the root page
    if (pathname !== '/') {
      router.push('/');
    }
    onSectionChange(section);
  };

  return (
    <SidebarContainer>
      <NavItems>
        <NavItem
          aria-label="Home"
          $active={selectedSection === 'home' && pathname === '/'}
          onClick={() => handleSectionClick('home')}
        >
          <RiHomeLine size={20} color="#000000" />
        </NavItem>
        <NavItem
          aria-label="Chat"
          $active={selectedSection === 'chat' && pathname === '/'}
          onClick={() => handleSectionClick('chat')}
        >
          <RiChat3Line size={20} color="#000000" />
        </NavItem>
        <NavItem
          aria-label="Search"
          $active={selectedSection === 'search' && pathname === '/'}
          onClick={() => handleSectionClick('search')}
        >
          <RiSearchLine size={20} color="#000000" />
        </NavItem>
        <NavItem
          aria-label="Your Servers"
          $active={selectedSection === 'folder' && pathname === '/'}
          onClick={() => handleSectionClick('folder')}
        >
          <RiFolder2Line size={20} color="#000000" />
        </NavItem>
      </NavItems>
      <BottomSection>{authComponent}</BottomSection>
    </SidebarContainer>
  );
}

export default Sidebar;
