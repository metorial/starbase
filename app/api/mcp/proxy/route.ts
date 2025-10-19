import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export let GET = async (request: NextRequest) => {
  try {
    let searchParams = request.nextUrl.searchParams;
    let targetUrl = searchParams.get('target');

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
    let forwardHeaders = new Headers();
    let skipHeaders = new Set([
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
    let authHeadersParam = searchParams.get('auth_headers');
    if (authHeadersParam) {
      try {
        let authHeaders = JSON.parse(authHeadersParam);
        Object.entries(authHeaders).forEach(([key, value]) => {
          forwardHeaders.set(key, value as string);
        });
      } catch (e) {
        console.error('[MCP Proxy] Failed to parse auth headers:', e);
      }
    }

    console.log('[MCP Proxy] Proxying GET request to:', url.toString());

    // Fetch from target - this returns a Response that can stream
    let response = await fetch(url.toString(), {
      method: 'GET',
      headers: forwardHeaders,
      // @ts-ignore - Edge runtime supports signal
      signal: request.signal
    });

    console.log('[MCP Proxy] Response status:', response.status);
    console.log('[MCP Proxy] Content-Type:', response.headers.get('content-type'));

    // Create response headers with CORS
    let responseHeaders = new Headers();

    // Copy all headers from upstream response
    response.headers.forEach((value, key) => {
      responseHeaders.set(key, value);
    });

    // Set CORS headers to allow browser access
    responseHeaders.set('access-control-allow-origin', '*');
    responseHeaders.set('access-control-allow-credentials', 'true');
    responseHeaders.set(
      'access-control-expose-headers',
      'WWW-Authenticate, Authorization, Content-Type'
    );

    // For SSE, ensure proper headers
    let contentType = response.headers.get('content-type') || '';
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
};

export let POST = async (request: NextRequest) => {
  try {
    let searchParams = request.nextUrl.searchParams;
    let targetUrl = searchParams.get('target');

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
    let forwardHeaders = new Headers();
    let skipHeaders = new Set([
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
    let authHeadersParam = searchParams.get('auth_headers');
    if (authHeadersParam) {
      try {
        let authHeaders = JSON.parse(authHeadersParam);
        Object.entries(authHeaders).forEach(([key, value]) => {
          forwardHeaders.set(key, value as string);
        });
      } catch (e) {
        console.error('[MCP Proxy] Failed to parse auth headers:', e);
      }
    }

    // Get request body
    let body = await request.text();

    // Make POST request to target
    let response = await fetch(url.toString(), {
      method: 'POST',
      headers: forwardHeaders,
      body: body,
      // @ts-ignore - Edge runtime supports signal
      signal: request.signal
    });

    console.log('[MCP Proxy] POST Response status:', response.status);

    // Create response headers with CORS
    let responseHeaders = new Headers();

    // Copy all headers from upstream response
    response.headers.forEach((value, key) => {
      responseHeaders.set(key, value);
    });

    // Set CORS headers to allow browser access
    responseHeaders.set('access-control-allow-origin', '*');
    responseHeaders.set('access-control-allow-credentials', 'true');
    responseHeaders.set(
      'access-control-expose-headers',
      'WWW-Authenticate, Authorization, Content-Type'
    );

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
};

export let OPTIONS = async (request: NextRequest) => {
  try {
    let searchParams = request.nextUrl.searchParams;
    let targetUrl = searchParams.get('target');

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
    let forwardHeaders = new Headers();
    request.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'host') {
        forwardHeaders.set(key, value);
      }
    });

    let response = await fetch(url.toString(), {
      method: 'OPTIONS',
      headers: forwardHeaders
    });

    let responseHeaders = new Headers();
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
};
