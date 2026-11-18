import { describe, expect, it } from 'vitest'
import { canEnterBackOffice, hasAnyRole, rolesFromToken } from './roles'

describe('roles', () => {
  it('lets collaborators and admins into the back-office, not customers', () => {
    expect(canEnterBackOffice(['client', 'collaborator'])).toBe(true)
    expect(canEnterBackOffice(['admin'])).toBe(true)
    expect(canEnterBackOffice(['client', 'offline_access'])).toBe(false)
    expect(canEnterBackOffice([])).toBe(false)
  })

  it('checks any of the required roles', () => {
    expect(hasAnyRole(['collaborator'], ['admin'])).toBe(false)
    expect(hasAnyRole(['collaborator', 'admin'], ['admin'])).toBe(true)
  })

  it('reads the realm roles of a Keycloak token and ignores anything else', () => {
    expect(rolesFromToken({ realm_access: { roles: ['client', 'admin', 42] } })).toEqual(['client', 'admin'])
    expect(rolesFromToken({ realm_access: { roles: 'admin' } })).toEqual([])
    expect(rolesFromToken({})).toEqual([])
    expect(rolesFromToken(undefined)).toEqual([])
  })
})
