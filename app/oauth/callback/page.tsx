'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import styled from 'styled-components';

export const dynamic = 'force-dynamic';

let Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #ffffff;
  padding: 40px;
`;

let Message = styled.div`
  font-size: 16px;
  color: #666666;
  text-align: center;
`;

let OAuthCallbackContent = () => {
  let searchParams = useSearchParams();

  useEffect(() => {
    let handleCallback = async () => {
      let code = searchParams.get('code');
      let state = searchParams.get('state');
      let error = searchParams.get('error');

      if (error) {
        // Send error to opener
        if (window.opener) {
          window.opener.postMessage(
            {
              type: 'oauth_error',
              error: error
            },
            window.location.origin
          );
          window.close();
        }
        return;
      }

      if (!code) {
        return;
      }

      // Get stored OAuth credentials from sessionStorage
      // The server name is not available here, so we'll need to pass the token back
      // and let the parent window handle the token exchange
      try {
        // For now, just pass the code back to the opener
        if (window.opener) {
          window.opener.postMessage(
            {
              type: 'oauth_code',
              code,
              state
            },
            window.location.origin
          );
          window.close();
        }
      } catch (err) {
        console.error('OAuth callback error:', err);
      }
    };

    handleCallback();
  }, [searchParams]);

  return (
    <Container>
      <Message>Processing OAuth callback...</Message>
    </Container>
  );
};

let OAuthCallback = () => {
  return (
    <Suspense
      fallback={
        <Container>
          <Message>Loading...</Message>
        </Container>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
};

export default OAuthCallback;
