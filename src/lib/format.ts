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
