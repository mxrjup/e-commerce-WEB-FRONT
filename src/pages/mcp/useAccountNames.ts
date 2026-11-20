import { useCallback, useEffect, useState } from 'react'
import type { Api } from '../../api/useApi'
import { useAuth } from '../../auth/AuthContext'

type Account = { id: string; email: string; firstName: string | null; lastName: string | null }

/**
 * The tokens name who created and revoked them by Keycloak id. The
 * collaborator list (admins only, like this panel) turns an id into a name.
 * If it cannot be read, the panel still works: the ids just stay unnamed.
 */
export function useAccountNames(api: Api): (id: string | null) => string {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<Map<string, Account> | null>(null)

  useEffect(() => {
    let active = true
    api<Account[]>('/api/admin/users/collaborators')
      .then((list) => active && setAccounts(new Map(list.map((account) => [account.id, account]))))
      .catch(() => active && setAccounts(new Map()))
    return () => {
      active = false
    }
  }, [api])

  return useCallback((id: string | null) => {
    if (id === null) return 'hors du back-office'
    if (id === user.id) return 'vous'
    const account = accounts?.get(id)
    if (!account) return accounts === null ? '…' : 'un compte supprimé'
    return [account.firstName, account.lastName].filter(Boolean).join(' ') || account.email
  }, [accounts, user.id])
}
