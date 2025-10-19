import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * MCP Proxy Edge Function
 * Proxies MCP connections (SSE and HTTP streaming) to avoid CORS issues
 * Handles both GET (SSE) and POST (HTTP streaming) requests
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const targetUrl = searchParams.get('target');

    if (!targetUrl) {
      return NextResponse.json({ error: 'Missing target URL' }, { status: 400 });
    }

    // Validate URL
    let url: URL;
    try {
      url = new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid target URL' }, { status: 400 });
    }

    // Forward headers (excluding host and connection-related headers)
    const forwardHeaders = new Headers();
    const skipHeaders = new Set([
      'host',
      'connection',
      'keep-alive',
      'transfer-encoding',
      'upgrade',
      'content-length'
    ]);

    request.headers.forEach((value, key) => {
      if (!skipHeaders.has(key.toLowerCase())) {
        forwardHeaders.set(key, value);
      }
    });

    // Add custom auth headers if provided
    const authHeadersParam = searchParams.get('auth_headers');
    if (authHeadersParam) {
      try {
        const authHeaders = JSON.parse(authHeadersParam);
        Object.entries(authHeaders).forEach(([key, value]) => {
          forwardHeaders.set(key, value as string);
        });
      } catch (e) {
        console.error('[MCP Proxy] Failed to parse auth headers:', e);
      }
    }

    console.log('[MCP Proxy] Proxying GET request to:', url.toString());

    // Fetch from target - this returns a Response that can stream
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: forwardHeaders,
      // @ts-ignore - Edge runtime supports signal
      signal: request.signal
    });

    console.log('[MCP Proxy] Response status:', response.status);
    console.log('[MCP Proxy] Content-Type:', response.headers.get('content-type'));

    // Create response headers with CORS
    const responseHeaders = new Headers();

    // Copy all headers from upstream response
    response.headers.forEach((value, key) => {
      responseHeaders.set(key, value);
    });

    // Set CORS headers to allow browser access
    responseHeaders.set('access-control-allow-origin', '*');
    responseHeaders.set('access-control-allow-credentials', 'true');
    responseHeaders.set('access-control-expose-headers', 'WWW-Authenticate, Authorization, Content-Type');

    // For SSE, ensure proper headers
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream')) {
      responseHeaders.set('content-type', 'text/event-stream');
      responseHeaders.set('cache-control', 'no-cache');
      responseHeaders.set('connection', 'keep-alive');
      console.log('[MCP Proxy] Streaming SSE response');
    }

    // Return the streaming response
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  } catch (error) {
    console.error('[MCP Proxy] GET Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Proxy request failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const targetUrl = searchParams.get('target');

    if (!targetUrl) {
      return NextResponse.json({ error: 'Missing target URL' }, { status: 400 });
    }

    // Validate URL
    let url: URL;
    try {
      url = new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid target URL' }, { status: 400 });
    }

    console.log('[MCP Proxy] Proxying POST request to:', url.toString());

    // Forward headers
    const forwardHeaders = new Headers();
    const skipHeaders = new Set([
      'host',
      'connection',
      'keep-alive',
      'transfer-encoding',
      'upgrade'
    ]);

    request.headers.forEach((value, key) => {
      if (!skipHeaders.has(key.toLowerCase())) {
        forwardHeaders.set(key, value);
      }
    });

    // Add custom auth headers if provided
    const authHeadersParam = searchParams.get('auth_headers');
    if (authHeadersParam) {
      try {
        const authHeaders = JSON.parse(authHeadersParam);
        Object.entries(authHeaders).forEach(([key, value]) => {
          forwardHeaders.set(key, value as string);
        });
      } catch (e) {
        console.error('[MCP Proxy] Failed to parse auth headers:', e);
      }
    }

    // Get request body
    const body = await request.text();

    // Make POST request to target
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: forwardHeaders,
      body: body,
      // @ts-ignore - Edge runtime supports signal
      signal: request.signal
    });

    console.log('[MCP Proxy] POST Response status:', response.status);

    // Create response headers with CORS
    const responseHeaders = new Headers();

    // Copy all headers from upstream response
    response.headers.forEach((value, key) => {
      responseHeaders.set(key, value);
    });

    // Set CORS headers to allow browser access
    responseHeaders.set('access-control-allow-origin', '*');
    responseHeaders.set('access-control-allow-credentials', 'true');
    responseHeaders.set('access-control-expose-headers', 'WWW-Authenticate, Authorization, Content-Type');

    // Return the response (may be streaming)
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  } catch (error) {
    console.error('[MCP Proxy] POST Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Proxy request failed' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const targetUrl = searchParams.get('target');

    if (!targetUrl) {
      return NextResponse.json({ error: 'Missing target URL' }, { status: 400 });
    }

    // Validate URL
    let url: URL;
    try {
      url = new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid target URL' }, { status: 400 });
    }

    // Forward OPTIONS request
    const forwardHeaders = new Headers();
    request.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'host') {
        forwardHeaders.set(key, value);
      }
    });

    const response = await fetch(url.toString(), {
      method: 'OPTIONS',
      headers: forwardHeaders
    });

    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      responseHeaders.set(key, value);
    });

    // Ensure CORS headers are present
    if (!responseHeaders.has('access-control-allow-origin')) {
      responseHeaders.set('access-control-allow-origin', '*');
    }
    if (!responseHeaders.has('access-control-allow-methods')) {
      responseHeaders.set('access-control-allow-methods', 'GET, POST, OPTIONS');
    }
    if (!responseHeaders.has('access-control-allow-headers')) {
      responseHeaders.set(
        'access-control-allow-headers',
        'Content-Type, Authorization, X-Requested-With'
      );
    }

    return new NextResponse(null, {
      status: response.status,
      headers: responseHeaders
    });
  } catch (error) {
    console.error('[MCP Proxy] OPTIONS Error:', error);
    return new NextResponse(null, {
      status: 200,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'Content-Type, Authorization, X-Requested-With'
      }
    });
  }
}
