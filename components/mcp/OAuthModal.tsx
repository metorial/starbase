'use client';

import {
  buildAuthorizationUrl,
  exchangeCodeForToken,
  fetchOAuthDiscovery,
  generateCodeChallenge,
  generateCodeVerifier,
  registerOAuthClient,
  supportsClientRegistration,
  supportsPKCE
} from '@/lib/mcp-auth';
import type { AuthChallenge } from '@/types/mcp';
import * as Dialog from '@radix-ui/react-dialog';
import { RiCloseLine } from '@remixicon/react';
import { useEffect, useState } from 'react';
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
  max-width: 500px;
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
  margin-bottom: 16px;

  &:focus {
    outline: none;
    border-color: #000000;
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
  background: #f0f9ff;
  border: 1px solid #0c4a6e;
  color: #0c4a6e;
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

interface OAuthModalProps {
  open: boolean;
  onClose: () => void;
  authChallenge: AuthChallenge;
  serverName: string;
  serverUrl: string;
  serverTransport: 'sse' | 'streamable_http';
  onAuth: (accessToken: string) => void;
}

let OAuthModal = ({
  open,
  onClose,
  authChallenge,
  serverName,
  serverUrl,
  serverTransport,
  onAuth
}: OAuthModalProps) => {
  let [loading, setLoading] = useState(false);
  let [error, setError] = useState<string | null>(null);
  let [autoRegSupported, setAutoRegSupported] = useState(false);
  let [clientId, setClientId] = useState('');
  let [clientSecret, setClientSecret] = useState('');
  let [hasExistingRegistration, setHasExistingRegistration] = useState(false);
  let [registrationAge, setRegistrationAge] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      // Reset state when modal opens
      setError(null);
      setLoading(false);
      setClientId('');
      setClientSecret('');
      setHasExistingRegistration(false);
      setRegistrationAge(null);

      // Check if Metorial OAuth is configured
      // Fall back to standard OAuth flow
      if (authChallenge.discoveryUrl) {
        checkExistingRegistration();
      } else {
        // No discovery URL, fall back to manual mode
        setAutoRegSupported(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, authChallenge.discoveryUrl]);

  let checkExistingRegistration = async () => {
    if (!authChallenge.discoveryUrl) {
      return;
    }

    try {
      // Check for existing registration
      let response = await fetch(
        `/api/oauth/registration?serverUrl=${encodeURIComponent(
          serverUrl
        )}&discoveryUrl=${encodeURIComponent(authChallenge.discoveryUrl)}`
      );

      if (response.ok) {
        let data = await response.json();

        if (data.registration) {
          setHasExistingRegistration(true);
          setClientId(data.registration.clientId);
          setClientSecret(data.registration.clientSecret || '');

          // Calculate age in days
          let ageMs = Date.now() - new Date(data.registration.createdAt).getTime();
          let ageDays = ageMs / (1000 * 60 * 60 * 24);
          setRegistrationAge(ageDays);

          // Still check if auto-registration is supported (for UI info)
          checkAutoRegistration();
          return;
        }
      }

      // No existing registration, check auto-registration support
      checkAutoRegistration();
    } catch (err) {
      console.error('[OAuth] Failed to check existing registration:', err);
      // Fall back to checking auto-registration
      checkAutoRegistration();
    }
  };

  let checkAutoRegistration = async () => {
    if (!authChallenge.discoveryUrl) {
      return;
    }

    try {
      let discovery = await fetchOAuthDiscovery(authChallenge.discoveryUrl, serverUrl);
      let supported = supportsClientRegistration(discovery);
      setAutoRegSupported(supported);
    } catch (err) {
      console.error('[OAuth] Failed to check auto registration:', err);
      setError('Failed to fetch OAuth discovery document. Please try manual authentication.');
    }
  };

  let handleMetorialAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      // Open Metorial OAuth popup
      let authUrl = `${window.location.origin}/api/metorial/auth`;
      window.open(authUrl, 'metorial-oauth', 'width=600,height=700');

      // Listen for Metorial OAuth callback
      window.addEventListener('message', handleMetorialCallback);
    } catch (err) {
      console.error('[OAuth] Metorial auth failed:', err);
      setError(err instanceof Error ? err.message : 'Metorial authentication failed');
      setLoading(false);
    }
  };

  let handleMetorialCallback = async (event: MessageEvent) => {
    if (event.data.type === 'metorial_oauth_success' && event.data.accessToken) {
      window.removeEventListener('message', handleMetorialCallback);

      try {
        // Save connection for quick reconnect
        await fetch('/api/connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serverUrl,
            serverName,
            authType: 'oauth',
            accessToken: event.data.accessToken,
            refreshToken: null,
            transport: serverTransport
          })
        });

        onAuth(event.data.accessToken);
        onClose();
      } catch (err) {
        console.error('[OAuth] Failed to save Metorial connection:', err);
        setError(err instanceof Error ? err.message : 'Failed to save connection');
      } finally {
        setLoading(false);
      }
    }
  };

  let handleAutoRegister = async () => {
    if (!authChallenge.discoveryUrl) {
      setError('No discovery URL available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let discovery = await fetchOAuthDiscovery(authChallenge.discoveryUrl, serverUrl);

      if (!discovery.registration_endpoint) {
        throw new Error('Server does not support dynamic client registration');
      }

      // Register client
      let clientData = await registerOAuthClient(discovery.registration_endpoint, {
        client_name: `Starbase - ${serverName}`,
        redirect_uris: [window.location.origin + '/oauth/callback'],
        grant_types: ['authorization_code'],
        response_types: ['code'],
        scope: authChallenge.scope
      });

      // Save registration to database
      try {
        await fetch('/api/oauth/registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serverUrl,
            discoveryUrl: authChallenge.discoveryUrl,
            clientId: clientData.client_id,
            clientSecret: clientData.client_secret
          })
        });
      } catch (saveErr) {
        console.error('[OAuth] Failed to save registration:', saveErr);
        // Continue anyway - worst case, we'll re-register next time
      }

      // Start OAuth flow with new credentials
      let state = Math.random().toString(36).substring(7);

      let codeVerifier: string | undefined;
      let codeChallenge: string | undefined;

      if (supportsPKCE(discovery)) {
        codeVerifier = generateCodeVerifier();
        codeChallenge = await generateCodeChallenge(codeVerifier);
      }

      let authUrl = buildAuthorizationUrl(
        discovery.authorization_endpoint,
        clientData.client_id,
        window.location.origin + '/oauth/callback',
        authChallenge.scope,
        state,
        codeChallenge,
        'S256'
      );

      // Store client credentials for later token exchange
      sessionStorage.setItem(
        `oauth_${serverName}`,
        JSON.stringify({
          clientId: clientData.client_id,
          clientSecret: clientData.client_secret,
          tokenEndpoint: discovery.token_endpoint,
          state,
          codeVerifier
        })
      );

      // Open OAuth popup
      window.open(authUrl, 'oauth', 'width=600,height=700');

      // Listen for OAuth callback
      window.addEventListener('message', handleOAuthCallback);
    } catch (err) {
      console.error('[OAuth] Auto-registration failed:', err);
      setError(err instanceof Error ? err.message : 'Auto-registration failed');
    } finally {
      setLoading(false);
    }
  };

  let handleManualAuth = async () => {
    if (!clientId) {
      setError('Please enter a Client ID');
      return;
    }

    if (!authChallenge.discoveryUrl) {
      setError('Discovery URL not provided');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let discovery = await fetchOAuthDiscovery(authChallenge.discoveryUrl, serverUrl);

      // Save registration to database if it's new (not already existing)
      if (!hasExistingRegistration) {
        try {
          await fetch('/api/oauth/registration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              serverUrl,
              discoveryUrl: authChallenge.discoveryUrl,
              clientId,
              clientSecret
            })
          });
        } catch (saveErr) {
          console.error('[OAuth] Failed to save registration:', saveErr);
          // Continue anyway
        }
      }

      let state = Math.random().toString(36).substring(7);

      let codeVerifier: string | undefined;
      let codeChallenge: string | undefined;

      if (supportsPKCE(discovery)) {
        codeVerifier = generateCodeVerifier();
        codeChallenge = await generateCodeChallenge(codeVerifier);
      }

      let authUrl = buildAuthorizationUrl(
        discovery.authorization_endpoint,
        clientId,
        window.location.origin + '/oauth/callback',
        authChallenge.scope,
        state,
        codeChallenge,
        'S256'
      );

      // Store client credentials
      sessionStorage.setItem(
        `oauth_${serverName}`,
        JSON.stringify({
          clientId,
          clientSecret,
          tokenEndpoint: discovery.token_endpoint,
          state,
          codeVerifier
        })
      );

      // Open OAuth popup
      window.open(authUrl, 'oauth', 'width=600,height=700');

      // Listen for OAuth callback
      window.addEventListener('message', handleOAuthCallback);
    } catch (err) {
      console.error('[OAuth] Manual auth failed:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  let handleOAuthCallback = async (event: MessageEvent) => {
    if (event.data.type === 'oauth_code' && event.data.code) {
      window.removeEventListener('message', handleOAuthCallback);

      try {
        let oauthData = JSON.parse(sessionStorage.getItem(`oauth_${serverName}`) || '{}');

        if (!oauthData.tokenEndpoint) {
          throw new Error('Token endpoint not found');
        }

        let tokenData = await exchangeCodeForToken(
          oauthData.tokenEndpoint,
          event.data.code,
          oauthData.clientId,
          oauthData.clientSecret,
          window.location.origin + '/oauth/callback',
          oauthData.codeVerifier
        );

        // Save connection for quick reconnect
        try {
          await fetch('/api/connections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              serverUrl,
              serverName,
              authType: 'oauth',
              accessToken: tokenData.access_token,
              refreshToken: tokenData.refresh_token || null,
              transport: serverTransport
            })
          });
        } catch (saveErr) {
          console.error('[OAuth] Failed to save connection:', saveErr);
          // Continue anyway - connection will work, just won't be saved
        }

        // Clean up session storage
        sessionStorage.removeItem(`oauth_${serverName}`);

        onAuth(tokenData.access_token);
        onClose();
      } catch (err) {
        console.error('[OAuth] Token exchange failed:', err);
        setError(err instanceof Error ? err.message : 'Token exchange failed');
      }
    } else if (event.data.type === 'oauth_error') {
      console.error('[OAuth] OAuth error:', event.data.error);
      window.removeEventListener('message', handleOAuthCallback);
      setError(event.data.error || 'OAuth authentication failed');
    }
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('message', handleOAuthCallback);
      window.removeEventListener('message', handleMetorialCallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Overlay />
        <Content>
          <Header>
            <Title>OAuth Authentication Required</Title>
            <Dialog.Close asChild>
              <CloseButton>
                <RiCloseLine size={20} />
              </CloseButton>
            </Dialog.Close>
          </Header>

          <Body>
            <InfoMessage>
              {serverName} requires OAuth authentication to connect.
              {authChallenge.scope && ` Requested scopes: ${authChallenge.scope}`}
            </InfoMessage>

            {/* {hasExistingRegistration && registrationAge !== null && (
                  <InfoMessage>
                    Using cached OAuth registration (created {registrationAge.toFixed(1)} days ago).
                    {registrationAge > 6 && ' Will be renewed on next registration.'}
                  </InfoMessage>
                )} */}

            {error && <ErrorMessage>{error}</ErrorMessage>}

            {hasExistingRegistration ? (
              <>
                {/* <InfoMessage>
                      Using stored credentials. Click below to authenticate with {serverName}.
                    </InfoMessage> */}
                <Button $variant="primary" onClick={handleManualAuth} disabled={loading}>
                  {loading ? 'Authenticating...' : 'Authenticate'}
                </Button>
              </>
            ) : autoRegSupported ? (
              <>
                {/* <InfoMessage>
                      This server supports automatic client registration. Click below to automatically register and authenticate.
                    </InfoMessage> */}
                <Button $variant="primary" onClick={handleAutoRegister} disabled={loading}>
                  {loading ? 'Registering...' : 'Auto-Register & Authenticate'}
                </Button>
              </>
            ) : (
              <>
                <Label>Client ID</Label>
                <Input
                  type="text"
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  placeholder="Enter your OAuth Client ID"
                />

                <Label>Client Secret (optional)</Label>
                <Input
                  type="password"
                  value={clientSecret}
                  onChange={e => setClientSecret(e.target.value)}
                  placeholder="Enter your OAuth Client Secret"
                />

                <Button
                  $variant="primary"
                  onClick={handleManualAuth}
                  disabled={loading || !clientId}
                >
                  {loading ? 'Authenticating...' : 'Authenticate'}
                </Button>
              </>
            )}
          </Body>
        </Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default OAuthModal;
