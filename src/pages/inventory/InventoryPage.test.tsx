import { screen, waitFor, within } from '@testing-library/react'
import userEventLib, { PointerEventsCheckLevel } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../routes'
import { fakeApi, on } from '../../test/fakeApi'
import { fakeAuth, renderRoutes } from '../../test/renderWithAuth'
import type { InventoryItem } from './api'
import { paramsFromQuery, queryFromParams } from './inventoryQuery'

const userEvent = userEventLib.setup({ delay: null, pointerEventsCheck: PointerEventsCheckLevel.Never })
const INVENTORY = '/api/admin/catalog/inventory'

const g915: InventoryItem = {
  variantId: 4, sku: 'LOGI-G915TKL-AZ-NOI', designation: 'Logitech G915 TKL - Noir, AZERTY',
  productId: 2, productSlug: 'logitech-g915-tkl', productStatus: 'PUBLIE', stock: 8, alertThreshold: 3, lowStock: false,
}
const k70: InventoryItem = {
  ...g915, variantId: 7, sku: 'CORS-K70PRO-AZ-NOI', designation: 'Corsair K70 RGB Pro - Noir, AZERTY', productId: 3, stock: 0, lowStock: true,
}
const draft: InventoryItem = {
  ...g915, variantId: 30, sku: 'CORS-VENG-DDR5-32', designation: 'Corsair Vengeance RGB DDR5', productId: 18,
  productStatus: 'BROUILLON', stock: 2, alertThreshold: 2, lowStock: true,
}

/** The inventory API: one-line pages count the alerts, the others give these rows out of `total`. */
function inventory(rows: InventoryItem[], alerts: number, total = rows.length) {
  return (call: { method: string; path: string }) => {
    if (call.method !== 'GET' || !call.path.startsWith(`${INVENTORY}?`)) return undefined
    const params = new URLSearchParams(call.path.split('?')[1])
    const size = Number(params.get('size'))
    if (size === 1) return { status: 200, body: { content: [], page: 0, size: 1, totalElements: alerts, totalPages: 1 } }
    const content = params.get('lowStock') === 'true' ? rows.filter((row) => row.lowStock) : rows
    return { status: 200, body: { content, page: Number(params.get('page')), size, totalElements: total, totalPages: 1 } }
  }
}

function pages(api: ReturnType<typeof fakeApi>) {
  return api.calls.filter((call) => call.path.startsWith(`${INVENTORY}?`) && !/size=1$/.test(call.path)).map((call) => call.path)
}

function open(url = '/inventory') {
  return renderRoutes(routes(), url, fakeAuth(['collaborator']))
}

