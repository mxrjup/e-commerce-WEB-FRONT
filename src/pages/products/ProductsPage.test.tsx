import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../routes'
import { fakeApi, on } from '../../test/fakeApi'
import { fakeAuth, renderRoutes } from '../../test/renderWithAuth'
import { PRODUCTS, type ProductSummary } from './api'

const g915: ProductSummary = {
  id: 2, title: 'Logitech G915 TKL', slug: 'logitech-g915-tkl', status: 'PUBLIE',
  brand: { id: 3, name: 'Logitech' }, category: { id: 7, name: 'Claviers' },
  variantCount: 2, priceFromExclTax: 179.9, totalStock: 10, lowStock: true, updatedAt: '2026-11-20T09:15:00Z',
}
const k70: ProductSummary = {
  ...g915, id: 3, title: 'Corsair K70 RGB Pro', slug: 'corsair-k70-rgb-pro', brand: { id: 4, name: 'Corsair' },
  variantCount: 1, priceFromExclTax: 139, totalStock: 0, lowStock: true,
}
const draft: ProductSummary = {
  ...g915, id: 4, title: 'Clavier sans variante', slug: 'clavier-sans-variante', status: 'BROUILLON',
  variantCount: 0, priceFromExclTax: null, totalStock: 0, lowStock: false,
}

const COUNTS: Record<string, number> = { PUBLIE: 17, BROUILLON: 1, ARCHIVE: 1 }

/**
 * The product list of catalog-service: one-line pages give the status
 * counts, any other page gives these rows, out of `total` products.
 */
function products(rows: ProductSummary[], total = rows.length) {
  return (call: { method: string; path: string }) => {
    if (call.method !== 'GET' || !call.path.startsWith(`${PRODUCTS}?`)) return undefined
    const params = new URLSearchParams(call.path.split('?')[1])
    const size = Number(params.get('size'))
    if (size === 1) {
      return { status: 200, body: { content: [], page: 0, size: 1, totalElements: COUNTS[params.get('status') ?? ''], totalPages: 1 } }
    }
    return { status: 200, body: { content: rows, page: Number(params.get('page')), size, totalElements: total, totalPages: Math.ceil(total / size) } }
  }
}

const references = [
  on('GET', '/api/admin/catalog/brands', 200, [{ id: 3, name: 'Logitech', slug: 'logitech', description: null, logoUrl: null }]),
  on('GET', '/api/admin/catalog/categories', 200, [
    { id: 1, name: 'Périphériques', slug: 'peripheriques', description: null, parentId: null, position: 0 },
    { id: 7, name: 'Claviers', slug: 'claviers', description: null, parentId: 1, position: 0 },
  ]),
]

/** The list requests, without the status counts. */
function pageCalls(api: ReturnType<typeof fakeApi>) {
  return api.calls
    .filter((call) => call.path.startsWith(`${PRODUCTS}?`) && !call.path.includes('size=1&') && !call.path.endsWith('size=1'))
    .map((call) => call.path)
}

function open(url = '/products') {
  return renderRoutes(routes(), url, fakeAuth(['collaborator']))
}

