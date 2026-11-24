import type { Translation } from '../../api/errors'
import type { ProductStatus } from '../products/api'

/**
 * The stock of the variants (C07 in catalog-service): every variant,
 * whatever the status of its product, with its exact stock, which the
 * storefront never shows.
 */
export type InventoryItem = {
  variantId: number
  sku: string
  /** « Logitech G915 TKL - Noir, AZERTY » */
  designation: string
  productId: number
  productSlug: string
  productStatus: ProductStatus
  stock: number
  alertThreshold: number
  /** At or below the alert threshold. */
  lowStock: boolean
}

export type InventoryQuery = {
  search: string
  /** Only the variants at or below their alert threshold. */
  alerts: boolean
  /** From 0, as the API counts. */
  page: number
  size: number
}

export function inventoryPath(query: InventoryQuery): string {
  const params = new URLSearchParams()
  if (query.search.trim()) params.set('search', query.search.trim())
  if (query.alerts) params.set('lowStock', 'true')
  params.set('page', String(query.page))
  params.set('size', String(query.size))
  return `/api/admin/catalog/inventory?${params}`
}

/**
 * A correction is a difference, never a final stock: « +5 » received, « -1 »
 * broken. A paid order that takes a unit while the dialog is open keeps its
 * sale: the service adds the difference to the stock as it is then (C07).
 */
export const adjustmentPath = (variantId: number) => `/api/admin/catalog/variants/${variantId}/stock-adjustments`
export const thresholdPath = (variantId: number) => `/api/admin/catalog/variants/${variantId}/alert-threshold`

/** The same bounds as catalog-service (StockAdjustmentRequest, AlertThresholdRequest). */
export const MAX_UNITS = 1_000_000

/** The messages of catalog-service for the stock, in French. */
export const translations: Translation[] = [
  [/does not have enough stock to remove (\d+) units$/,
    (units) => `Le stock a baissé entre-temps : il n’en reste plus assez pour retirer ${units} unités. La liste a été rechargée.`],
  [/^Variant \d+ not found$/, () => 'Cette variante n’existe plus : elle a été supprimée entre-temps. La liste a été rechargée.'],
]
