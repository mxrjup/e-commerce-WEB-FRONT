import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../routes'
import { fakeApi, on } from '../../test/fakeApi'
import { fakeAuth, renderRoutes } from '../../test/renderWithAuth'
import { PRODUCTS, unitPriceInclTax, type AdminVariant, type ProductDetail } from './api'

const variant: AdminVariant = {
  id: 11, sku: 'LOGI-G915TKL-AZ-NOI', designation: 'Logitech G915 TKL - Noir, AZERTY',
  purchasePriceExclTax: 120, salePriceExclTax: 199, discountPriceExclTax: 149.99, ecoTax: 0.42, weightKg: 0.8,
  stock: 8, alertThreshold: 2, lowStock: false,
  values: [{ attributeId: 1, attribute: 'Couleur', valueId: 1, value: 'Noir' }, { attributeId: 2, attribute: 'Layout clavier', valueId: 5, value: 'AZERTY' }],
  images: [],
}

const g915: ProductDetail = {
  id: 2, title: 'Logitech G915 TKL', slug: 'logitech-g915-tkl', description: '<p>Clavier mécanique sans fil.</p>',
  status: 'PUBLIE', brand: { id: 3, name: 'Logitech' }, category: { id: 7, name: 'Claviers' },
  vatRate: { id: 1, label: 'Taux normal', rate: 20 }, universes: [{ id: 1, name: 'Gaming' }],
  specifications: [{ key: 'Switches', value: 'GL Tactile' }, { key: 'Garantie', value: '2 ans' }],
  variants: [variant], createdAt: '2026-11-19T11:00:00Z', updatedAt: '2026-11-20T09:15:00Z',
}
const draft: ProductDetail = { ...g915, id: 4, title: 'Clavier Écho K2', slug: 'clavier-echo-k2', status: 'BROUILLON', variants: [] }

const references = [
  on('GET', '/api/admin/catalog/brands', 200, [
    { id: 3, name: 'Logitech', slug: 'logitech', description: null, logoUrl: null },
    { id: 4, name: 'Corsair', slug: 'corsair', description: null, logoUrl: null },
  ]),
  on('GET', '/api/admin/catalog/categories', 200, [
    { id: 1, name: 'Périphériques', slug: 'peripheriques', description: null, parentId: null, position: 0 },
    { id: 7, name: 'Claviers', slug: 'claviers', description: null, parentId: 1, position: 0 },
  ]),
  on('GET', '/api/admin/catalog/universes', 200, [
    { id: 1, name: 'Gaming', slug: 'gaming', description: null, imageUrl: null, position: 0 },
    { id: 2, name: 'Télétravail', slug: 'teletravail', description: null, imageUrl: null, position: 1 },
  ]),
  on('GET', '/api/admin/catalog/vat-rates', 200, [
    { id: 1, label: 'Taux normal', rate: 20, defaultRate: true },
    { id: 3, label: 'Taux réduit', rate: 5.5, defaultRate: false },
  ]),
  on('GET', '/api/admin/catalog/specification-keys?categoryId=7', 200, ['Switches', 'Connectique', 'Garantie']),
  on('GET', '/api/admin/catalog/specification-keys?categoryId=1', 200, []),
]

function open(url: string) {
  return renderRoutes(routes(), url, fakeAuth(['collaborator']))
}

async function choose(label: string, option: string) {
  await userEvent.click(screen.getByRole('combobox', { name: label }))
  await userEvent.click(await screen.findByRole('option', { name: option }))
}

