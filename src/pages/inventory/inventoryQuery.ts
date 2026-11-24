import { PAGE_SIZES } from '../products/productQuery'
import type { InventoryQuery } from './api'

/**
 * The filters of the inventory live in the address, in French, like the
 * product list: /inventory?alertes=oui&q=g915&page=2. Anything unreadable
 * falls back to the default.
 */
export function queryFromParams(params: URLSearchParams): InventoryQuery {
  const page = Number(params.get('page'))
  const size = Number(params.get('taille'))
  return {
    search: params.get('q') ?? '',
    alerts: params.get('alertes') === 'oui',
    page: Number.isInteger(page) && page >= 1 ? page - 1 : 0,
    size: (PAGE_SIZES as readonly number[]).includes(size) ? size : PAGE_SIZES[0],
  }
}

export function paramsFromQuery(query: InventoryQuery): URLSearchParams {
  const params = new URLSearchParams()
  if (query.search.trim()) params.set('q', query.search.trim())
  if (query.alerts) params.set('alertes', 'oui')
  if (query.page > 0) params.set('page', String(query.page + 1))
  if (query.size !== PAGE_SIZES[0]) params.set('taille', String(query.size))
  return params
}