describe('the product list (C15)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows each product with its status, price before VAT and stock', async () => {
    fakeApi(products([g915, k70, draft], 19), ...references)
    open()

    const row = (await screen.findByRole('rowheader', { name: /Logitech G915 TKL/ })).closest('tr')!
    expect(within(row).getByText('logitech-g915-tkl')).toBeInTheDocument()
    expect(within(row).getByText('Claviers')).toBeInTheDocument()
    expect(within(row).getByText('Publié')).toBeInTheDocument()
    expect(within(row).getByText(/179,90\s€/)).toBeInTheDocument()
    expect(within(row).getByText('Stock bas')).toBeInTheDocument()

    const k70Row = screen.getByRole('rowheader', { name: /Corsair K70/ }).closest('tr')!
    expect(within(k70Row).getByText('Rupture')).toBeInTheDocument()
    // Un brouillon sans variante n'est pas « en rupture » : il n'a rien a vendre.
    const draftRow = screen.getByRole('rowheader', { name: /Clavier sans variante/ }).closest('tr')!
    expect(within(draftRow).getByText('Brouillon')).toBeInTheDocument()
    expect(within(draftRow).queryByText('Rupture')).not.toBeInTheDocument()
    expect(within(draftRow).getByText('—')).toBeInTheDocument()

    expect(screen.getByRole('status')).toHaveTextContent('19 produits')
    const chips = screen.getByRole('group', { name: 'Statut' })
    expect(await within(chips).findByRole('button', { name: 'Tous 19' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(chips).getByRole('button', { name: 'Brouillon 1' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('reads the filters from the address, in French', async () => {
    const api = fakeApi(products([g915]), ...references)
    open('/products?q=g915&statut=publie&marque=3&categorie=1&tri=titre&page=2&taille=50')

    expect(await screen.findByRole('rowheader', { name: /G915/ })).toBeInTheDocument()
    expect(pageCalls(api)[0]).toBe(
      `${PRODUCTS}?search=g915&status=PUBLIE&brandId=3&categoryId=1&sort=title&page=1&size=50`)
    expect(screen.getByRole('textbox', { name: 'Rechercher' })).toHaveValue('g915')
    expect(screen.getByRole('button', { name: 'Publié 17' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('opens a filtered address without a warning while the lists load', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    fakeApi(products([g915]), ...references)
    open('/products?marque=3&categorie=1')

    expect(await screen.findByRole('combobox', { name: 'Catégorie' })).toHaveTextContent('Périphériques')
    expect(screen.getByRole('combobox', { name: 'Marque' })).toHaveTextContent('Logitech')
    // MUI previent quand la valeur choisie n'est pas encore dans la liste.
    expect(warn.mock.calls.flat().join(' ')).not.toContain('out-of-range')
  })

  it('filters on a status chip and goes back to the first page', async () => {
    const api = fakeApi(products([g915], 45), ...references)
    open('/products?page=2')

    await userEvent.click(await screen.findByRole('button', { name: /^Brouillon/ }))

    await waitFor(() => expect(pageCalls(api).at(-1)).toBe(`${PRODUCTS}?status=BROUILLON&page=0&size=20`))
    expect(screen.getByRole('button', { name: /Effacer les filtres/ })).toBeInTheDocument()
  })

  it('searches once the user pauses, not at every letter', async () => {
    const api = fakeApi(products([g915]), ...references)
    open()

    await userEvent.type(await screen.findByRole('textbox', { name: 'Rechercher' }), 'g915')

    await waitFor(() => expect(pageCalls(api).at(-1)).toBe(`${PRODUCTS}?search=g915&page=0&size=20`))
    expect(pageCalls(api).filter((path) => path.includes('search='))).toHaveLength(1)
  })

  it('sorts by title and turns the pages through the API', async () => {
    const api = fakeApi(products([g915, k70], 45), ...references)
    open()

    expect(await screen.findByText('1 à 20 sur 45')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Page suivante' }))
    await waitFor(() => expect(pageCalls(api).at(-1)).toBe(`${PRODUCTS}?page=1&size=20`))

    await userEvent.click(screen.getByRole('button', { name: 'Produit' }))
    await waitFor(() => expect(pageCalls(api).at(-1)).toBe(`${PRODUCTS}?sort=title&page=0&size=20`))
  })

  it('says when no product matches, and clears the filters', async () => {
    const api = fakeApi(products([]), ...references)
    open('/products?statut=archive')

    expect(await screen.findByText('Aucun produit ne correspond à ces filtres.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Effacer les filtres/ }))
    await waitFor(() => expect(pageCalls(api).at(-1)).toBe(`${PRODUCTS}?page=0&size=20`))
  })

  it('tells when the service fails, and tries again', async () => {
    let fail = true
    fakeApi(
      (call) => (fail && call.path.includes('size=20') ? { status: 500, body: { status: 500, message: 'boom' } } : undefined),
      products([g915]),
      ...references,
    )
    open()

    expect(await screen.findByText('Le service ne répond pas pour le moment. Réessayez dans un instant.')).toBeInTheDocument()
    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(await screen.findByRole('rowheader', { name: /G915/ })).toBeInTheDocument()
  })
})
