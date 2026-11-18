import { ThemeProvider } from '@mui/material'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { vi } from 'vitest'
import { AuthContext, type Auth } from '../auth/AuthContext'
import type { Role } from '../auth/roles'
import { theme } from '../theme'

/** A signed-in user with these realm roles, without Keycloak. */
export function fakeAuth(roles: string[], name = 'Marie Martin'): Auth {
  return {
    user: { id: 'u-1', name, email: 'marie@log.test', roles },
    hasRole: (...wanted: Role[]) => wanted.some((role) => roles.includes(role)),
    getToken: vi.fn().mockResolvedValue('token-123'),
    logout: vi.fn(),
  }
}

export function renderWithAuth(ui: ReactNode, auth: Auth) {
  return render(
    <ThemeProvider theme={theme}>
      <AuthContext.Provider value={auth}>{ui}</AuthContext.Provider>
    </ThemeProvider>,
  )
}

/** The application routes at a given URL, for a given user. */
export function renderRoutes(routes: RouteObject[], url: string, auth: Auth) {
  const router = createMemoryRouter(routes, { initialEntries: [url] })
  return renderWithAuth(<RouterProvider router={router} />, auth)
}