describe('the product form (C16)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('creates a draft: trimmed fields, the default rate, the slug left to the service', async () => {
    const api = fakeApi(
      on('POST', PRODUCTS, 201, { ...draft, id: 42 }),
      on('GET', `${PRODUCTS}/42`, 200, { ...draft, id: 42 }),
      ...references,
    )
    open('/products/nouveau')

    await userEvent.type(await screen.findByRole('textbox', { name: 'Titre' }), '  Clavier Écho K2 ')
    expect(screen.getByText('Laissé vide, il sera « clavier-echo-k2 ».')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'TVA' })).toHaveTextContent('Taux normal (20,00 %)')
    await choose('Marque', 'Logitech')
    await choose('Catégorie', 'Périphériques › Claviers')
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter une caractéristique' }))
    await userEvent.type(screen.getByRole('combobox', { name: 'Clé 1' }), 'Garantie')
    await userEvent.type(screen.getByRole('textbox', { name: 'Valeur 1' }), ' 2 ans ')
    await userEvent.click(screen.getByRole('button', { name: 'Créer le produit' }))

    expect(await screen.findByText('Produit créé, en brouillon.')).toBeInTheDocument()
    expect(api.writes()).toEqual([{
      method: 'POST', path: PRODUCTS, body: {
        title: 'Clavier Écho K2', slug: null, description: null, brandId: 3, categoryId: 7, vatRateId: 1,
        universeIds: [], specifications: [{ key: 'Garantie', value: '2 ans' }],
      },
    }])
    // On arrive sur l'adresse du produit cree, qui recharge sa fiche, prete pour ses variantes.
    await waitFor(() => expect(api.calls.some((call) => call.method === 'GET' && call.path === `${PRODUCTS}/42`)).toBe(true))
    expect(await screen.findByRole('heading', { name: 'Clavier Écho K2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
    // Long : il remplit toute la fiche, lettre par lettre, pendant que les autres fichiers de test tournent.
  }, 15_000)

  it('says what is missing next to each field, without calling the API', async () => {
    const api = fakeApi(...references)
    open('/products/nouveau')

    await userEvent.click(await screen.findByRole('button', { name: 'Créer le produit' }))

    expect(screen.getByText('Ce champ est obligatoire.')).toBeInTheDocument()
    expect(screen.getByText('Choisissez une marque.')).toBeInTheDocument()
    expect(screen.getByText('Choisissez une catégorie.')).toBeInTheDocument()
    expect(screen.getByText(/Le formulaire contient des erreurs/)).toBeInTheDocument()
    expect(api.writes()).toEqual([])
  })

  it('edits a sheet: saves the whole specification list, in its new order', async () => {
    const api = fakeApi(
      on('PUT', `${PRODUCTS}/2`, 200, { ...g915, title: 'Logitech G915 TKL Lightspeed' }),
      on('GET', `${PRODUCTS}/2`, 200, g915),
      ...references,
    )
    open('/products/2')

    const title = await screen.findByRole('textbox', { name: 'Titre' })
    expect(title).toHaveValue('Logitech G915 TKL')
    expect(screen.getByRole('textbox', { name: 'Description' })).toHaveTextContent('Clavier mécanique sans fil.')
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()

    await userEvent.type(title, ' Lightspeed')
    await userEvent.click(screen.getByRole('button', { name: 'Monter la caractéristique 2' }))
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByText('Produit enregistré.')).toBeInTheDocument()
    expect(api.writes()[0].body).toEqual({
      title: 'Logitech G915 TKL Lightspeed', slug: 'logitech-g915-tkl', description: '<p>Clavier mécanique sans fil.</p>',
      brandId: 3, categoryId: 7, vatRateId: 1, universeIds: [1],
      specifications: [{ key: 'Garantie', value: '2 ans' }, { key: 'Switches', value: 'GL Tactile' }],
    })
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
  })

  it('suggests the keys of the category, and refuses a key used twice', async () => {
    const api = fakeApi(on('GET', `${PRODUCTS}/2`, 200, g915), ...references)
    open('/products/2')

    await userEvent.click(await screen.findByRole('button', { name: 'Ajouter une caractéristique' }))
    await userEvent.click(screen.getByRole('combobox', { name: 'Clé 3' }))
    // Les cles deja sur la fiche ne sont plus proposees.
    expect(await screen.findByRole('option', { name: 'Connectique' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Switches' })).not.toBeInTheDocument()

    await userEvent.type(screen.getByRole('combobox', { name: 'Clé 3' }), 'garantie')
    await userEvent.type(screen.getByRole('textbox', { name: 'Valeur 3' }), '3 ans')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(screen.getByText('« garantie » est déjà dans la liste.')).toBeInTheDocument()
    expect(api.writes()).toEqual([])
  })

  it('shows each variant with its price including VAT, at the rate chosen', async () => {
    fakeApi(on('GET', `${PRODUCTS}/2`, 200, g915), ...references)
    open('/products/2')

    const table = await screen.findByRole('table', { name: 'Variantes' })
    const row = within(table).getByRole('rowheader', { name: /Noir, AZERTY/ }).closest('tr')!
    // (149,99 + 0,42) x 1,20 = 180,49 : remise et ecotaxe comprises, comme le calcule catalog-service.
    expect(within(row).getByText(/180,49\s€/)).toBeInTheDocument()

    await choose('TVA', 'Taux réduit (5,50 %)')
    expect(within(row).getByText(/158,68\s€/)).toBeInTheDocument()
  })

  it('refuses to publish a draft without variant, and says why', async () => {
    fakeApi(on('GET', `${PRODUCTS}/5`, 200, { ...draft, id: 5 }), ...references)
    open('/products/5')
    expect(await screen.findByRole('button', { name: 'Publier' })).toBeDisabled()
    expect(screen.getByText(/Pas encore publiable/)).toBeInTheDocument()
  })

  it('publishes a draft with a variant, and waits for unsaved changes first', async () => {
    const api = fakeApi(
      on('PUT', `${PRODUCTS}/4/status`, 200, { ...draft, variants: [variant], status: 'PUBLIE' }),
      on('GET', `${PRODUCTS}/4`, 200, { ...draft, variants: [variant] }),
      ...references,
    )
    open('/products/4')

    const title = await screen.findByRole('textbox', { name: 'Titre' })
    await userEvent.type(title, '!')
    expect(screen.getByRole('button', { name: 'Publier' })).toBeDisabled()
    expect(screen.getByText(/Enregistrez d’abord vos modifications/)).toBeInTheDocument()
    await userEvent.type(title, '{Backspace}')

    await userEvent.click(screen.getByRole('button', { name: 'Publier' }))
    expect(await screen.findByText('Produit publié : il est en vente.')).toBeInTheDocument()
    expect(api.writes()).toEqual([{ method: 'PUT', path: `${PRODUCTS}/4/status`, body: { status: 'PUBLIE' } }])
    const status = screen.getByRole('region', { name: 'Statut' })
    expect(within(status).getByText('Publié')).toBeInTheDocument()
    expect(within(status).getByRole('button', { name: 'Archiver' })).toBeInTheDocument()
    expect(within(status).queryByRole('button', { name: /Supprimer/ })).not.toBeInTheDocument()
  })

  it('deletes a draft after confirmation, and goes back to the list', async () => {
    const api = fakeApi(
      on('DELETE', `${PRODUCTS}/4`, 204),
      on('GET', `${PRODUCTS}/4`, 200, draft),
      (call) => (call.path.startsWith(`${PRODUCTS}?`) ? { status: 200, body: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 } } : undefined),
      ...references,
    )
    open('/products/4')

    await userEvent.click(await screen.findByRole('button', { name: 'Supprimer le brouillon' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Supprimer' }))

    expect(await screen.findByText('Brouillon supprimé.')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Produits' })).toBeInTheDocument()
    expect(api.writes()).toEqual([{ method: 'DELETE', path: `${PRODUCTS}/4`, body: undefined }])
  })

  it('asks before leaving with unsaved changes', async () => {
    fakeApi(
      on('GET', `${PRODUCTS}/2`, 200, g915),
      (call) => (call.path.startsWith(`${PRODUCTS}?`) ? { status: 200, body: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 } } : undefined),
      ...references,
    )
    open('/products/2')

    await userEvent.type(await screen.findByRole('textbox', { name: 'Titre' }), ' modifié')
    await userEvent.click(screen.getByRole('link', { name: 'Produits' }))
    const dialog = await screen.findByRole('dialog', { name: 'Quitter sans enregistrer ?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Annuler' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('textbox', { name: 'Titre' })).toHaveValue('Logitech G915 TKL modifié')

    await userEvent.click(screen.getByRole('link', { name: 'Produits' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Quitter' }))
    expect(await screen.findByRole('heading', { name: 'Produits' })).toBeInTheDocument()
  })

  it('tells in French why the service refused, and keeps what was typed', async () => {
    fakeApi(
      on('PUT', `${PRODUCTS}/2`, 409, { status: 409, message: "A product with slug 'corsair-k70-rgb-pro' already exists" }),
      on('GET', `${PRODUCTS}/2`, 200, g915),
      ...references,
    )
    open('/products/2')

    const slug = await screen.findByRole('textbox', { name: 'Slug' })
    await userEvent.clear(slug)
    await userEvent.type(slug, 'corsair-k70-rgb-pro')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByText(/Le slug « corsair-k70-rgb-pro » est déjà pris par un autre produit/)).toBeInTheDocument()
    expect(slug).toHaveValue('corsair-k70-rgb-pro')
  })

  it('says so when the product does not exist', async () => {
    fakeApi(on('GET', `${PRODUCTS}/99`, 404, { status: 404, message: 'Product 99 not found' }), ...references)
    open('/products/99')

    expect(await screen.findByText(/Ce produit n’existe pas, ou plus/)).toBeInTheDocument()
  })
})

describe('the price including VAT', () => {
  it('rounds like catalog-service, to the cent', () => {
    expect(unitPriceInclTax({ ...variant, discountPriceExclTax: 74.9, ecoTax: null }, 20)).toBe(89.88)
    // 10,10 x 5,5 % = 0,5555 : la TVA s'arrondit a 0,56, comme RoundingMode.HALF_UP, et 10,05 donne 0,55.
    expect(unitPriceInclTax({ ...variant, discountPriceExclTax: null, salePriceExclTax: 10.1, ecoTax: null }, 5.5)).toBe(10.66)
    expect(unitPriceInclTax({ ...variant, discountPriceExclTax: null, salePriceExclTax: 10.05, ecoTax: null }, 5.5)).toBe(10.6)
    expect(unitPriceInclTax({ ...variant, discountPriceExclTax: null, salePriceExclTax: 0.1, ecoTax: 0.2 }, 0)).toBe(0.3)
  })
})
