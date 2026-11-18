import type { ReactNode } from 'react'
import { AccessDenied } from '../pages/AccessDenied'
import { useAuth } from './AuthContext'
import type { Role } from './roles'

/**
 * Shows its children only to the given roles. Typing the URL of a page the
 * menu hides lands here, not on the page. The interface only: the gateway
 * enforces the same rule on the API.
 */
export function RequireRole({ roles, children }: { roles?: readonly Role[]; children: ReactNode }) {
  const { hasRole } = useAuth()
  if (roles && !hasRole(...roles)) {
    return <AccessDenied reason="Cette page est réservée aux administrateurs." />
  }
  return <>{children}</>
}
