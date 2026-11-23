export type Granularity = 'DAY' | 'WEEK' | 'MONTH'
export type Ranking = 'QUANTITY' | 'REVENUE'
export type RevenuePoint = { date: string; revenueExclTax: number | null; revenueInclTax: number | null; orderCount: number }
/** OrderStatsResponse in order-service. Money is serialized from BigDecimal. */
export type OrderStats = {
  from: string; to: string; granularity: Granularity; ranking: Ranking
  revenueExclTax: number | null; revenueInclTax: number | null; orderCount: number
  averageBasket: number | null; margin: number | null; knownMargin: number | null
  marginComplete: boolean; revenueComplete: boolean; topProductsComplete: boolean
  curve: RevenuePoint[]
  topProducts: { productId: number; quantity: number; revenueExclTax: number | null }[]
  alerts: { code: string; count: number }[]
}
export function statsPath(from: string, to: string, granularity: Granularity, ranking: Ranking) {
  return `/api/admin/orders/stats?${new URLSearchParams({ from, to, granularity, ranking })}`
}
