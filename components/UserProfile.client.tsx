'use client';

import type { PublicUser } from '@/lib/presenters/user';
import * as Avatar from '@radix-ui/react-avatar';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { RiLogoutBoxLine } from '@remixicon/react';
import { signOut } from 'next-auth/react';
import styled from 'styled-components';

let ProfileButton = styled.button`
  width: 100%;
  height: 60px;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 10px;
`;

let DropdownContent = styled(DropdownMenu.Content)`
  min-width: 200px;
  background: #ffffff;
  border: 1px solid #ccc;
  padding: 8px;
  z-index: 1002;

  &[data-state='open'] {
    animation: slideUpAndFade 300ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  &[data-state='closed'] {
    animation: slideDownAndFade 300ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes slideUpAndFade {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideDownAndFade {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(10px);
    }
  }
`;

let DropdownItem = styled(DropdownMenu.Item)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
  border: none;
  background: transparent;
  width: 100%;
  font-size: 14px;
  color: #000000;
  outline: none;

  &:hover {
    background: #f5f5f5;
  }

  &:focus {
    background: #f5f5f5;
  }
`;

let DropdownLabel = styled(DropdownMenu.Label)`
  padding: 8px 12px;
  font-size: 12px;
  color: #666666;
  border-bottom: 1px solid #e5e5e5;
  margin-bottom: 4px;
`;

let Separator = styled(DropdownMenu.Separator)`
  height: 1px;
  background: #e5e5e5;
  margin: 4px 0;
`;

interface UserProfileProps {
  user: PublicUser;
}

let UserProfile = ({ user }: UserProfileProps) => {
  let initials =
    user.name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ||
    user.email?.[0].toUpperCase() ||
    '?';

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <ProfileButton aria-label="User menu">
          <Avatar.Root className="AvatarRoot">
            <Avatar.Image
              className="AvatarImage"
              src={user.image || undefined}
              alt={user.name || 'User'}
            />
            <Avatar.Fallback className="AvatarFallback">{initials}</Avatar.Fallback>
          </Avatar.Root>
        </ProfileButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownContent align="start" sideOffset={5} alignOffset={10}>
          <DropdownLabel>
            {user.name || user.email?.split('@')[0] || 'User'}

            <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
              {user.email}
            </div>
          </DropdownLabel>
          <Separator />
          <DropdownItem onClick={() => signOut()}>
            <RiLogoutBoxLine size={14} />
            Sign out
          </DropdownItem>
        </DropdownContent>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default UserProfile;
