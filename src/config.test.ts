import { describe, expect, it } from 'vitest'

import { resolveUrl } from './config'

describe('resolveUrl', () => {
  it('keeps an absolute URL as it is', () => {
    expect(resolveUrl('http://localhost:8180', 'https://shop.test')).toBe('http://localhost:8180')
  })

  it('puts a path on the origin that serves the back-office', () => {
    expect(resolveUrl('/auth', 'https://shop.test')).toBe('https://shop.test/auth')
    expect(resolveUrl('/', 'https://shop.test')).toBe('https://shop.test')
  })

  it('gives a base that API paths can be resolved against', () => {
    const apiUrl = resolveUrl('/', 'https://shop.test')
    expect(new URL('/api/admin/orders', apiUrl).toString()).toBe('https://shop.test/api/admin/orders')
    expect(`${resolveUrl('/auth', 'https://shop.test')}/realms/ecommerce`).toBe('https://shop.test/auth/realms/ecommerce')
  })
})
