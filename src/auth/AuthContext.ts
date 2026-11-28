import { createContext, useContext } from 'react'
import type { Role } from './roles'

export type User = {
  id: string
  name: string
  email: string | null
  roles: string[]
}

export type Auth = {
  user: User
  hasRole: (...roles: Role[]) => boolean
  /** A valid access token, refreshed first when it is about to expire. */
  getToken: () => Promise<string>
  logout: () => void
}

/**
 * Provided once the user is signed in. Tests provide their own value, so
 * nothing below the provider ever talks to Keycloak directly.
 */
export const AuthContext = createContext<Auth | null>(null)

export function useAuth(): Auth {
  const auth = useContext(AuthContext)
  if (!auth) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }
  return auth
}
