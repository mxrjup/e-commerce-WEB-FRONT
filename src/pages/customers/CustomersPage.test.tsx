import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../routes'
import { fakeApi, on } from '../../test/fakeApi'
import { fakeAuth, renderRoutes } from '../../test/renderWithAuth'
import { summarizeCustomerOrders } from './api'

const alice = {
  id: 12,
  authProviderId: 'sub-alice',
  email: 'alice.bernard@log.test',
  firstName: 'Alice',
  lastName: 'Bernard',
  phone: '06 12 34 56 78',
}

const bob = {
  id: 13,
  authProviderId: 'sub-bob',
  email: 'bob@log.test',
  firstName: null,
  lastName: null,
  phone: null,
}

const aliceOrders = [
  {
    id: 101,
    orderNumber: 'CMD-2026-000101',
    userId: 12,
    status: 'DELIVERED',
    deliveryMode: 'STANDARD',
    shippingAddressId: 1,
    totalExclTax: 100,
    totalInclTax: 120,
    createdAt: '2026-10-15T10:30:00Z',
    items: [
      {
        id: 1,
        variantId: 501,
        designation: 'Écran IPS 27" QHD',
        unitPriceExclTax: 100,
        vatRate: 20,
        quantity: 1,
        subTotalExclTax: 100,
        subTotalInclTax: 120,
      },
    ],
  },
  {
    id: 102,
    orderNumber: 'CMD-2026-000102',
    userId: 12,
    status: 'SHIPPED',
    deliveryMode: 'EXPRESS',
    shippingAddressId: 1,
    totalExclTax: 50,
    totalInclTax: 60,
    createdAt: '2026-11-02T14:15:00Z',
    items: [
      {
        id: 2,
        variantId: 502,
        designation: 'Clavier mécanique compact',
        unitPriceExclTax: 25,
        vatRate: 20,
        quantity: 2,
        subTotalExclTax: 50,
        subTotalInclTax: 60,
      },
    ],
  },
  {
    id: 103,
    orderNumber: 'CMD-2026-000103',
    userId: 12,
    status: 'CANCELLED',
    deliveryMode: 'STANDARD',
    shippingAddressId: 1,
    totalExclTax: 200,
    totalInclTax: 240,
    createdAt: '2026-11-04T09:00:00Z',
    items: [],
  },
  {
    id: 104,
    orderNumber: 'CMD-2026-000104',
    userId: 12,
    status: 'NEW',
    deliveryMode: 'STANDARD',
    shippingAddressId: 1,
    totalExclTax: 400,
    totalInclTax: 480,
    createdAt: '2026-11-05T11:00:00Z',
    items: [],
  },
]

function pageOf<T>(content: T[]) {
  return { content, totalElements: content.length, totalPages: 1, number: 0, size: 20 }
}

function open(path = '/customers') {
  return renderRoutes(routes(), path, fakeAuth(['collaborator']))
}

describe('the customers screens (U09)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists customers and searches through the admin users API', async () => {
    fakeApi(
      on('GET', '/api/admin/users?page=0&size=20', 200, pageOf([alice, bob])),
      on('GET', '/api/admin/users?search=alice&page=0&size=20', 200, pageOf([alice])),
    )
    open()

    expect(await screen.findByText('Alice Bernard')).toBeInTheDocument()
    expect(screen.getByText('06 12 34 56 78')).toBeInTheDocument()
    expect(screen.getByText('2 clients')).toBeInTheDocument()

    await userEvent.type(screen.getByRole('textbox', { name: 'Rechercher un client' }), 'alice')

    expect(await screen.findByText('1 client pour « alice »')).toBeInTheDocument()
    expect(screen.queryByText('bob@log.test')).not.toBeInTheDocument()
  })

  it('opens a customer sheet, shows total spent for paid orders only, and expands order items', async () => {
    fakeApi(
      on('GET', '/api/admin/users?page=0&size=20', 200, pageOf([alice, bob])),
      on('GET', '/api/admin/orders?userId=12', 200, aliceOrders),
    )
    open()

    await userEvent.click(await screen.findByRole('button', { name: 'Ouvrir la fiche de Alice Bernard' }))

    expect(await screen.findByRole('heading', { name: 'Alice Bernard' })).toBeInTheDocument()
    expect(screen.getByText(/180,00\s€/)).toBeInTheDocument()
    expect(screen.getByText('Hors 2 commandes non payées ou annulées')).toBeInTheDocument()
    expect(screen.getByText(/Panier moyen : 90,00\s€/)).toBeInTheDocument()

    const historyTable = screen.getByRole('table', { name: 'Historique des commandes du client' })
    const rows = within(historyTable).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('CMD-2026-000104')
    expect(rows[2]).toHaveTextContent('CMD-2026-000103')
    expect(rows[3]).toHaveTextContent('CMD-2026-000102')
    expect(rows[4]).toHaveTextContent('CMD-2026-000101')

    await userEvent.click(screen.getByRole('button', { name: 'Afficher les articles de la commande CMD-2026-000102' }))
    expect(await screen.findByText('Clavier mécanique compact')).toBeInTheDocument()
  })

  it('loads a customer directly from /customers/:id even without navigation state', async () => {
    fakeApi(
      on('GET', '/api/admin/users?page=0&size=100', 200, pageOf([alice, bob])),
      on('GET', '/api/admin/orders?userId=12', 200, []),
    )
    open('/customers/12')

    expect(await screen.findByRole('heading', { name: 'Alice Bernard' })).toBeInTheDocument()
    expect(screen.getByText('Ce client n’a pas encore passé de commande.')).toBeInTheDocument()
  })
})

describe('summarizeCustomerOrders', () => {
  it('computes total spent and average basket from paid orders only', () => {
    const summary = summarizeCustomerOrders(aliceOrders)
    expect(summary.totalSpentInclTax).toBe(180)
    expect(summary.paidOrderCount).toBe(2)
    expect(summary.excludedOrderCount).toBe(2)
    expect(summary.averageBasketInclTax).toBe(90)
  })
})