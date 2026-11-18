import { json, type Api } from '../../api/useApi'

/**
 * The MCP tokens of mcp-service (M03), through /api/admin/mcp/tokens, which
 * the gateway reserves to admins. A token is shown once, in the answer to
 * its creation, and never again: the service only keeps its fingerprint.
 */
export type McpScope = 'catalog:read' | 'orders:read' | 'users:read'
export type McpTokenStatus = 'active' | 'expired' | 'revoked'

export type McpToken = {
  id: number
  name: string
  /** « mcp_ » and the first characters, enough to recognise a token in a client's settings. */
  prefix: string
  scopes: McpScope[]
  status: McpTokenStatus
  /** Keycloak ids (the `sub` of the admin who acted), null for a token made outside the back-office. */
  createdBy: string | null
  createdAt: string
  expiresAt: string | null
  lastUsedAt: string | null
  revokedBy: string | null
  revokedAt: string | null
}

export type CreatedMcpToken = McpToken & { token: string }

export type CreateMcpTokenRequest = { name: string; scopes: McpScope[]; expiresAt: string | null }

/** What each scope opens, read-only: no MCP tool writes anything. Order of the form. */
export const SCOPES: { value: McpScope; label: string; help: string }[] = [
  { value: 'catalog:read', label: 'Catalogue', help: 'Produits, variantes et stock.' },
  { value: 'orders:read', label: 'Commandes', help: 'Les commandes et leurs lignes, client par client.' },
  { value: 'users:read', label: 'Clients', help: 'Les comptes clients : des données personnelles.' },
]

export const MCP_TOKENS = '/api/admin/mcp/tokens'

export function mcpTokens(api: Api) {
  return {
    list: () => api<McpToken[]>(MCP_TOKENS),
    create: (request: CreateMcpTokenRequest) => api<CreatedMcpToken>(MCP_TOKENS, json('POST', request)),
    revoke: (id: number) => api<McpToken>(`${MCP_TOKENS}/${id}/revoke`, { method: 'POST' }),
  }
}
