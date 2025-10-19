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

export let getDefaultDiscoveryUrl = (serverUrl: string): string => {
  try {
    let url = new URL(serverUrl);
    let baseUrl = url.origin;
    return `${baseUrl}/.well-known/oauth-authorization-server`;
  } catch (error) {
    console.error('Failed to construct discovery URL:', error);
    throw new Error('Invalid server URL');
  }
};

export let parseWWWAuthenticate = (header: string): AuthChallenge | null => {
  if (!header) return null;

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

    return {
      type: 'custom_headers',
      realm: params.realm,
      scope: params.scope
    };
  }

  return {
    type: 'custom_headers'
  };
};

let parseBearerParams = (paramString: string): Record<string, string> => {
  let params: Record<string, string> = {};
  let regex = /(\w+)="([^"]*)"/g;
  let match;

  while ((match = regex.exec(paramString)) !== null) {
    params[match[1]] = match[2];
  }

  return params;
};

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

let createProxyUrl = (targetUrl: string): string => {
  let proxyBase = '/api/mcp/proxy';
  let params = new URLSearchParams({
    target: targetUrl
  });
  return `${proxyBase}?${params.toString()}`;
};

export let fetchOAuthDiscovery = async (
  discoveryUrl: string,
  serverUrl?: string
): Promise<OAuthDiscoveryDocument> => {
  try {
    let proxyUrl = createProxyUrl(discoveryUrl);
    let response = await fetch(proxyUrl, {
      headers: {
        Accept: 'application/json'
      }
    });

    if (response.status === 404 && serverUrl) {
      return createFallbackEndpoints(serverUrl);
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch OAuth discovery document: ${response.statusText}`);
    }

    let discovery = await response.json();
    return discovery;
  } catch (error) {
    if (serverUrl && error instanceof TypeError) {
      return createFallbackEndpoints(serverUrl);
    }
    throw error;
  }
};

export let supportsClientRegistration = (discovery: OAuthDiscoveryDocument): boolean => {
  return !!discovery.registration_endpoint;
};

export let registerOAuthClient = async (
  registrationEndpoint: string,
  clientMetadata: {
    client_name: string;
    redirect_uris: string[];
    grant_types?: string[];
    response_types?: string[];
    scope?: string;
  }
): Promise<{ client_id: string; client_secret?: string }> => {
  let proxyUrl = createProxyUrl(registrationEndpoint);
  let response = await fetch(proxyUrl, {
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
};

export let buildAuthorizationUrl = (
  authorizationEndpoint: string,
  clientId: string,
  redirectUri: string,
  scope?: string,
  state?: string
): string => {
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
};

export let exchangeCodeForToken = async (
  tokenEndpoint: string,
  code: string,
  clientId: string,
  clientSecret: string | undefined,
  redirectUri: string
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> => {
  let body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId
  });

  if (clientSecret) {
    body.append('client_secret', clientSecret);
  }

  let proxyUrl = createProxyUrl(tokenEndpoint);
  let response = await fetch(proxyUrl, {
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
};

export let createAuthHeaders = (
  authType: 'bearer' | 'custom',
  token?: string,
  customHeaders?: CustomHeaders
): Record<string, string> => {
  if (authType === 'bearer' && token) {
    return {
      Authorization: `Bearer ${token}`
    };
  }

  if (authType === 'custom' && customHeaders) {
    return customHeaders;
  }

  return {};
};
