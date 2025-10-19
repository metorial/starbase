import {
  getAnonymousSessionFromCookie,
  migrateAnonymousServers
} from '@/lib/anonymous-session';
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export let POST = async () => {
  try {
    let session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Must be authenticated to migrate servers' },
        { status: 401 }
      );
    }

    let anonymousToken = await getAnonymousSessionFromCookie();

    if (!anonymousToken) {
      return NextResponse.json({ message: 'No anonymous session to migrate', count: 0 });
    }

    let count = await migrateAnonymousServers(anonymousToken, session.user.id);

    return NextResponse.json({
      success: true,
      count,
      message: `Migrated ${count} server(s) to your account`
    });
  } catch (error) {
    console.error('Error migrating servers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
