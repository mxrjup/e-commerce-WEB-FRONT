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

/**
 * A variant as the back-office sees it (C04): prices excluding VAT, the
 * purchase price and the exact stock included.
 */
export type AdminVariant = {
  id: number
  sku: string
  designation: string
  purchasePriceExclTax: number
  salePriceExclTax: number
  /** null when the variant is not on sale. */
  discountPriceExclTax: number | null
  ecoTax: number | null
  weightKg: number
  stock: number
  alertThreshold: number
  lowStock: boolean
  values: { attributeId: number; attribute: string; valueId: number; value: string }[]
  images: { id: number; url: string; position: number }[]
}

export type Specification = { key: string; value: string }

/** A whole product sheet: GET /api/admin/catalog/products/{id}. */
export type ProductDetail = {
  id: number
  title: string
  slug: string
  /** HTML from the editor, null when empty. */
  description: string | null
  status: ProductStatus
  brand: Reference
  category: Reference
  vatRate: { id: number; label: string; rate: number }
  universes: Reference[]
  specifications: Specification[]
  variants: AdminVariant[]
  createdAt: string
  updatedAt: string
}

/**
 * What POST and PUT /products take. A PUT replaces the sheet: the
 * specifications are the whole list, in display order. Without a slug, the
 * service derives one from the title at creation and keeps it afterwards.
 */
export type ProductRequest = {
  title: string
  slug: string | null
  description: string | null
  brandId: number
  categoryId: number
  vatRateId: number
  universeIds: number[]
  specifications: Specification[]
}

export const productPath = (id: number) => `${PRODUCTS}/${id}`
export const variantsPath = (productId: number) => `${productPath(productId)}/variants`
export const variantPath = (id: number) => `/api/admin/catalog/variants/${id}`

/**
 * What POST /products/{id}/variants and PUT /variants/{id} take (C04).
 * `initialStock` and `alertThreshold` are for a creation only: afterwards the
 * stock moves through the inventory (C07, C20) and the paid orders (C21), and
 * a PUT that sends them is refused.
 */
export type VariantRequest = {
  sku: string
  purchasePriceExclTax: number
  salePriceExclTax: number
  discountPriceExclTax: number | null
  ecoTax: number | null
  weightKg: number
  valueIds: number[]
  initialStock?: number
  alertThreshold?: number
}
export const SPECIFICATION_KEYS = '/api/admin/catalog/specification-keys'

/**
 * The price a customer pays for one unit, as catalog-service computes it
 * (Prices.currentInclTax): the discount if any, plus the eco-tax, then the
 * VAT rounded half up to the cent. Computed in whole cents and hundredths
 * of a percent, so that no float error moves a cent: 0.1 + 0.2 is not 0.3.
 */
export function unitPriceInclTax(variant: AdminVariant, ratePercent: number): number {
  return priceInclTax(variant.discountPriceExclTax ?? variant.salePriceExclTax, variant.ecoTax, ratePercent)
}

/** The same computation from the figures of a form, before the variant exists. */
export function priceInclTax(currentExclTax: number, ecoTax: number | null, ratePercent: number): number {
  const cents = Math.round((currentExclTax + (ecoTax ?? 0)) * 100)
  const rate = Math.round(ratePercent * 100)
  const vatCents = Math.floor((cents * rate + 5000) / 10000)
  return (cents + vatCents) / 100
}

/** What the shop earns on one unit, before VAT: the price it sells at, minus what it paid. Eco-tax aside: it is passed on. */
export function marginExclTax(currentExclTax: number, purchaseExclTax: number): number {
  return Math.round((currentExclTax - purchaseExclTax) * 100) / 100
}

export const STATUSES: readonly { status: ProductStatus; label: string }[] = [
  { status: 'PUBLIE', label: 'Publié' },
  { status: 'BROUILLON', label: 'Brouillon' },
  { status: 'ARCHIVE', label: 'Archivé' },
]

export function statusLabel(status: ProductStatus): string {
  return STATUSES.find((entry) => entry.status === status)?.label ?? status
}
