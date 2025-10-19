export interface MCPServer {
  id: string
  name: string
  description: string
  domain: string
  category: string
  url: string
  provider: string
  transport: 'sse' | 'streamable_http'
  status: 'active' | 'inactive'
  publication_status: 'public' | 'private'
  created_at: string
  isPopular?: boolean
}

export interface AuthChallenge {
  type: 'oauth' | 'custom_headers'
  discoveryUrl?: string
  realm?: string
  scope?: string
}

export interface OAuthConfig {
  clientId: string
  clientSecret?: string
  scopes?: string[]
}

export interface CustomHeaders {
  [key: string]: string
}

export interface MCPServersData {
  servers: MCPServer[]
}
