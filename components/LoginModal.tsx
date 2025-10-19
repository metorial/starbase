'use client';

import * as Dialog from '@radix-ui/react-dialog';
import {
  RiCloseLine,
  RiGithubFill,
  RiGoogleFill,
  RiLoginCircleLine,
  RiMailLine
} from '@remixicon/react';
import { signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';
import styled from 'styled-components';

let Trigger = styled.button`
  width: 69px;
  height: 60px;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 150ms;

  &:hover {
    background: #f5f5f5;
  }

  &:active {
    background: #e5e5e5;
  }
`;

let DialogTitle = styled(Dialog.Title)`
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #000000;
  margin-bottom: 8px;
`;

let DialogDescription = styled(Dialog.Description)`
  margin-bottom: 32px;
  color: #666666;
  font-size: 14px;
  line-height: 1.5;
`;

let CloseButton = styled(Dialog.Close)`
  position: absolute;
  top: 16px;
  right: 16px;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 150ms;

  &:hover {
    background: #f5f5f5;
  }
`;

let ProvidersContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

let ProviderButton = styled.button`
  width: 100%;
  height: 48px;
  background: #ffffff;
  border: 1px solid #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
  transition: all 150ms;

  &:hover {
    background: #f5f5f5;
  }

  &:active {
    background: #e5e5e5;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

let Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0;
  color: #666666;
  font-size: 14px;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #ccc;
  }
`;

let EmailForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

let EmailInput = styled.input`
  width: 100%;
  height: 48px;
  padding: 0 16px;
  background: #ffffff;
  border: 1px solid #ccc;
  font-size: 15px;
  font-family: inherit;
  transition: border-color 150ms;

  &:focus {
    outline: none;
    border-color: #000000;
  }

  &::placeholder {
    color: #999999;
  }
`;

let StatusMessage = styled.div<{ $type: 'success' | 'error' }>`
  padding: 12px;
  background: ${props => (props.$type === 'success' ? '#f0f9ff' : '#fef2f2')};
  border: 1px solid ${props => (props.$type === 'success' ? '#ccc' : '#ccc')};
  color: ${props => (props.$type === 'success' ? '#0c4a6e' : '#991b1b')};
  font-size: 14px;
  line-height: 1.5;
`;

let LoginModal = () => {
  let [open, setOpen] = useState(false);
  let [loading, setLoading] = useState(false);
  let [email, setEmail] = useState('');
  let [emailSent, setEmailSent] = useState(false);
  let [error, setError] = useState('');
  let [useMetorialAuth, setUseMetorialAuth] = useState<boolean | null>(null);
  let [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Check if Metorial OAuth is configured on mount
    checkMetorialAuth();
  }, []);

  let checkMetorialAuth = async () => {
    setCheckingAuth(true);
    try {
      let response = await fetch('/api/metorial/check');
      if (response.ok) {
        let data = await response.json();
        setUseMetorialAuth(data.configured);
      } else {
        setUseMetorialAuth(false);
      }
    } catch (err) {
      console.error('[LoginModal] Failed to check Metorial auth:', err);
      setUseMetorialAuth(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  let handleTriggerClick = (e: React.MouseEvent) => {
    // Prevent opening modal while checking
    if (checkingAuth) {
      e.preventDefault();
      return;
    }

    // If Metorial auth is configured, redirect immediately
    if (useMetorialAuth) {
      e.preventDefault();
      window.location.href = '/api/metorial/auth';
    } else {
      // Otherwise open the modal (Dialog.Trigger handles this)
      setOpen(true);
    }
  };

  let handleSignIn = async (provider: 'github' | 'google') => {
    setLoading(true);
    setError('');
    try {
      await signIn(provider, { callbackUrl: '/' });
    } catch (error) {
      console.error('Sign in error:', error);
      setError('Failed to sign in. Please try again.');
      setLoading(false);
    }
  };

  let handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError('');
    setEmailSent(false);

    try {
      let result = await signIn('resend', {
        email,
        redirect: false
      });

      if (result?.error) {
        setError('Failed to send email. Please try again.');
      } else {
        setEmailSent(true);
        setEmail('');
      }
    } catch (error) {
      console.error('Email sign in error:', error);
      setError('Failed to send email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open && !useMetorialAuth} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Trigger
          aria-label="Sign in"
          onClick={handleTriggerClick}
          disabled={checkingAuth}
          style={{ opacity: checkingAuth ? 0.5 : 1, cursor: checkingAuth ? 'not-allowed' : 'pointer' }}
        >
          <RiLoginCircleLine size={20} color="#000000" />
        </Trigger>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay" />
        <Dialog.Content className="DialogContent">
          <DialogTitle>Sign in to Starbase</DialogTitle>
          <DialogDescription>
            Choose your preferred authentication method to continue.
          </DialogDescription>

          {error && <StatusMessage $type="error">{error}</StatusMessage>}
          {emailSent && (
            <StatusMessage $type="success">
              Check your email! We sent you a magic link to sign in.
            </StatusMessage>
          )}

          <EmailForm onSubmit={handleEmailSignIn}>
            <EmailInput
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              required
            />
            <ProviderButton type="submit" disabled={loading || !email}>
              <RiMailLine size={18} />
              Send magic link
            </ProviderButton>
          </EmailForm>

          <Divider>or</Divider>

          <ProvidersContainer>
            <ProviderButton
              onClick={() => handleSignIn('github')}
              disabled={loading}
              type="button"
            >
              <RiGithubFill size={18} />
              Continue with GitHub
            </ProviderButton>
            <ProviderButton
              onClick={() => handleSignIn('google')}
              disabled={loading}
              type="button"
            >
              <RiGoogleFill size={18} />
              Continue with Google
            </ProviderButton>
          </ProvidersContainer>
          <CloseButton>
            <RiCloseLine size={18} color="#000000" />
          </CloseButton>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default LoginModal;
