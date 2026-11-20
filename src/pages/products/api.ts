/**
 * The back-office product list of catalog-service (C04):
 * GET /api/admin/catalog/products, every status included.
 */
export const PRODUCTS = '/api/admin/catalog/products'

export type ProductStatus = 'BROUILLON' | 'PUBLIE' | 'ARCHIVE'

export type Reference = { id: number; name: string }

/**
 * A row of the list.
 *
 * @property priceFromExclTax the lowest current price of the variants, excluding VAT; null without variant
 * @property totalStock the units of all the variants together
 * @property lowStock at least one variant is at or below its alert threshold
 */
export type ProductSummary = {
  id: number
  title: string
  slug: string
  status: ProductStatus
  brand: Reference
  category: Reference
  variantCount: number
  priceFromExclTax: number | null
  totalStock: number
  lowStock: boolean
  updatedAt: string
}

export type Page<T> = { content: T[]; page: number; size: number; totalElements: number; totalPages: number }

/** The sorts the API offers: last modified first (its default), or by title. */
export type ProductSort = 'updated' | 'title'

export type ProductQuery = {
  search: string
  status: ProductStatus | null
  brandId: number | null
  categoryId: number | null
  sort: ProductSort
  /** From 0, as the API counts. */
  page: number
  size: number
}

/** The path of one page of the list; the default values are left out. */
export function productsPath(query: ProductQuery): string {
  const params = new URLSearchParams()
  if (query.search.trim()) params.set('search', query.search.trim())
  if (query.status) params.set('status', query.status)
  if (query.brandId !== null) params.set('brandId', String(query.brandId))
  if (query.categoryId !== null) params.set('categoryId', String(query.categoryId))
  if (query.sort !== 'updated') params.set('sort', query.sort)
  params.set('page', String(query.page))
  params.set('size', String(query.size))
  return `${PRODUCTS}?${params}`
}

export const STATUSES: readonly { status: ProductStatus; label: string }[] = [
  { status: 'PUBLIE', label: 'Publié' },
  { status: 'BROUILLON', label: 'Brouillon' },
  { status: 'ARCHIVE', label: 'Archivé' },
]

export function statusLabel(status: ProductStatus): string {
  return STATUSES.find((entry) => entry.status === status)?.label ?? status
}
