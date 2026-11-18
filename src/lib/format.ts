const percent = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** 5.5 → « 5,50 % » */
export function formatPercent(value: number): string {
  return `${percent.format(value)} %`
}

/**
 * A decimal typed in French or English: « 5,5 » and « 5.5 » both give 5.5.
 * Returns null for anything that is not a plain decimal number.
 */
export function parseDecimal(text: string): number | null {
  const normalized = text.trim().replace(/\s/g, '').replace(',', '.')
  return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : null
}

/** How many digits follow the decimal separator. */
export function decimalPlaces(text: string): number {
  const [, decimals = ''] = text.trim().replace(',', '.').split('.')
  return decimals.length
}

const date = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' })
const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })

/** « 12 nov. 2026 » */
export function formatDate(iso: string): string {
  return date.format(new Date(iso))
}

/** « 12 nov. 2026, 14:05 » */
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso))
}

const relative = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' })
const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * « il y a 5 minutes », « dans 3 jours », « hier ». Past a month, the date
 * itself says more than « il y a 47 jours ».
 */
export function formatRelative(iso: string, now = Date.now()): string {
  const delta = new Date(iso).getTime() - now
  const size = Math.abs(delta)
  if (size < MINUTE) return delta <= 0 ? 'à l’instant' : 'dans moins d’une minute'
  if (size < HOUR) return relative.format(Math.round(delta / MINUTE), 'minute')
  if (size < DAY) return relative.format(Math.round(delta / HOUR), 'hour')
  if (size < 30 * DAY) return relative.format(Math.round(delta / DAY), 'day')
  return formatDate(iso)
}
