/**
 * Settings read at build time from the VITE_* variables (see .env.example).
 * The defaults target the Docker Compose stack of e-commerce-BACK.
 */
export const config = {
  keycloakUrl: import.meta.env.VITE_KEYCLOAK_URL ?? 'http://localhost:8180',
  keycloakRealm: import.meta.env.VITE_KEYCLOAK_REALM ?? 'ecommerce',
  keycloakClientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'web-bo',
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8080',
} as const