describe('the inventory (C20)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the exact stock of every variant, and counts the alerts', async () => {
    fakeApi(inventory([g915, k70, draft], 2))
    open()

    const k70Row = (await screen.findByRole('rowheader', { name: /Corsair K70/ })).closest('tr')!
    expect(within(k70Row).getByText('Rupture')).toBeInTheDocument()
    expect(within(k70Row).getByRole('link', { name: /Corsair K70/ })).toHaveAttribute('href', '/products/3')
    const draftRow = screen.getByRole('rowheader', { name: /Vengeance/ }).closest('tr')!
    expect(within(draftRow).getByText('Stock bas')).toBeInTheDocument()
    expect(within(draftRow).getByText('Brouillon')).toBeInTheDocument()
    expect(await screen.findByText('2 variantes sont à ou sous leur seuil d’alerte.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alertes seulement 2' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('lists the alerts alone, from the banner, and keeps it in the address', async () => {
    const api = fakeApi(inventory([g915, k70, draft], 2))
    open()

    await userEvent.click(await screen.findByRole('button', { name: 'Voir les alertes' }))

    await waitFor(() => expect(pages(api).at(-1)).toBe(`${INVENTORY}?lowStock=true&page=0&size=20`))
    expect(await screen.findByRole('button', { name: 'Alertes seulement 2' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('rowheader', { name: /G915/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/sont à ou sous leur seuil/)).not.toBeInTheDocument()
  })

  it('reads the search and the page from the address', async () => {
    const api = fakeApi(inventory([g915], 0, 45))
    open('/inventory?q=g915&alertes=oui&page=2&taille=50')

    expect(await screen.findByRole('textbox', { name: 'Rechercher' })).toHaveValue('g915')
    expect(pages(api)[0]).toBe(`${INVENTORY}?search=g915&lowStock=true&page=1&size=50`)
  })

  it('adds the units received, sending only the difference', async () => {
    const api = fakeApi(
      on('POST', '/api/admin/catalog/variants/4/stock-adjustments', 200, { ...g915, stock: 13 }),
      inventory([g915, k70], 1),
    )
    open()

    await userEvent.click(await screen.findByRole('button', { name: 'Ajuster le stock de LOGI-G915TKL-AZ-NOI' }))
    const dialog = await screen.findByRole('dialog', { name: 'Ajuster le stock de LOGI-G915TKL-AZ-NOI' })
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Quantité' }), '5')
    expect(within(dialog).getByRole('status')).toHaveTextContent('Stock : 8 → 13')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByText('Stock de LOGI-G915TKL-AZ-NOI : 13 unités.')).toBeInTheDocument()
    expect(api.writes()).toEqual([{ method: 'POST', path: '/api/admin/catalog/variants/4/stock-adjustments', body: { delta: 5 } }])
  })

  it('refuses to take out more than the stock, before and after calling the API', async () => {
    const api = fakeApi(
      on('POST', '/api/admin/catalog/variants/4/stock-adjustments', 409,
        { status: 409, message: 'Variant 4 does not have enough stock to remove 8 units' }),
      inventory([g915], 0),
    )
    open()

    await userEvent.click(await screen.findByRole('button', { name: 'Ajuster le stock de LOGI-G915TKL-AZ-NOI' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Sortie (casse, perte)' }))
    const quantity = within(dialog).getByRole('textbox', { name: 'Quantité' })
    await userEvent.type(quantity, '9')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))
    expect(within(dialog).getByText('Il n’y a que 8 unités en stock.')).toBeInTheDocument()
    expect(api.writes()).toEqual([])

    // Le stock affiche permettait la sortie, mais une commande payee entre-temps l'a fait baisser.
    await userEvent.clear(quantity)
    await userEvent.type(quantity, '8')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))
    expect(await within(dialog).findByText(/Le stock a baissé entre-temps : il n’en reste plus assez pour retirer 8 unités/)).toBeInTheDocument()
    expect(api.writes()[0].body).toEqual({ delta: -8 })
    // La liste se recharge pour montrer le vrai stock.
    await waitFor(() => expect(pages(api).length).toBeGreaterThan(1))
  })

  it('changes the alert threshold', async () => {
    const api = fakeApi(
      on('PUT', '/api/admin/catalog/variants/4/alert-threshold', 200, { ...g915, alertThreshold: 10, lowStock: true }),
      inventory([g915], 0),
    )
    open()

    await userEvent.click(await screen.findByRole('button', { name: 'Modifier le seuil de LOGI-G915TKL-AZ-NOI' }))
    const dialog = await screen.findByRole('dialog', { name: 'Seuil d’alerte de LOGI-G915TKL-AZ-NOI' })
    const field = within(dialog).getByRole('textbox', { name: 'Seuil d’alerte' })
    expect(field).toHaveValue('3')
    await userEvent.clear(field)
    await userEvent.type(field, '10')
    expect(within(dialog).getByRole('status')).toHaveTextContent('Avec 8 unités en stock, elle sera en alerte.')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByText('Seuil d’alerte de LOGI-G915TKL-AZ-NOI : 10.')).toBeInTheDocument()
    expect(api.writes()).toEqual([{ method: 'PUT', path: '/api/admin/catalog/variants/4/alert-threshold', body: { alertThreshold: 10 } }])
  })
})

describe('the inventory address', () => {
  it('goes there and back, and ignores what it cannot read', () => {
    const query = { search: 'mx keys', alerts: true, page: 2, size: 50 }
    expect(paramsFromQuery(query).toString()).toBe('q=mx+keys&alertes=oui&page=3&taille=50')
    expect(queryFromParams(paramsFromQuery(query))).toEqual(query)
    expect(queryFromParams(new URLSearchParams('alertes=1&page=-2&taille=7'))).toEqual({ search: '', alerts: false, page: 0, size: 20 })
  })
})
