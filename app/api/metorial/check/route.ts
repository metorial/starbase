import { NextResponse } from 'next/server';

export const runtime = 'edge';

export let GET = async () => {
  let configured = !!process.env.METORIAL_OAUTH_CLIENT_ID;
  return NextResponse.json({ configured });
};
