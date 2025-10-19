import {
  getOrCreateAnonymousSession,
  setAnonymousSessionCookie
} from '@/lib/anonymous-session';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export let GET = async () => {
  try {
    let sessionToken = await getOrCreateAnonymousSession();
    await setAnonymousSessionCookie(sessionToken);

    return NextResponse.json({
      sessionToken
    });
  } catch (error) {
    console.error('Error managing session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
