import { config } from '../config'

/**
 * An error answered by the gateway or a service, in the shared contract of
 * common-lib: {timestamp, status, error, message, details}.
 */
export class ApiError extends Error {
  readonly status: number
  readonly details: string[]

  constructor(status: number, message: string, details: string[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

type ErrorBody = { message?: unknown; details?: unknown }

/**
 * Calls the API through the gateway with the user's token. Every screen
 * goes through this function, so the token, the base URL and the error
 * format are handled in one place.
 *
 * @param getToken from useAuth(); refreshes the token when it is about to expire
 */
export async function apiFetch<T>(
  getToken: () => Promise<string>,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${await getToken()}`)
  headers.set('Accept', 'application/json')
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(new URL(path, config.apiUrl), { ...init, headers })
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ErrorBody
    const message = typeof body.message === 'string' ? body.message : `HTTP ${response.status}`
    const details = Array.isArray(body.details) ? body.details.filter((d): d is string => typeof d === 'string') : []
    throw new ApiError(response.status, message, details)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}
