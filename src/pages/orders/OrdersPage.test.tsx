import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../routes'
import { fakeApi, on } from '../../test/fakeApi'
import { fakeAuth, renderRoutes } from '../../test/renderWithAuth'

const ORDERS = '/api/admin/orders'

const orders = [
  {
    id: 12,
    orderNumber: 'CMD-2026-000012',
    userId: 7,
    status: 'IN_PREPARATION',
    deliveryMode: 'EXPRESS',
    shippingAddressId: 21,
    totalExclTax: 100,
    totalInclTax: 120,
    createdAt: '2026-11-18T10:30:00Z',
    items: [
      {
        id: 31,
        variantId: 4,
        designation: 'Clavier mécanique — Noir',
        unitPriceExclTax: 83.3333,
        vatRate: 20,
        quantity: 1,
        subTotalExclTax: 83.3333,
        subTotalInclTax: 100,
      },
    ],
  },
  {
    id: 11,
    orderNumber: 'CMD-2026-000011',
    userId: 8,
    status: 'DELIVERED',
    deliveryMode: 'STANDARD',
    shippingAddressId: 22,
    totalExclTax: 50,
    totalInclTax: 60,
    createdAt: '2026-11-17T09:00:00Z',
    items: [],
  },
]

function open(url = '/orders') {
  return renderRoutes(routes(), url, fakeAuth(['collaborator']))
}

describe('O13 — back-office des commandes', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows statuses and filters the order list', async () => {
    const api = fakeApi(on('GET', ORDERS, 200, orders))
    open()

    expect(await screen.findByRole('rowheader', { name: /CMD-2026-000012/ })).toBeInTheDocument()
    expect(screen.getByText('En préparation')).toBeInTheDocument()

    await userEvent.type(screen.getByRole('textbox', { name: 'Rechercher' }), '000011')
    expect(screen.getByRole('rowheader', { name: /CMD-2026-000011/ })).toBeInTheDocument()
    expect(screen.queryByText('CMD-2026-000012')).not.toBeInTheDocument()

    expect(api.calls.filter((call) => call.method === 'GET')).toEqual([
      { method: 'GET', path: ORDERS, body: undefined },
    ])
  })

  it('opens the complete order detail and goes back', async () => {
    fakeApi(
      on('GET', `${ORDERS}/12`, 200, orders[0]),
    )
    open('/orders/12')

    expect(await screen.findByRole('heading', { name: 'CMD-2026-000012' })).toBeInTheDocument()
    expect(screen.getByText('Clavier mécanique — Noir')).toBeInTheDocument()
    expect(screen.getByText('#4')).toBeInTheDocument()
    expect(screen.getByText('120,00 €')).toBeInTheDocument()
    expect(screen.getByText('20,00 %')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('link', { name: 'Commandes' }))
    expect(await screen.findByRole('heading', { name: 'Commandes' })).toBeInTheDocument()
  })

  it('shows a load failure with retry', async () => {
    let fail = true
    fakeApi((call) => call.path === ORDERS
      ? (fail ? { status: 503, body: { message: 'Service unavailable' } } : { status: 200, body: orders })
      : undefined)
    open()

    expect(await screen.findByText(/ne répond pas pour le moment/)).toBeInTheDocument()
    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(await screen.findByRole('rowheader', { name: /CMD-2026-000012/ })).toBeInTheDocument()
  })

  it('requests the selected status from the API', async () => {
    const api = fakeApi(on('GET', `${ORDERS}?status=SHIPPED`, 200, []))
    open()

    await userEvent.click(await screen.findByRole('combobox', { name: 'Statut' }))
    await userEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Expédiée' }))

    await screen.findByText('Aucune commande pour ce filtre.')
    expect(api.calls.filter((call) => call.method === 'GET')).toEqual([
      { method: 'GET', path: ORDERS, body: undefined },
      { method: 'GET', path: `${ORDERS}?status=SHIPPED`, body: undefined },
    ])
  })
})
