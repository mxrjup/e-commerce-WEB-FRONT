/**
 * The back-office roles of the Keycloak realm. In Keycloak, "admin" is a
 * composite that includes "collaborator"; both are checked here so the
 * front never depends on that composite, like the gateway.
 *
 * These checks only decide what the interface shows. The gateway enforces
 * the real access rules on every API call.
 */
export type Role = 'collaborator' | 'admin'

/** Who may enter the back-office at all. A customer account may not. */
export const BACK_OFFICE_ROLES: readonly Role[] = ['collaborator', 'admin']

export function hasAnyRole(userRoles: readonly string[], required: readonly Role[]): boolean {
  return required.some((role) => userRoles.includes(role))
}

export function canEnterBackOffice(userRoles: readonly string[]): boolean {
  return hasAnyRole(userRoles, BACK_OFFICE_ROLES)
}

/** The realm roles carried by a Keycloak access token. */
export function rolesFromToken(token: { realm_access?: { roles?: unknown } } | undefined): string[] {
  const roles = token?.realm_access?.roles
  return Array.isArray(roles) ? roles.filter((role): role is string => typeof role === 'string') : []
}
