import type { AuthChallenge, CustomHeaders } from '@/types/mcp';

export interface OAuthDiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  grant_types_supported?: string[];
}

/**
 * Construct the default OAuth discovery URL from MCP server URL
 * Per MCP spec: discard path component and append /.well-known/oauth-authorization-server
 */
export let getDefaultDiscoveryUrl = (serverUrl: string): string => {
  try {
    let url = new URL(serverUrl);
    // Authorization base URL is origin (protocol + host, no path)
    let baseUrl = url.origin;
    return `${baseUrl}/.well-known/oauth-authorization-server`;
  } catch (error) {
    console.error('Failed to construct discovery URL:', error);
    throw new Error('Invalid server URL');
  }
};

/**
 * Parse WWW-Authenticate header to detect auth type and extract metadata
 */
export let parseWWWAuthenticate = (header: string): AuthChallenge | null => {
  if (!header) return null;

  // Check for Bearer token with OAuth discovery
  let bearerMatch = header.match(/Bearer\s+(.+)/i);
  if (bearerMatch) {
    let params = parseBearerParams(bearerMatch[1]);

    if (params.discovery_url) {
      return {
        type: 'oauth',
        discoveryUrl: params.discovery_url,
        realm: params.realm,
        scope: params.scope
      };
    }

    // Bearer without discovery = custom headers
    return {
      type: 'custom_headers',
      realm: params.realm,
      scope: params.scope
    };
  }

  // Any other auth scheme = custom headers
  return {
    type: 'custom_headers'
  };
};

/**
 * Parse Bearer token parameters
 */
let parseBearerParams = (paramString: string): Record<string, string> => {
  let params: Record<string, string> = {};
  let regex = /(\w+)="([^"]*)"/g;
  let match;

  while ((match = regex.exec(paramString)) !== null) {
    params[match[1]] = match[2];
  }

  return params;
};

/**
 * Create fallback OAuth endpoints from base URL
 * Per MCP spec: /authorize, /token, /register
 */
export let createFallbackEndpoints = (serverUrl: string): OAuthDiscoveryDocument => {
  let url = new URL(serverUrl);
  let baseUrl = url.origin;

  return {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/authorize`,
    token_endpoint: `${baseUrl}/token`,
    registration_endpoint: `${baseUrl}/register`,
    grant_types_supported: ['authorization_code'],
    response_types_supported: ['code']
  };
};

/**
 * Fetch and parse OAuth discovery document
 * Falls back to default endpoints if discovery fails (404)
 */
export async function fetchOAuthDiscovery(
  discoveryUrl: string,
  serverUrl?: string
): Promise<OAuthDiscoveryDocument> {
  try {
    let response = await fetch(discoveryUrl, {
      headers: {
        Accept: 'application/json'
      }
    });

    if (response.status === 404 && serverUrl) {
      // Discovery document not found, use fallback endpoints per MCP spec
      return createFallbackEndpoints(serverUrl);
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch OAuth discovery document: ${response.statusText}`);
    }

    let discovery = await response.json();
    return discovery;
  } catch (error) {
    if (serverUrl && error instanceof TypeError) {
      // Network error, try fallback
      return createFallbackEndpoints(serverUrl);
    }
    throw error;
  }
}

/**
 * Check if OAuth server supports dynamic client registration
 */
export let supportsClientRegistration = (discovery: OAuthDiscoveryDocument): boolean => {
  return !!discovery.registration_endpoint;
};

/**
 * Register OAuth client dynamically
 */
export async function registerOAuthClient(
  registrationEndpoint: string,
  clientMetadata: {
    client_name: string;
    redirect_uris: string[];
    grant_types?: string[];
    response_types?: string[];
    scope?: string;
  }
): Promise<{ client_id: string; client_secret?: string }> {
  let response = await fetch(registrationEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(clientMetadata)
  });

  if (!response.ok) {
    throw new Error(`OAuth client registration failed: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Build OAuth authorization URL
 */
export function buildAuthorizationUrl(
  authorizationEndpoint: string,
  clientId: string,
  redirectUri: string,
  scope?: string,
  state?: string
): string {
  let params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri
  });

  if (scope) {
    params.append('scope', scope);
  }

  if (state) {
    params.append('state', state);
  }

  return `${authorizationEndpoint}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  tokenEndpoint: string,
  code: string,
  clientId: string,
  clientSecret: string | undefined,
  redirectUri: string
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  let body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId
  });

  if (clientSecret) {
    body.append('client_secret', clientSecret);
  }

  let response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Create authenticated headers for MCP connection
 */
export function createAuthHeaders(
  authType: 'bearer' | 'custom',
  token?: string,
  customHeaders?: CustomHeaders
): Record<string, string> {
  if (authType === 'bearer' && token) {
    return {
      Authorization: `Bearer ${token}`
    };
  }

  if (authType === 'custom' && customHeaders) {
    return customHeaders;
  }

  return {};
}
