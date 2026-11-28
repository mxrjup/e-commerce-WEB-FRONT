import type { Translation } from '../../api/errors'
import { SLUG_MAX_LENGTH, SLUG_PATTERN, slugify } from '../../lib/slugs'
import { check, maxLength, optional, required } from '../../lib/validation'
import type { ProductDetail, ProductRequest } from './api'

/** A specification row; `id` only keeps React's keys stable while rows move. */
export type SpecRow = { id: number; key: string; value: string }

/** The product sheet as typed. Select fields hold strings: '' for nothing chosen. */
export type ProductForm = {
  title: string
  slug: string
  description: string
  brandId: string
  categoryId: string
  vatRateId: string
  universeIds: number[]
  specifications: SpecRow[]
}

/** The same limits as catalog-service (AdminProductRequest). */
export const LIMITS = { title: 150, description: 20000, universes: 20, specifications: 50, key: 100, value: 500 } as const

let nextRow = 1
export function specRow(key = '', value = ''): SpecRow {
  return { id: nextRow++, key, value }
}

export function emptyForm(defaultVatRateId: number | null): ProductForm {
  return {
    title: '', slug: '', description: '', brandId: '', categoryId: '',
    vatRateId: defaultVatRateId === null ? '' : String(defaultVatRateId),
    universeIds: [], specifications: [],
  }
}

export function formOf(product: ProductDetail): ProductForm {
  return {
    title: product.title,
    slug: product.slug,
    description: product.description ?? '',
    brandId: String(product.brand.id),
    categoryId: String(product.category.id),
    vatRateId: String(product.vatRate.id),
    universeIds: product.universes.map((universe) => universe.id),
    specifications: product.specifications.map((spec) => specRow(spec.key, spec.value)),
  }
}

/** Whether two versions of the form say the same thing, row ids aside. */
export function sameForm(a: ProductForm, b: ProductForm): boolean {
  const plain = (form: ProductForm) => JSON.stringify({
    ...form, specifications: form.specifications.map(({ key, value }) => [key, value]),
  })
  return plain(a) === plain(b)
}

export type ProductErrors = Partial<Record<'title' | 'slug' | 'description' | 'brandId' | 'categoryId' | 'vatRateId' | 'universeIds' | 'specifications', string>> & {
  /** By row id. */
  rows?: Record<number, { key?: string; value?: string }>
}

export function validate(form: ProductForm, editing: boolean): ProductErrors {
  const title = form.title.trim()
  const slug = form.slug.trim() || (editing ? '' : slugify(title))
  const errors: ProductErrors = {
    title: check(form.title, required, maxLength(LIMITS.title)) ?? undefined,
    brandId: form.brandId ? undefined : 'Choisissez une marque.',
    categoryId: form.categoryId ? undefined : 'Choisissez une catégorie.',
    vatRateId: form.vatRateId ? undefined : 'Choisissez un taux de TVA.',
    description: form.description.length > LIMITS.description
      ? `La description est trop longue (${form.description.length} caractères de HTML pour ${LIMITS.description} au maximum).`
      : undefined,
    universeIds: form.universeIds.length > LIMITS.universes ? `${LIMITS.universes} univers au maximum.` : undefined,
    specifications: form.specifications.length > LIMITS.specifications ? `${LIMITS.specifications} caractéristiques au maximum.` : undefined,
  }

  if (editing && !form.slug.trim()) {
    errors.slug = 'Le slug est obligatoire : il fait partie de l’adresse publique.'
  } else if (!form.slug.trim() && title && !slug) {
    errors.slug = 'Ce titre ne donne aucun slug (pas de lettre latine ni de chiffre) : saisissez-en un.'
  } else if (slug.length > SLUG_MAX_LENGTH) {
    errors.slug = `${SLUG_MAX_LENGTH} caractères au maximum.`
  } else if (form.slug.trim() && !SLUG_PATTERN.test(slug)) {
    errors.slug = 'Minuscules sans accent, chiffres et tirets seulement, par exemple « clavier-k2 ».'
  }

  const seen = new Set<string>()
  const rows: NonNullable<ProductErrors['rows']> = {}
  for (const row of form.specifications) {
    const key = row.key.trim()
    const rowErrors = {
      key: check(row.key, required, maxLength(LIMITS.key))
        ?? (seen.has(key.toLowerCase()) ? `« ${key} » est déjà dans la liste.` : undefined),
      value: check(row.value, required, maxLength(LIMITS.value)) ?? undefined,
    }
    seen.add(key.toLowerCase())
    if (rowErrors.key || rowErrors.value) rows[row.id] = rowErrors
  }
  if (Object.keys(rows).length > 0) errors.rows = rows
  return errors
}

export function hasProductErrors(errors: ProductErrors): boolean {
  const { rows, ...fields } = errors
  return Object.values(fields).some(Boolean) || Object.keys(rows ?? {}).length > 0
}

/** What the API receives: trimmed text, null for an empty slug or description. */
export function requestOf(form: ProductForm): ProductRequest {
  return {
    title: form.title.trim(),
    slug: optional(form.slug),
    description: form.description.trim() ? form.description : null,
    brandId: Number(form.brandId),
    categoryId: Number(form.categoryId),
    vatRateId: Number(form.vatRateId),
    universeIds: form.universeIds,
    specifications: form.specifications.map((row) => ({ key: row.key.trim(), value: row.value.trim() })),
  }
}

/** The messages of catalog-service for a product sheet (C04), in French. */
export const translations: Translation[] = [
  [/^A product with slug '(.*)' already exists$/, (slug) => `Le slug « ${slug} » est déjà pris par un autre produit : choisissez-en un autre.`],
  [/^A product with this slug already exists$/, () => 'Ce slug est déjà pris par un autre produit : choisissez-en un autre.'],
  [/^No slug can be derived from the name/, () => 'Aucun slug ne peut être tiré de ce titre : saisissez-en un.'],
  [/^The slug derived from the name is longer than/, () => 'Le slug tiré de ce titre dépasse 120 caractères : saisissez-en un plus court.'],
  [/^Brand \d+ does not exist$/, () => 'La marque choisie n’existe plus : rechargez la page et choisissez-en une autre.'],
  [/^Category \d+ does not exist$/, () => 'La catégorie choisie n’existe plus : rechargez la page et choisissez-en une autre.'],
  [/^VAT rate \d+ does not exist$/, () => 'Le taux de TVA choisi n’existe plus : rechargez la page et choisissez-en un autre.'],
  [/^VAT rate '(.*)' is inactive/, (label) => `Le taux « ${label} » n’est plus proposé pour un nouveau produit : choisissez-en un autre.`],
  [/^Unknown universes:/, () => 'Un des univers choisis n’existe plus : rechargez la page.'],
  [/^Specification '(.*)' appears twice$/, (key) => `La caractéristique « ${key} » apparaît deux fois.`],
  [/has no variant: add one before publishing it$/, () => 'Ce produit n’a aucune variante : ajoutez-en une avant de le publier.'],
  [/cannot go back to it/, () => 'Un produit qui a quitté le brouillon n’y revient pas : archivez-le pour le retirer de la boutique.'],
  [/^Only a draft can be deleted/, () => 'Seul un brouillon se supprime : archivez ce produit pour le retirer de la boutique.'],
]
