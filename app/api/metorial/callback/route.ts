import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export let GET = async (req: NextRequest) => {
  let url = new URL(req.url);
  let code = url.searchParams.get('code');
  if (!code) {
    console.error('No code in Metorial callback');
    return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
  }

  if (!process.env.METORIAL_OAUTH_CLIENT_ID || !process.env.METORIAL_OAUTH_CLIENT_SECRET) {
    console.error('Metorial OAuth credentials not configured');
    return NextResponse.json({ error: 'Metorial OAuth is not configured' }, { status: 500 });
  }

  try {
    // Exchange code for token
    let tokenRes = await fetch('https://auth-api.metorial.com/handoff/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: process.env.METORIAL_OAUTH_CLIENT_ID,
        client_secret: process.env.METORIAL_OAUTH_CLIENT_SECRET,
        code,
        redirect_uri: `${req.nextUrl.origin}/api/metorial/callback`,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenRes.ok) {
      console.error('Failed to fetch token from Metorial', await tokenRes.text());
      return NextResponse.json({ error: 'Failed to exchange code for token' }, { status: 500 });
    }

    let tokenData = await tokenRes.json();
    let accessToken = tokenData.access_token;
    if (!accessToken) {
      console.error('No access token in Metorial response', tokenData);
      return NextResponse.json({ error: 'No access token received' }, { status: 500 });
    }

    // Fetch user info
    let userRes = await fetch('https://auth-api.metorial.com/handoff/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!userRes.ok) {
      console.error('Failed to fetch user info from Metorial', await userRes.text());
      return NextResponse.json({ error: 'Failed to fetch user info' }, { status: 500 });
    }

    let userData = await userRes.json();

    // Create or update user in database
    try {
      let user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {
          name: `${userData.first_name} ${userData.last_name}`.trim() || userData.email
        },
        create: {
          email: userData.email,
          name: `${userData.first_name} ${userData.last_name}`.trim() || userData.email,
          emailVerified: new Date()
        }
      });

      // Create account link
      await prisma.account.upsert({
        where: {
          provider_providerAccountId: {
            provider: 'metorial',
            providerAccountId: userData.id
          }
        },
        update: {
          access_token: accessToken,
          expires_at: tokenData.expires_in ? Math.floor(Date.now() / 1000) + tokenData.expires_in : null,
          refresh_token: tokenData.refresh_token
        },
        create: {
          userId: user.id,
          type: 'oauth',
          provider: 'metorial',
          providerAccountId: userData.id,
          access_token: accessToken,
          expires_at: tokenData.expires_in ? Math.floor(Date.now() / 1000) + tokenData.expires_in : null,
          refresh_token: tokenData.refresh_token,
          token_type: 'Bearer',
          scope: tokenData.scope
        }
      });

      // Create session
      let session = await prisma.session.create({
        data: {
          userId: user.id,
          sessionToken: crypto.randomUUID(),
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      });

      // Set session cookie and redirect to home
      let response = NextResponse.redirect(new URL('/', req.url));
      response.cookies.set('authjs.session-token', session.sessionToken, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        expires: session.expires
      });

      return response;
    } catch (dbError) {
      console.error('Database error during Metorial auth:', dbError);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }
  } catch (error) {
    console.error('Metorial OAuth callback error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'OAuth callback failed' },
      { status: 500 }
    );
  }
};
