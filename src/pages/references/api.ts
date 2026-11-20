import type { Translation } from '../../api/errors'
import { json, type Api } from '../../api/useApi'

/**
 * The reference data of the catalog, edited from the back-office:
 * /api/admin/catalog/{brands,categories,universes,vat-rates} on catalog-service.
 * A PUT replaces the whole entry: every field is sent, an empty one as null.
 */
export type Brand = { id: number; name: string; slug: string; description: string | null; logoUrl: string | null }
export type BrandRequest = Omit<Brand, 'id' | 'slug'> & { slug: string | null }

/** A flat list: each category gives its parent's id, null for a root. */
export type Category = {
  id: number; name: string; slug: string; description: string | null; parentId: number | null; position: number
}
export type CategoryRequest = Omit<Category, 'id' | 'slug'> & { slug: string | null }

export type Universe = {
  id: number; name: string; slug: string; description: string | null; imageUrl: string | null; position: number
}
export type UniverseRequest = Omit<Universe, 'id' | 'slug'> & { slug: string | null }

/** rate is a percentage: 20 for 20 %. Exactly one rate is the default, the one a new product gets. */
export type VatRate = { id: number; label: string; rate: number; defaultRate: boolean }
export type VatRateRequest = Omit<VatRate, 'id'>

/** The calls for one kind of entry; the paths and verbs are the same for all four. */
export function resource<T, R>(api: Api, path: string) {
  return {
    list: () => api<T[]>(path),
    create: (request: R) => api<T>(path, json('POST', request)),
    update: (id: number, request: R) => api<T>(`${path}/${id}`, json('PUT', request)),
    remove: (id: number) => api<void>(`${path}/${id}`, { method: 'DELETE' }),
  }
}

export const PATHS = {
  brands: '/api/admin/catalog/brands',
  categories: '/api/admin/catalog/categories',
  universes: '/api/admin/catalog/universes',
  vatRates: '/api/admin/catalog/vat-rates',
} as const

/**
 * The messages of catalog-service for these entries, in French. A 409 on a
 * deletion is told by the screen itself, which knows the entry's name.
 */
export const translations: Translation[] = [
  [/^A brand named '(.*)' already exists$/, (name) => `Une marque s’appelle déjà « ${name} ».`],
  [/^A universe named '(.*)' already exists$/, (name) => `Un univers s’appelle déjà « ${name} ».`],
  [/^A (brand|category|universe) with slug '(.*)' already exists$/,
    (_, slug) => `Le slug « ${slug} » est déjà pris : choisissez-en un autre.`],
  [/^A (brand|category|universe) with this (name or )?slug already exists$/,
    () => 'Ce nom ou ce slug est déjà pris : choisissez-en un autre.'],
  [/^A VAT rate labelled '(.*)' already exists$/, (label) => `Un taux s’appelle déjà « ${label} ».`],
  [/^A VAT rate with this label already exists$/, () => 'Un taux porte déjà ce libellé.'],
  [/^No slug can be derived from the name/,
    () => 'Aucun slug ne peut être tiré de ce nom (pas de lettre latine ni de chiffre) : saisissez-en un.'],
  [/^The slug derived from the name is longer than/,
    () => 'Le slug tiré de ce nom dépasse 120 caractères : saisissez-en un plus court.'],
  [/^Parent category \d+ not found$/, () => 'La catégorie parente n’existe plus : la liste a été rechargée.'],
  [/cannot be moved under itself or one of its sub-categories$/,
    () => 'Une catégorie ne peut pas être rangée sous elle-même ni sous l’une de ses sous-catégories.'],
  [/has sub-categories: move or delete them first$/,
    () => 'Cette catégorie a des sous-catégories : déplacez-les ou supprimez-les d’abord.'],
  [/is the default VAT rate: mark another rate as default/,
    () => 'C’est le taux par défaut : marquez d’abord un autre taux comme taux par défaut.'],
]
