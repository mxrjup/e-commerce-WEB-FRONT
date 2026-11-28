/**
 * Field checks for the back-office forms. They mirror the constraints of the
 * API, so a form tells what is wrong next to the field instead of a 400
 * coming back from the server. The server checks again regardless.
 */
export type Check = (value: string) => string | null

export const required: Check = (value) => (value.trim() ? null : 'Ce champ est obligatoire.')

export const maxLength = (max: number): Check => (value) =>
  value.trim().length > max ? `${max} caractères au maximum (${value.trim().length} actuellement).` : null

/** An optional web address: empty, or an absolute http(s) URL. */
export const optionalUrl: Check = (value) => {
  if (!value.trim()) return null
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? null : 'L’adresse doit commencer par https:// ou http://.'
  } catch {
    return 'Ce n’est pas une adresse web complète (par exemple https://exemple.fr/image.png).'
  }
}

export const email: Check = (value) =>
  !value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? null : 'Adresse e-mail invalide.'

/** The first failing check, in order. */
export function check(value: string, ...checks: Check[]): string | null {
  for (const run of checks) {
    const error = run(value)
    if (error) return error
  }
  return null
}

/** Errors by field; a form is valid when none is set. */
export type FieldErrors<K extends string> = Partial<Record<K, string>>

export function hasErrors(errors: FieldErrors<string>): boolean {
  return Object.values(errors).some(Boolean)
}

/** An optional text field as the API expects it: trimmed, and null when empty. */
export function optional(value: string): string | null {
  return value.trim() || null
}
