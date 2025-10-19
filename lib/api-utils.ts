import { NextResponse } from 'next/server';
import { z } from 'zod';

export let handleApiError = (error: unknown): NextResponse => {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Invalid request data', details: error.issues },
      { status: 400 }
    );
  }

  if (error instanceof Error && error.message === 'Failed to create or retrieve anonymous session') {
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
  }

  console.error('API Error:', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
};

export let withErrorHandling = <T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
): ((...args: T) => Promise<NextResponse>) => {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
