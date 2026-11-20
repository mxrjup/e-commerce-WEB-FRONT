import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../routes'
import { fakeApi, on } from '../../test/fakeApi'
import { fakeAuth, renderRoutes } from '../../test/renderWithAuth'
import { passwordError, temporaryPassword } from './password'

const PATH = '/api/admin/users/collaborators'
// fakeAuth signe « u-1 » : la ligne de Marie est celle de l'utilisateur connecte.
const marie = { id: 'u-1', email: 'marie@log.test', firstName: 'Marie', lastName: 'Martin', role: 'admin', enabled: true, createdAt: null }
const paul = { id: 'u-2', email: 'paul@log.test', firstName: 'Paul', lastName: 'Durand', role: 'collaborator', enabled: true, createdAt: '2026-11-02T09:00:00Z' }

function open() {
  return renderRoutes(routes(), '/collaborators', fakeAuth(['collaborator', 'admin']))
}

describe('the collaborators (U08)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('locks every action on one’s own account, as the API does', async () => {
    fakeApi(on('GET', PATH, 200, [marie, paul]))
    open()

    const own = await screen.findByRole('row', { name: /Marie Martin/ })
    expect(own).toHaveTextContent('Vous')
    expect(within(own).getByRole('button', { name: 'Changer le rôle de Marie Martin' })).toBeDisabled()
    expect(within(own).getByRole('button', { name: 'Désactiver Marie Martin' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Désactiver Paul Durand' })).toBeEnabled()
  })

  it('invites a collaborator, then shows what to send them, once', async () => {
    const api = fakeApi(
      on('POST', PATH, 201, { ...paul, id: 'u-3', email: 'lea@log.test', firstName: 'Léa', lastName: 'Roux' }),
      on('GET', PATH, 200, [marie, paul]),
    )
    open()

    await userEvent.click(await screen.findByRole('button', { name: 'Inviter un collaborateur' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Prénom' }), 'Léa')
    await userEvent.type(screen.getByRole('textbox', { name: 'Nom' }), 'Roux')
    await userEvent.type(screen.getByRole('textbox', { name: 'Adresse e-mail' }), ' Lea@Log.test ')
    const password = (screen.getByRole('textbox', { name: 'Mot de passe temporaire' }) as HTMLInputElement).value
    await userEvent.click(screen.getByRole('button', { name: 'Créer le compte' }))

    const shown = await screen.findByRole('dialog', { name: 'Compte de Léa Roux créé' })
    expect(within(shown).getByText(password)).toBeInTheDocument()
    expect(api.writes()).toEqual([{
      method: 'POST', path: PATH,
      body: { email: 'lea@log.test', firstName: 'Léa', lastName: 'Roux', role: 'collaborator', temporaryPassword: password },
    }])
  })

  it('says why Keycloak refused an address, in French', async () => {
    fakeApi(
      on('POST', PATH, 409, { status: 409, message: 'User exists with same email' }),
      on('GET', PATH, 200, [marie]),
    )
    open()

    await userEvent.click(await screen.findByRole('button', { name: 'Inviter un collaborateur' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Prénom' }), 'Client')
    await userEvent.type(screen.getByRole('textbox', { name: 'Nom' }), 'Demo')
    await userEvent.type(screen.getByRole('textbox', { name: 'Adresse e-mail' }), 'client@log.test')
    await userEvent.click(screen.getByRole('button', { name: 'Créer le compte' }))

    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('Un compte utilise déjà cette adresse e-mail')
  })

  it('changes a role and disables an account after asking', async () => {
    const api = fakeApi(
      on('PUT', `${PATH}/u-2/role`, 200, { ...paul, role: 'admin' }),
      on('POST', `${PATH}/u-2/disable`, 200, { ...paul, enabled: false }),
      on('GET', PATH, 200, [marie, paul]),
    )
    open()

    await userEvent.click(await screen.findByRole('button', { name: 'Changer le rôle de Paul Durand' }))
    await userEvent.click(screen.getByRole('radio', { name: /Administrateur/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByText('Paul Durand est maintenant administrateur.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Désactiver Paul Durand' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Désactiver' }))
    await waitFor(() => expect(api.writes().map((call) => `${call.method} ${call.path}`)).toEqual([
      `PUT ${PATH}/u-2/role`, `POST ${PATH}/u-2/disable`,
    ]))
    expect(api.writes()[0].body).toEqual({ role: 'admin' })
  })
})

describe('temporary passwords', () => {
  it('are long, random, readable, and pass the realm policy', () => {
    const passwords = new Set(Array.from({ length: 50 }, () => temporaryPassword()))
    expect(passwords.size).toBe(50)
    for (const password of passwords) {
      expect(password).toMatch(/^[a-km-zA-HJ-NP-Z2-9]{14}$/)
      expect(password).toMatch(/\d/)
      expect(passwordError(password, 'lea@log.test')).toBeNull()
    }
  })

  it('follow the realm policy: 8 characters, not the e-mail', () => {
    expect(passwordError('court', 'lea@log.test')).toBe('8 caractères au minimum.')
    expect(passwordError('LEA@log.test', 'lea@log.test')).toMatch(/adresse e-mail/)
  })
})
