import type { Api } from '../../api/useApi'

export type OrderStatus = 'NEW' | 'IN_PREPARATION' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

export type OrderItem = {
  id: number
  variantId: number
  designation: string
  unitPriceExclTax: number
  vatRate: number
  quantity: number
  subTotalExclTax: number
  subTotalInclTax: number
}

export type AdminOrder = {
  id: number
  orderNumber: string
  userId: number
  status: OrderStatus
  deliveryMode: string
  shippingAddressId: number | null
  totalExclTax: number
  totalInclTax: number
  createdAt: string
  items: OrderItem[]
}

export const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: 'NEW', label: 'Nouvelle' },
  { value: 'IN_PREPARATION', label: 'En préparation' },
  { value: 'SHIPPED', label: 'Expédiée' },
  { value: 'DELIVERED', label: 'Livrée' },
  { value: 'CANCELLED', label: 'Annulée' },
]

export function orderStatusPresentation(status: OrderStatus) {
  switch (status) {
    case 'SHIPPED':
    case 'DELIVERED':
      return { label: ORDER_STATUSES.find((item) => item.value === status)?.label ?? status, tone: 'ok' as const }
    case 'CANCELLED':
      return { label: 'Annulée', tone: 'danger' as const }
    default:
      return { label: ORDER_STATUSES.find((item) => item.value === status)?.label ?? status, tone: 'neutral' as const }
  }
}

export function deliveryModeLabel(mode: string | null): string {
  const labels: Record<string, string> = {
    STANDARD: 'Standard',
    EXPRESS: 'Express',
    CLICK_AND_COLLECT: 'Retrait magasin',
    RELAY_POINT: 'Relais',
  }
  return mode ? (labels[mode] ?? mode) : '—'
}

export function ordersApi(api: Api) {
  return {
    list: (params: { status?: OrderStatus; userId?: number; from?: string; to?: string }) => {
      const query = new URLSearchParams()
      if (params.status) query.set('status', params.status)
      if (params.userId) query.set('userId', String(params.userId))
      if (params.from) query.set('from', params.from)
      if (params.to) query.set('to', params.to)
      const suffix = query.size > 0 ? `?${query.toString()}` : ''
      return api<AdminOrder[]>(`/api/admin/orders${suffix}`)
    },
    get: (id: number) => api<AdminOrder>(`/api/admin/orders/${id}`),
  }
}
