import type { Granularity } from './api'

export type Preset = 'today' | 'seven' | 'thirty' | 'month' | 'custom'
export type Period = { start: string; end: string }
const day = 86_400_000
const dateOnly = (date: Date) => date.toISOString().slice(0, 10)

/** Calendar days in UTC, matching the backend buckets, never browser-local midnight. */
export function presetPeriod(preset: Exclude<Preset, 'custom'>, now = new Date()): Period {
  const end = dateOnly(now)
  const start = new Date(`${end}T00:00:00Z`)
  if (preset === 'month') start.setUTCDate(1)
  else start.setUTCDate(start.getUTCDate() - (preset === 'seven' ? 6 : preset === 'thirty' ? 29 : 0))
  return { start: dateOnly(start), end }
}

export function periodQuery(period: Period, granularity: Granularity): { from: string; to: string; error: null } | { error: string } {
  const parse = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '0001-01-01') return null
    const parsed = new Date(`${value}T00:00:00Z`)
    return Number.isFinite(parsed.getTime()) && dateOnly(parsed) === value ? parsed : null
  }
  const start = parse(period.start)
  const end = parse(period.end)
  if (!start || !end || start > end || period.end >= '9999-12-31') {
    return { error: 'Choisissez une période valide : le début doit précéder ou égaler la fin (jusqu’au 30/12/9999).' }
  }
  const cursor = new Date(start)
  if (granularity === 'WEEK') cursor.setUTCDate(cursor.getUTCDate() - (cursor.getUTCDay() + 6) % 7)
  if (granularity === 'MONTH') cursor.setUTCDate(1)
  let count = 0
  while (cursor <= end) {
    if (++count > 1000) return { error: 'Cette période dépasse 1 000 points. Réduisez-la ou choisissez une granularité plus large.' }
    if (granularity === 'MONTH') cursor.setUTCMonth(cursor.getUTCMonth() + 1)
    else cursor.setUTCDate(cursor.getUTCDate() + (granularity === 'WEEK' ? 7 : 1))
  }
  return { from: start.toISOString(), to: new Date(end.getTime() + day).toISOString(), error: null }
}
