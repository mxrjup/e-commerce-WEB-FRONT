import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiFetch } from './client'

const getToken = () => Promise.resolve('token-123')

function answer(status: number, body?: unknown) {
  return vi.fn().mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }))
}

describe('apiFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls the gateway with the bearer token and reads the JSON', async () => {
    const fetch = answer(200, [{ id: 1 }])
    vi.stubGlobal('fetch', fetch)

    await expect(apiFetch(getToken, '/api/admin/catalog/inventory')).resolves.toEqual([{ id: 1 }])

    const [url, init] = fetch.mock.calls[0]
    expect(String(url)).toBe('http://localhost:8080/api/admin/catalog/inventory')
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token-123')
  })

  it('sends a body as JSON', async () => {
    const fetch = answer(200, {})
    vi.stubGlobal('fetch', fetch)

    await apiFetch(getToken, '/api/x', { method: 'POST', body: JSON.stringify({ delta: 1 }) })

    expect(new Headers(fetch.mock.calls[0][1].headers).get('Content-Type')).toBe('application/json')
  })

  it('lets the browser type a file upload itself', async () => {
    const fetch = answer(201, {})
    vi.stubGlobal('fetch', fetch)
    const form = new FormData()
    form.append('file', new File(['x'], 'photo.jpg', { type: 'image/jpeg' }))

    await apiFetch(getToken, '/api/x', { method: 'POST', body: form })

    // Le navigateur ajoute « multipart/form-data; boundary=... » : un type pose a la main le casserait.
    expect(new Headers(fetch.mock.calls[0][1].headers).has('Content-Type')).toBe(false)
    expect(fetch.mock.calls[0][1].body).toBe(form)
  })

  it('turns the shared error contract into an ApiError', async () => {
    vi.stubGlobal('fetch', answer(409, {
      status: 409, error: 'Conflict', message: 'Variant 5 does not have enough stock', details: ['delta'],
    }))

    const error = await apiFetch(getToken, '/api/x').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 409, message: 'Variant 5 does not have enough stock', details: ['delta'] })
  })

  it('still fails clearly when the error has no JSON body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad gateway', { status: 502 })))

    await expect(apiFetch(getToken, '/api/x')).rejects.toMatchObject({ status: 502, message: 'HTTP 502' })
  })

  it('accepts an empty answer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))

    await expect(apiFetch(getToken, '/api/x', { method: 'DELETE' })).resolves.toBeUndefined()
  })
})
