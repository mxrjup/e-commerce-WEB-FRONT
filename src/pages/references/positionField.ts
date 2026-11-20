import type { Check } from '../../lib/validation'

/** The display order of categories and universes: 0 first, then 1, 2... Ties are sorted by name. */
export const position: Check = (value) =>
  !value.trim() || /^\d{1,9}$/.test(value.trim()) ? null : 'Un nombre entier, 0 ou plus.'

/** Empty means first, like the API. */
export function positionToSend(value: string): number {
  return value.trim() ? Number(value.trim()) : 0
}

export const POSITION_HELP = '0 en premier ; à égalité, par nom.'
