/** How long a token lives. Unlimited is offered, not suggested: a forgotten token stays open. */
export const LIFETIMES = [
  { value: '30', label: '30 jours' },
  { value: '90', label: '90 jours' },
  { value: '365', label: '1 an' },
  { value: 'date', label: 'Jusqu’à une date…' },
  { value: 'never', label: 'Sans expiration' },
] as const

export type Lifetime = (typeof LIFETIMES)[number]['value']

const DAY = 24 * 60 * 60 * 1000

/** A date typed as YYYY-MM-DD, as the end of that day where the admin is. */
function endOfDay(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day, 23, 59, 59)
}

/** When the token expires, or null for never (or a date not chosen yet). */
export function expiryOf(lifetime: Lifetime, date: string, now: number): Date | null {
  if (lifetime === 'never') return null
  if (lifetime === 'date') return date ? endOfDay(date) : null
  return new Date(now + Number(lifetime) * DAY)
}

/** YYYY-MM-DD of a moment, where the admin is: the lower bound of the date field. */
export function localDay(now: number): string {
  const day = new Date(now)
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
}
