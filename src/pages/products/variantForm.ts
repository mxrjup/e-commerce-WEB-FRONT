import type { Translation } from '../../api/errors'
import { decimalPlaces, parseDecimal } from '../../lib/format'
import { slugify } from '../../lib/slugs'
import { check, maxLength, required } from '../../lib/validation'
import type { Attribute } from '../references/api'
import type { AdminVariant, VariantRequest } from './api'

/**
 * A variant as typed. Amounts are text, typed the French way (« 89,90 »);
 * `values` holds the chosen value id of each attribute, '' for none.
 */
export type VariantForm = {
  sku: string
  purchase: string
  sale: string
  discount: string
  ecoTax: string
  weight: string
  values: Record<number, string>
  initialStock: string
  alertThreshold: string
}

export type VariantErrors = Partial<Record<Exclude<keyof VariantForm, 'values'> | 'values', string>>

/** The same limits as catalog-service (AdminVariantRequest). */
const MONEY_MAX = 99_999_999.99
const WEIGHT_MAX = 99_999.999
const STOCK_MAX = 1_000_000

export function emptyVariantForm(): VariantForm {
  return { sku: '', purchase: '', sale: '', discount: '', ecoTax: '', weight: '', values: {}, initialStock: '0', alertThreshold: '0' }
}

const typed = (value: number | null) => (value === null ? '' : String(value).replace('.', ','))

export function variantFormOf(variant: AdminVariant): VariantForm {
  return {
    sku: variant.sku,
    purchase: typed(variant.purchasePriceExclTax),
    sale: typed(variant.salePriceExclTax),
    discount: typed(variant.discountPriceExclTax),
    ecoTax: typed(variant.ecoTax),
    weight: typed(variant.weightKg),
    values: Object.fromEntries(variant.values.map((value) => [value.attributeId, String(value.valueId)])),
    initialStock: String(variant.stock),
    alertThreshold: String(variant.alertThreshold),
  }
}

/** The chosen values, as the ids the API takes, in a stable order. */
export function valueIdsOf(form: VariantForm): number[] {
  return Object.values(form.values).filter(Boolean).map(Number).sort((a, b) => a - b)
}

const sameValues = (a: number[], b: number[]) => a.length === b.length && a.every((id, index) => id === b[index])
const idsOf = (variant: AdminVariant) => variant.values.map((value) => value.valueId).sort((a, b) => a - b)

function amount(text: string, { optional = false, decimals = 2, max = MONEY_MAX } = {}): string | null {
  if (!text.trim()) return optional ? null : 'Ce champ est obligatoire.'
  const value = parseDecimal(text)
  if (value === null) return 'Un nombre, par exemple 89,90.'
  if (decimalPlaces(text) > decimals) return decimals === 2 ? 'Deux décimales au maximum.' : 'Trois décimales au maximum.'
  if (value > max) return 'Montant trop élevé.'
  return null
}

function count(text: string): string | null {
  if (!/^\d{1,7}$/.test(text.trim())) return 'Un nombre entier, 0 ou plus.'
  return Number(text.trim()) > STOCK_MAX ? `${STOCK_MAX.toLocaleString('fr-FR')} au maximum.` : null
}

/**
 * @param others the other variants of the product: two variants with the
 *               same values could not be told apart on the product page
 */
export function validateVariant(form: VariantForm, editing: AdminVariant | null, others: AdminVariant[]): VariantErrors {
  const sku = form.sku.trim()
  const errors: VariantErrors = {
    sku: check(form.sku, required, maxLength(64))
      ?? (others.some((other) => other.sku === sku) ? 'Une autre variante de ce produit porte déjà ce SKU.' : undefined),
    purchase: amount(form.purchase) ?? undefined,
    sale: amount(form.sale) ?? undefined,
    discount: amount(form.discount, { optional: true }) ?? undefined,
    ecoTax: amount(form.ecoTax, { optional: true }) ?? undefined,
    weight: amount(form.weight, { decimals: 3, max: WEIGHT_MAX }) ?? undefined,
  }
  const sale = parseDecimal(form.sale)
  const discount = parseDecimal(form.discount)
  if (!errors.discount && !errors.sale && discount !== null && sale !== null && discount >= sale) {
    errors.discount = 'Le prix remisé doit rester sous le prix de vente.'
  }
  if (!editing) {
    errors.initialStock = count(form.initialStock) ?? undefined
    errors.alertThreshold = count(form.alertThreshold) ?? undefined
  }
  const ids = valueIdsOf(form)
  const twin = others.find((other) => sameValues(idsOf(other), ids))
  if (twin) {
    errors.values = ids.length === 0
      ? `La variante ${twin.sku} n’a déjà aucune valeur : choisissez les valeurs qui distinguent celle-ci.`
      : `La variante ${twin.sku} a déjà exactement ces valeurs.`
  }
  return errors
}

