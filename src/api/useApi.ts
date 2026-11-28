import { useCallback, useEffect, useRef } from 'react'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from './client'

export type Api = <T>(path: string, init?: RequestInit) => Promise<T>

/**
 * apiFetch with the token of the signed-in user, as a function that never
 * changes. The auth context changes each time the token is refreshed: a
 * screen depending on it directly would reload its data every few minutes.
 */
export function useApi(): Api {
  const { getToken } = useAuth()
  const latest = useRef(getToken)
  useEffect(() => {
    latest.current = getToken
  }, [getToken])
  return useCallback(<T,>(path: string, init?: RequestInit) => apiFetch<T>(() => latest.current(), path, init), [])
}

/** A JSON body for apiFetch. */
export function json(method: 'POST' | 'PUT', body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) }
}
