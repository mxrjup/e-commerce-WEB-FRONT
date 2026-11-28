import { describe, expect, it } from 'vitest'
import { periodQuery, presetPeriod } from './period'

describe('statistics UTC periods', () => {
  it('uses inclusive calendar presets and ignores local daylight saving changes', () => {
    const now = new Date('2026-03-29T23:30:00Z')
    expect(presetPeriod('today', now)).toEqual({ start: '2026-03-29', end: '2026-03-29' })
    expect(presetPeriod('seven', now)).toEqual({ start: '2026-03-23', end: '2026-03-29' })
    expect(presetPeriod('thirty', now)).toEqual({ start: '2026-02-28', end: '2026-03-29' })
    expect(presetPeriod('month', now)).toEqual({ start: '2026-03-01', end: '2026-03-29' })
    expect(periodQuery(presetPeriod('today', now), 'DAY')).toEqual({ from: '2026-03-29T00:00:00.000Z', to: '2026-03-30T00:00:00.000Z', error: null })
  })
  it.each([
    { start: '', end: '2026-01-01' }, { start: '2026-02-30', end: '2026-03-01' },
    { start: '2026-01-02', end: '2026-01-01' }, { start: '0000-01-01', end: '2026-01-01' },
    { start: '9999-12-31', end: '9999-12-31' },
  ])('rejects invalid dates: %j', (period) => expect(periodQuery(period, 'DAY').error).toBeTruthy())
  it('allows exactly 1000 daily points, then requires a coarser granularity', () => {
    expect(periodQuery({ start: '2024-01-01', end: '2026-09-26' }, 'DAY').error).toBeNull()
    expect(periodQuery({ start: '2024-01-01', end: '2026-09-27' }, 'DAY').error).toMatch(/1 000/)
    expect(periodQuery({ start: '2024-01-01', end: '2026-09-27' }, 'WEEK').error).toBeNull()
  })
  it('counts partial Monday weeks and calendar months', () => {
    expect(periodQuery({ start: '2000-01-31', end: '2083-04-01' }, 'MONTH').error).toBeNull()
    expect(periodQuery({ start: '2000-01-31', end: '2083-05-01' }, 'MONTH').error).toMatch(/1 000/)
    expect(periodQuery({ start: '0001-01-01', end: '0001-01-01' }, 'WEEK').error).toBeNull()
  })
})
