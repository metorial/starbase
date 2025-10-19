import { auth } from '@/lib/auth';
import { presentUsers } from '@/lib/presenters/user';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export let GET = async () => {
  try {
    let session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    let publicUsers = presentUsers(users);

    return NextResponse.json({ users: publicUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
