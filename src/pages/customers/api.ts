import type { Api } from '../../api/useApi'

/** Spring Page<UserAdminResponseDto> returned by GET /api/admin/users. */
export type Page<T> = {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export type Customer = {
  id: number
  authProviderId: string | null
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
}

export type CustomerOrderItem = {
  id: number
  variantId: number
  designation: string
  unitPriceExclTax: number
  vatRate: number
  quantity: number
  subTotalExclTax: number
  subTotalInclTax: number
}

export type CustomerOrder = {
  id: number
  orderNumber: string
  userId: number
  status: string
  deliveryMode: string
  shippingAddressId: number | null
  totalExclTax: number
  totalInclTax: number
  createdAt: string
  items: CustomerOrderItem[]
}

export type CustomerSpendSummary = {
  totalSpentInclTax: number
  paidOrderCount: number
  excludedOrderCount: number
  averageBasketInclTax: number | null
}

/** Only paid orders count toward revenue/spend, matching the Statistics screen. */
const PAID_ORDER_STATUSES = new Set(['IN_PREPARATION', 'SHIPPED', 'DELIVERED'])

export function customersApi(api: Api) {
  return {
    list: (params: { search?: string; page?: number; size?: number }) => {
      const query = new URLSearchParams()
      if (params.search?.trim()) query.set('search', params.search.trim())
      query.set('page', String(params.page ?? 0))
      query.set('size', String(params.size ?? 20))
      return api<Page<Customer>>(`/api/admin/users?${query.toString()}`)
    },
    ordersByUser: (userId: number) => api<CustomerOrder[]>(`/api/admin/orders?userId=${userId}`),
  }
}

/** Resolves a single customer by numeric ID when the detail page is opened directly via URL. */
export async function findCustomerById(api: Api, id: number): Promise<Customer | null> {
  const client = customersApi(api)
  const pageSize = 100
  const first = await client.list({ page: 0, size: pageSize })
  const foundInFirst = first.content.find((customer) => customer.id === id)
  if (foundInFirst) return foundInFirst

  for (let page = 1; page < first.totalPages; page += 1) {
    const next = await client.list({ page, size: pageSize })
    const found = next.content.find((customer) => customer.id === id)
    if (found) return found
  }
  return null
}

export function customerDisplayName(customer: Pick<Customer, 'firstName' | 'lastName' | 'email'>): string {
  return [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email
}

export function summarizeCustomerOrders(orders: readonly CustomerOrder[]): CustomerSpendSummary {
  let totalSpentInclTax = 0
  let paidOrderCount = 0
  let excludedOrderCount = 0

  for (const order of orders) {
    if (!PAID_ORDER_STATUSES.has(order.status)) {
      excludedOrderCount += 1
      continue
    }
    paidOrderCount += 1
    totalSpentInclTax += Number(order.totalInclTax) || 0
  }

  return {
    totalSpentInclTax,
    paidOrderCount,
    excludedOrderCount,
    averageBasketInclTax: paidOrderCount > 0 ? totalSpentInclTax / paidOrderCount : null,
  }
}

export function sortOrdersNewestFirst(orders: readonly CustomerOrder[]): CustomerOrder[] {
  return [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

const ORDER_STATUS_INFO: Record<string, { label: string; tone: 'ok' | 'neutral' | 'danger' }> = {
  NEW: { label: 'Nouvelle', tone: 'neutral' },
  IN_PREPARATION: { label: 'En préparation', tone: 'neutral' },
  SHIPPED: { label: 'Expédiée', tone: 'ok' },
  DELIVERED: { label: 'Livrée', tone: 'ok' },
  CANCELLED: { label: 'Annulée', tone: 'danger' },
}

export function orderStatusPresentation(status: string): { label: string; tone: 'ok' | 'neutral' | 'danger' } {
  return ORDER_STATUS_INFO[status] ?? { label: status || 'Inconnu', tone: 'neutral' }
}

const DELIVERY_MODE_LABELS: Record<string, string> = {
  STANDARD: 'Standard',
  EXPRESS: 'Express',
}

export function deliveryModeLabel(mode: string): string {
  return DELIVERY_MODE_LABELS[mode] ?? mode ?? '—'
}