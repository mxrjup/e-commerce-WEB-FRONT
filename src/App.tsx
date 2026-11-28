import { createBrowserRouter, RouterProvider } from 'react-router'
import { useAuth } from './auth/AuthContext'
import { canEnterBackOffice } from './auth/roles'
import { AccessDenied } from './pages/AccessDenied'
import { routes } from './routes'

const router = createBrowserRouter(routes())

/**
 * The signed-in application. A customer account signs in to Keycloak too,
 * but the back-office stops it here: only collaborators and admins enter.
 */
export function App() {
  const { user, logout } = useAuth()
  if (!canEnterBackOffice(user.roles)) {
    return (
      <AccessDenied
        reason="Votre compte n’a pas accès au back-office. Connectez-vous avec un compte collaborateur ou administrateur."
        onLogout={logout}
      />
    )
  }
  return <RouterProvider router={router} />
}
