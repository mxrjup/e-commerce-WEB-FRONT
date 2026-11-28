import { describe, expect, it } from 'vitest'
import { decimalPlaces, formatPercent, parseDecimal } from './format'
import { slugify, SLUG_PATTERN } from './slugs'
import { email, optionalUrl } from './validation'

describe('slugify', () => {
  it('derives the slug the catalog service would derive', () => {
    expect(slugify('Écrans & Moniteurs')).toBe('ecrans-moniteurs')
    expect(slugify('Cœur de gamme')).toBe('coeur-de-gamme')
    expect(slugify('  --Cartes   graphiques__ ')).toBe('cartes-graphiques')
    expect(slugify('Télétravail 2026')).toBe('teletravail-2026')
  })

  it('gives nothing for a name without Latin letters or digits', () => {
    expect(slugify('日本')).toBe('')
  })

  it('always gives a slug the API accepts', () => {
    for (const name of ['Écrans & Moniteurs', 'A', 'x--y', 'Æther 3']) {
      expect(slugify(name)).toMatch(SLUG_PATTERN)
    }
  })
})

describe('decimals', () => {
  it('reads a French or an English decimal', () => {
    expect(parseDecimal('5,5')).toBe(5.5)
    expect(parseDecimal(' 20 ')).toBe(20)
    expect(parseDecimal('2.10')).toBe(2.1)
    expect(parseDecimal('-1')).toBeNull()
    expect(parseDecimal('1e3')).toBeNull()
    expect(parseDecimal('')).toBeNull()
  })

  it('counts the decimals as typed', () => {
    expect(decimalPlaces('5,555')).toBe(3)
    expect(decimalPlaces('20')).toBe(0)
  })

  it('writes a rate the French way', () => {
    expect(formatPercent(5.5)).toBe('5,50 %')
    expect(formatPercent(20)).toBe('20,00 %')
  })
})

describe('field checks', () => {
  it('accepts only absolute web addresses', () => {
    expect(optionalUrl('')).toBeNull()
    expect(optionalUrl('https://cdn.log.test/asus.png')).toBeNull()
    expect(optionalUrl('cdn.log.test/asus.png')).not.toBeNull()
    expect(optionalUrl('javascript:alert(1)')).not.toBeNull()
  })

  it('checks an e-mail address', () => {
    expect(email('marie@log.test')).toBeNull()
    expect(email('marie@log')).not.toBeNull()
  })
})
