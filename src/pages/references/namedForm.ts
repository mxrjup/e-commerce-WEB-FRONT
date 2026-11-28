import { SLUG_MAX_LENGTH, SLUG_PATTERN, slugify } from '../../lib/slugs'
import { check, maxLength, optional, required, type FieldErrors } from '../../lib/validation'

/** What brands, categories and universes have in common. */
export type NamedForm = { name: string; slug: string; description: string }

type Named = { id: number; name: string; slug: string; description: string | null }

export function namedFormOf(item: Named): NamedForm {
  return { name: item.name, slug: item.slug, description: item.description ?? '' }
}

export const emptyNamedForm: NamedForm = { name: '', slug: '', description: '' }

/**
 * The slug to send. Empty at creation: the service derives it from the name,
 * as the form shows. At edit time the field always holds one, since a slug
 * only changes when someone asks for it.
 */
export function slugToSend(form: NamedForm): string | null {
  return optional(form.slug)
}

/**
 * The same limits as catalog-service. `uniqueNames` is for brands and
 * universes, whose names are unique; two categories may share a name in
 * different branches.
 */
export function validateNamed(form: NamedForm, editing: Named | null, items: Named[], uniqueNames: boolean): FieldErrors<keyof NamedForm> {
  const others = items.filter((item) => item.id !== editing?.id)
  const name = form.name.trim()
  const slug = form.slug.trim() || (editing ? '' : slugify(name))

  let nameError = check(form.name, required, maxLength(100))
  if (!nameError && uniqueNames && others.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
    nameError = 'Ce nom est déjà pris.'
  }

  let slugError: string | null = null
  if (editing && !form.slug.trim()) {
    slugError = 'Le slug est obligatoire : il fait partie de l’adresse publique.'
  } else if (!form.slug.trim() && name && !slug) {
    slugError = 'Ce nom ne donne aucun slug (pas de lettre latine ni de chiffre) : saisissez-en un.'
  } else if (slug.length > SLUG_MAX_LENGTH) {
    slugError = `${SLUG_MAX_LENGTH} caractères au maximum.`
  } else if (form.slug.trim() && !SLUG_PATTERN.test(slug)) {
    slugError = 'Minuscules sans accent, chiffres et tirets seulement, par exemple « ecrans-gaming ».'
  } else if (slug && others.some((item) => item.slug === slug)) {
    slugError = `Le slug « ${slug} » est déjà pris.`
  }

  return { name: nameError ?? undefined, slug: slugError ?? undefined, description: check(form.description, maxLength(2000)) ?? undefined }
}
