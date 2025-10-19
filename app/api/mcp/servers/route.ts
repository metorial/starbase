import { handleApiError } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';
import { getSessionContext } from '@/lib/session-utils';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

let postSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  description: z.string().optional(),
  category: z.string().optional(),
  transport: z.enum(['sse', 'streamable_http'])
});

export let GET = async () => {
  try {
    let { userId, anonymousSessionId } = await getSessionContext();

    let servers = await prisma.customMCPServer.findMany({
      where: userId ? { userId } : { anonymousSessionId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ servers });
  } catch (error) {
    return handleApiError(error);
  }
};

export let POST = async (request: Request) => {
  try {
    let body = await request.json();
    let validatedData = postSchema.parse(body);
    let { name, url, description, category, transport } = validatedData;

    let { userId, anonymousSessionId } = await getSessionContext();

    let server = await prisma.customMCPServer.create({
      data: {
        name,
        url,
        description,
        category: category || 'Custom',
        transport,
        userId,
        anonymousSessionId
      }
    });

    return NextResponse.json({ server }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
};
