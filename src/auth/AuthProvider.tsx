import Keycloak from 'keycloak-js'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { config } from '../config'
import { AuthContext, type Auth, type User } from './AuthContext'
import { rolesFromToken, type Role } from './roles'

const keycloak = new Keycloak({
  url: config.keycloakUrl,
  realm: config.keycloakRealm,
  clientId: config.keycloakClientId,
})

/**
 * A Keycloak instance can be initialised only once, and React runs effects
 * twice in development (StrictMode): every caller shares this one promise.
 */
let initialisation: Promise<boolean> | null = null

function initialiseOnce(): Promise<boolean> {
  initialisation ??= keycloakReachable().then(() =>
    keycloak.init({ onLoad: 'login-required', pkceMethod: 'S256', checkLoginIframe: false }))
  return initialisation
}

/**
 * Without a session, keycloak-js redirects to Keycloak straight away: if
 * Keycloak is down, the browser shows its own "site unreachable" page and
 * the application never gets a chance to explain. A no-cors request only
 * fails when the server cannot be reached at all, which is what we check.
 */
async function keycloakReachable(): Promise<void> {
  const url = `${config.keycloakUrl}/realms/${config.keycloakRealm}/.well-known/openid-configuration`
  await fetch(url, { mode: 'no-cors', signal: AbortSignal.timeout(5000) })
}

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; user: User }

function userFrom(instance: Keycloak): User {
  const token = instance.tokenParsed as Record<string, unknown> & { realm_access?: { roles?: unknown } }
  const name = [token.given_name, token.family_name].filter(Boolean).join(' ')
  return {
    id: String(token.sub ?? ''),
    name: name || String(token.preferred_username ?? token.email ?? 'Utilisateur'),
    email: typeof token.email === 'string' ? token.email : null,
    roles: rolesFromToken(token),
  }
}

/**
 * Signs the user in before anything else renders: the back-office has no
 * public page. Keycloak runs the authorization code flow with PKCE for the
 * public client web-bo, then keeps the token fresh.
 */
export function AuthProvider({ children, fallback }: {
  children: ReactNode
  /** What to show while signing in, or when Keycloak cannot be reached. */
  fallback: (state: 'loading' | 'error', retry: () => void) => ReactNode
}) {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let active = true
    initialiseOnce()
      .then((authenticated) => {
        // Sans session, keycloak-js redirige deja vers la page de connexion.
        if (active && authenticated) setState({ status: 'ready', user: userFrom(keycloak) })
      })
      .catch(() => {
        if (active) setState({ status: 'error' })
      })
    // Le jeton expire : on le renouvelle, et on garde les roles a jour.
    keycloak.onTokenExpired = () => {
      keycloak
        .updateToken(30)
        .then(() => setState({ status: 'ready', user: userFrom(keycloak) }))
        .catch(() => void keycloak.login())
    }
    return () => {
      active = false
    }
  }, [])

  // Une instance Keycloak ne se reinitialise pas : reessayer, c'est recharger la page.
  const retry = useCallback(() => window.location.reload(), [])

  const auth = useMemo<Auth | null>(() => {
    if (state.status !== 'ready') return null
    return {
      user: state.user,
      hasRole: (...roles: Role[]) => roles.some((role) => state.user.roles.includes(role)),
      getToken: async () => {
        await keycloak.updateToken(30)
        if (!keycloak.token) throw new Error('Not signed in')
        return keycloak.token
      },
      logout: () => {
        void keycloak.logout({ redirectUri: window.location.origin })
      },
    }
  }, [state])

  if (!auth) {
    return fallback(state.status === 'error' ? 'error' : 'loading', retry)
  }
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}
