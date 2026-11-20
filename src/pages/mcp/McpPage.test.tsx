import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatRelative } from '../../lib/format'
import { routes } from '../../routes'
import { fakeApi, on } from '../../test/fakeApi'
import { fakeAuth, renderRoutes } from '../../test/renderWithAuth'
import { expiryOf } from './lifetimes'

const TOKENS = '/api/admin/mcp/tokens'
const HOUR = 60 * 60 * 1000
const ago = (ms: number) => new Date(Date.now() - ms).toISOString()

const token = (id: number, name: string, extra: object = {}) => ({
  id, name, prefix: `mcp_abcd000${id}`, scopes: ['catalog:read'], status: 'active',
  createdBy: 'u-1', createdAt: ago(48 * HOUR), expiresAt: null, lastUsedAt: null, revokedBy: null, revokedAt: null, ...extra,
})

const collaborators = on('GET', '/api/admin/users/collaborators', 200, [
  { id: 'u-2', email: 'paul@log.test', firstName: 'Paul', lastName: 'Durand' },
])

function open() {
  return renderRoutes(routes(), '/mcp', fakeAuth(['collaborator', 'admin']))
}

describe('the MCP panel (M04)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists the active tokens, with who created them and when they were last used', async () => {
    fakeApi(collaborators, on('GET', TOKENS, 200, [
      token(1, 'Claude Desktop', { createdBy: 'u-2', scopes: ['catalog:read', 'users:read'], lastUsedAt: ago(5 * 60_000) }),
      token(2, 'Ancien', { status: 'revoked', createdBy: 'u-9', revokedBy: 'u-1', revokedAt: ago(HOUR) }),
    ]))
    open()

    const row = await screen.findByRole('row', { name: /Claude Desktop/ })
    expect(row).toHaveTextContent('mcp_abcd0001…')
    expect(row).toHaveTextContent('CatalogueClients')
    expect(row).toHaveTextContent('Actif')
    expect(await within(row).findByText('par Paul Durand')).toBeInTheDocument()
    expect(row).toHaveTextContent('il y a 5 minutes')
    // Les jetons revoques et expires attendent sous « Tous ».
    expect(screen.queryByRole('row', { name: /Ancien/ })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /^Tous/ }))
    const revoked = screen.getByRole('row', { name: /Ancien/ })
    expect(revoked).toHaveTextContent('Révoqué')
    expect(revoked).toHaveTextContent('par vous')
    expect(revoked).toHaveTextContent('par un compte supprimé')
    expect(within(revoked).getByRole('button', { name: 'Révoquer Ancien' })).toBeDisabled()
  })

  it('creates a token and shows it once, in a dialog that only its button closes', async () => {
    const api = fakeApi(
      collaborators,
      on('POST', TOKENS, 201, { ...token(3, 'Inspector'), token: 'mcp_secret-value' }),
      on('GET', TOKENS, 200, []),
    )
    open()

    await userEvent.click(await screen.findByRole('button', { name: 'Créer un jeton' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Nom' }), ' Inspector ')
    // Coches dans le desordre : la demande garde l'ordre du formulaire.
    await userEvent.click(screen.getByRole('checkbox', { name: /Clients/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Commandes/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Créer le jeton' }))

    const shown = await screen.findByRole('dialog', { name: 'Jeton « Inspector » créé' })
    expect(within(shown).getByText('mcp_secret-value')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(shown).toBeVisible()

    const [request] = api.writes()
    expect(request).toMatchObject({ method: 'POST', path: TOKENS })
    const body = request.body as { name: string; scopes: string[]; expiresAt: string }
    expect(body.name).toBe('Inspector')
    expect(body.scopes).toEqual(['catalog:read', 'orders:read', 'users:read'])
    // 90 jours par defaut.
    expect(new Date(body.expiresAt).getTime() - Date.now()).toBeGreaterThan(89 * 24 * HOUR)

    await userEvent.click(within(shown).getByRole('button', { name: 'J’ai copié le jeton' }))
    await waitFor(() => expect(screen.queryByText('mcp_secret-value')).not.toBeInTheDocument())
  })

  it('refuses a token without a name or a scope, before calling the API', async () => {
    const api = fakeApi(collaborators, on('GET', TOKENS, 200, []))
    open()

    await userEvent.click(await screen.findByRole('button', { name: 'Créer un jeton' }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Catalogue/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Créer le jeton' }))

    expect(screen.getByText('Ce champ est obligatoire.')).toBeInTheDocument()
    expect(screen.getByText('Cochez au moins une portée.')).toBeInTheDocument()
    expect(api.writes()).toEqual([])
  })

  it('revokes a token after asking', async () => {
    const api = fakeApi(
      collaborators,
      on('POST', `${TOKENS}/1/revoke`, 200, token(1, 'Claude Desktop', { status: 'revoked' })),
      on('GET', TOKENS, 200, [token(1, 'Claude Desktop')]),
    )
    open()

    await userEvent.click(await screen.findByRole('button', { name: 'Révoquer Claude Desktop' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Révoquer' }))

    expect(await screen.findByText(/révoqué : il ne donne plus accès à rien/)).toBeInTheDocument()
    expect(api.writes()).toEqual([{ method: 'POST', path: `${TOKENS}/1/revoke`, body: undefined }])
  })
})

describe('times', () => {
  const now = Date.UTC(2026, 10, 18, 12)

  it('says how long ago, or how long until', () => {
    expect(formatRelative(new Date(now - 20_000).toISOString(), now)).toBe('à l’instant')
    expect(formatRelative(new Date(now - 5 * 60_000).toISOString(), now)).toBe('il y a 5 minutes')
    expect(formatRelative(new Date(now + 30 * 24 * HOUR - 1000).toISOString(), now)).not.toMatch(/29/)
    expect(formatRelative(new Date(now - 24 * HOUR).toISOString(), now)).toBe('hier')
  })

  it('makes a chosen date last until the end of that day', () => {
    const end = expiryOf('date', '2026-12-31', now)!
    expect([end.getFullYear(), end.getMonth(), end.getDate(), end.getHours(), end.getMinutes()]).toEqual([2026, 11, 31, 23, 59])
    expect(expiryOf('never', '', now)).toBeNull()
    expect(expiryOf('30', '', now)!.getTime()).toBe(now + 30 * 24 * HOUR)
  })
})
