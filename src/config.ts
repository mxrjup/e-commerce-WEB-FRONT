/**
 * Settings read at build time from the VITE_* variables (see .env.example).
 * The defaults target the Docker Compose stack of e-commerce-BACK.
 *
 * A value that starts with "/" is a path on the host that serves the back-office: the image
 * deployed on the cluster is built with VITE_API_URL=/ and VITE_KEYCLOAK_URL=/auth, so the same
 * image works whatever the public host is.
 */
export function resolveUrl(value: string, origin: string): string {
  return value.startsWith('/') ? new URL(value, origin).toString().replace(/\/$/, '') : value
}

const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin

export const config = {
  keycloakUrl: resolveUrl(import.meta.env.VITE_KEYCLOAK_URL ?? 'http://localhost:8180', origin),
  keycloakRealm: import.meta.env.VITE_KEYCLOAK_REALM ?? 'ecommerce',
  keycloakClientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'web-bo',
  apiUrl: resolveUrl(import.meta.env.VITE_API_URL ?? 'http://localhost:8080', origin),
} as const
