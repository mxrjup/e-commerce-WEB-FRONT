import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../routes'
import { fakeApi, on } from '../../test/fakeApi'
import { fakeAuth, renderRoutes } from '../../test/renderWithAuth'

const BRANDS = '/api/admin/catalog/brands'
const asus = { id: 1, name: 'ASUS', slug: 'asus', description: null, logoUrl: null }

function open(url: string) {
  return renderRoutes(routes(), url, fakeAuth(['collaborator']))
}

describe('the reference lists (C19)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates a brand: trimmed fields, the slug left to the service, the list reloaded', async () => {
    const api = fakeApi(
      on('POST', BRANDS, 201, { ...asus, id: 2, name: 'Corsair', slug: 'corsair' }),
      on('GET', BRANDS, 200, [asus]),
    )
    open('/references')

    expect(await screen.findByRole('rowheader', { name: /ASUS/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter une marque' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Nom' }), '  Corsair ')
    expect(screen.getByText('Laissé vide, il sera « corsair ».')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Créer' }))

    expect(await screen.findByText('Marque créée.')).toBeInTheDocument()
    expect(api.writes()).toEqual([{
      method: 'POST', path: BRANDS, body: { name: 'Corsair', slug: null, description: null, logoUrl: null },
    }])
    expect(api.calls.filter((call) => call.method === 'GET')).toHaveLength(2)
  })

  it('says what is wrong next to the field, without calling the API', async () => {
    const api = fakeApi(on('GET', BRANDS, 200, [asus]))
    open('/references')

    await userEvent.click(await screen.findByRole('button', { name: 'Ajouter une marque' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Nom' }), 'asus')
    await userEvent.type(screen.getByRole('textbox', { name: 'Adresse du logo' }), 'logo.png')
    await userEvent.click(screen.getByRole('button', { name: 'Créer' }))

    expect(screen.getByText('Ce nom est déjà pris.')).toBeInTheDocument()
    expect(screen.getByText(/pas une adresse web complète/)).toBeInTheDocument()
    expect(api.writes()).toEqual([])
  })

  it('explains in French why a brand still in use cannot be deleted', async () => {
    fakeApi(
      on('DELETE', `${BRANDS}/1`, 409, { status: 409, message: "Brand 'asus' is still used and cannot be deleted" }),
      on('GET', BRANDS, 200, [asus]),
    )
    open('/references')

    await userEvent.click(await screen.findByRole('button', { name: 'Supprimer ASUS' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Supprimer' }))

    expect(await within(screen.getByRole('dialog')).findByRole('alert'))
      .toHaveTextContent('« ASUS » est encore la marque de produits du catalogue')
  })

  it('keeps the open tab in the address, and locks the delete of a parent category', async () => {
    fakeApi(on('GET', '/api/admin/catalog/categories', 200, [
      { id: 1, name: 'Composants', slug: 'composants', description: null, parentId: null, position: 0 },
      { id: 2, name: 'Cartes graphiques', slug: 'cartes-graphiques', description: null, parentId: 1, position: 0 },
    ]))
    open('/references?onglet=categories')

    expect(await screen.findByRole('tab', { name: 'Catégories', selected: true })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Supprimer Composants' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Supprimer Cartes graphiques' })).toBeEnabled()
    expect(screen.getByText('dans Composants')).toBeInTheDocument()

    // Une categorie ne peut pas etre rangee sous elle-meme ni sous sa branche.
    await userEvent.click(screen.getByRole('button', { name: 'Modifier Composants' }))
    await userEvent.click(screen.getByRole('combobox', { name: 'Catégorie parente' }))
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Aucune (premier niveau)'])
  })

  it('never lets the default VAT rate be unmarked or deleted', async () => {
    const api = fakeApi(
      on('PUT', '/api/admin/catalog/vat-rates/1', 200, {}),
      on('GET', '/api/admin/catalog/vat-rates', 200, [
        { id: 1, label: 'Taux normal', rate: 20, defaultRate: true },
        { id: 2, label: 'Taux réduit', rate: 5.5, defaultRate: false },
      ]),
    )
    open('/references?onglet=tva')

    expect(await screen.findByRole('row', { name: /Taux réduit 5,50 %/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Supprimer Taux normal' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Modifier Taux normal' }))
    expect(screen.getByRole('switch', { name: 'Taux par défaut' })).toBeDisabled()
    const rate = screen.getByRole('textbox', { name: 'Taux' })
    expect(rate).toHaveValue('20')
    await userEvent.clear(rate)
    await userEvent.type(rate, '19,6')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(api.writes()).toEqual([{
      method: 'PUT', path: '/api/admin/catalog/vat-rates/1', body: { label: 'Taux normal', rate: 19.6, defaultRate: true },
    }]))
  })

  it('shows a load failure with a way to retry', async () => {
    let fail = true
    fakeApi((call) => (call.path === BRANDS
      ? (fail ? { status: 503, body: { message: 'Service Unavailable' } } : { status: 200, body: [asus] })
      : undefined))
    open('/references')

    expect(await screen.findByText(/ne répond pas pour le moment/)).toBeInTheDocument()
    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(await screen.findByRole('rowheader', { name: /ASUS/ })).toBeInTheDocument()
  })
})
