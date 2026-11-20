import type { ProductQuery, ProductSort, ProductStatus } from './api'

/**
 * The filters of the product list live in the address, in French:
 * /products?statut=brouillon&marque=3&page=2. A reload, the back button or a
 * link sent to a colleague lands on the same view. Anything unreadable falls
 * back to the default instead of breaking the screen.
 */
export const PAGE_SIZES = [20, 50, 100] as const

const STATUS_IN_URL: Record<string, ProductStatus> = { publie: 'PUBLIE', brouillon: 'BROUILLON', archive: 'ARCHIVE' }
const SORT_IN_URL: Record<string, ProductSort> = { modifie: 'updated', titre: 'title' }

function id(value: string | null): number | null {
  return value !== null && /^\d{1,15}$/.test(value) ? Number(value) : null
}

export function queryFromParams(params: URLSearchParams): ProductQuery {
  const page = Number(params.get('page'))
  const size = Number(params.get('taille'))
  return {
    search: params.get('q') ?? '',
    status: STATUS_IN_URL[params.get('statut') ?? ''] ?? null,
    brandId: id(params.get('marque')),
    categoryId: id(params.get('categorie')),
    sort: SORT_IN_URL[params.get('tri') ?? ''] ?? 'updated',
    // Les pages commencent a 1 dans l'adresse, pour les humains, et a 0 pour l'API.
    page: Number.isInteger(page) && page >= 1 ? page - 1 : 0,
    size: (PAGE_SIZES as readonly number[]).includes(size) ? size : PAGE_SIZES[0],
  }
}

/** The address of a query; the default values are left out to keep it short. */
export function paramsFromQuery(query: ProductQuery): URLSearchParams {
  const params = new URLSearchParams()
  if (query.search.trim()) params.set('q', query.search.trim())
  const status = Object.entries(STATUS_IN_URL).find(([, value]) => value === query.status)?.[0]
  if (status) params.set('statut', status)
  if (query.brandId !== null) params.set('marque', String(query.brandId))
  if (query.categoryId !== null) params.set('categorie', String(query.categoryId))
  if (query.sort !== 'updated') params.set('tri', Object.entries(SORT_IN_URL).find(([, value]) => value === query.sort)![0])
  if (query.page > 0) params.set('page', String(query.page + 1))
  if (query.size !== PAGE_SIZES[0]) params.set('taille', String(query.size))
  return params
}

/** Whether any filter narrows the list, so that « clear the filters » means something. */
export function isFiltered(query: ProductQuery): boolean {
  return Boolean(query.search.trim()) || query.status !== null || query.brandId !== null || query.categoryId !== null
}