export function hasVariantErrors(errors: VariantErrors): boolean {
  return Object.values(errors).some(Boolean)
}

export function variantRequest(form: VariantForm, creating: boolean): VariantRequest {
  const request: VariantRequest = {
    sku: form.sku.trim(),
    purchasePriceExclTax: parseDecimal(form.purchase) ?? 0,
    salePriceExclTax: parseDecimal(form.sale) ?? 0,
    discountPriceExclTax: parseDecimal(form.discount),
    ecoTax: parseDecimal(form.ecoTax),
    weightKg: parseDecimal(form.weight) ?? 0,
    valueIds: valueIdsOf(form),
  }
  if (creating) {
    request.initialStock = Number(form.initialStock.trim())
    request.alertThreshold = Number(form.alertThreshold.trim())
  }
  return request
}

export type Choice = { attribute: Attribute; values: Attribute['values'] }

/**
 * Every combination of the chosen values, one per attribute: Noir and Blanc
 * by AZERTY and QWERTY give four. An attribute with no value chosen is left
 * out; with nothing chosen at all, there is nothing to generate.
 */
export function combinations(choices: Choice[]): Attribute['values'][] {
  const used = choices.filter((choice) => choice.values.length > 0)
  if (used.length === 0) return []
  return used.reduce<Attribute['values'][]>(
    (combos, choice) => combos.flatMap((combo) => choice.values.map((value) => [...combo, value])),
    [[]],
  )
}

/** The combinations the product does not have yet. */
export function missingCombinations(choices: Choice[], variants: AdminVariant[]): Attribute['values'][] {
  const existing = variants.map(idsOf)
  return combinations(choices).filter((combo) => {
    const ids = combo.map((value) => value.id).sort((a, b) => a - b)
    return !existing.some((other) => sameValues(other, ids))
  })
}

/** A readable SKU: the product slug and the values, in capitals. « CLAVIER-K2-NOIR-AZERTY ». */
export function suggestedSku(productSlug: string, values: Attribute['values']): string {
  return [productSlug, ...values.map((value) => slugify(value.value))]
    .filter(Boolean)
    .join('-')
    .toUpperCase()
    .slice(0, 64)
}

/** The messages of catalog-service for the variants (C04), in French. */
export const variantTranslations: Translation[] = [
  [/^A variant with SKU '(.*)' already exists$/, (sku) => `Le SKU « ${sku} » est déjà pris par une autre variante du catalogue.`],
  [/^discountPriceExclTax must be below salePriceExclTax$/, () => 'Le prix remisé doit rester sous le prix de vente.'],
  [/^Unknown attribute values:/, () => 'Une des valeurs choisies n’existe plus : rechargez la page.'],
  [/^A variant has one value per attribute/, () => 'Une variante a une seule valeur par attribut.'],
  [/already has a variant with these values: (\S+)/, (sku) => `La variante ${sku} a déjà exactement ces valeurs.`],
  [/already has a variant without attribute values/, () => 'Une variante sans valeur existe déjà : choisissez les valeurs qui distinguent celle-ci.'],
  [/^Only a variant of a draft product can be deleted/,
    () => 'On ne supprime une variante que sur un brouillon : mettez plutôt son stock à 0, ou archivez le produit.'],
  [/^The stock and the alert threshold of an existing variant change through/,
    () => 'Le stock et le seuil d’alerte se modifient depuis l’inventaire.'],
]
