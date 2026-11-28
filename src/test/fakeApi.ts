import { vi } from 'vitest'

type Call = { method: string; path: string; body: unknown }
type Handler = (call: Call) => { status: number; body?: unknown } | undefined

/**
 * A fake gateway for screen tests: `fetch` answers from the handlers, first
 * match wins, and every call is recorded with its JSON body. An unexpected
 * call fails the test with a 500 rather than hanging it.
 */
export function fakeApi(...handlers: Handler[]) {
  const calls: Call[] = []
  const fetch = vi.fn(async (input: URL | string, init: RequestInit = {}) => {
    const url = new URL(String(input))
    const call = {
      method: init.method ?? 'GET',
      path: url.pathname + url.search,
      body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
    }
    calls.push(call)
    for (const handler of handlers) {
      const answer = handler(call)
      if (answer) {
        return new Response(answer.body === undefined ? null : JSON.stringify(answer.body), {
          status: answer.status,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
    return new Response(JSON.stringify({ status: 500, message: `No fake for ${call.method} ${call.path}` }), { status: 500 })
  })
  vi.stubGlobal('fetch', fetch)
  return { calls, writes: () => calls.filter((call) => call.method !== 'GET') }
}

/** Answers `method path` with this status and body. */
export function on(method: string, path: string, status: number, body?: unknown): Handler {
  return (call) => (call.method === method && call.path === path ? { status, body } : undefined)
}
