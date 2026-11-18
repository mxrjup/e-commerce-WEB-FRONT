import type { RouteObject } from 'react-router'
import { RequireRole } from './auth/RequireRole'
import { AppLayout } from './layout/AppLayout'
import { allNavItems } from './navigation'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { NotFoundPage } from './pages/NotFoundPage'

/** The routes, built from the menu: one route per entry, guarded by its roles. */
export function routes(): RouteObject[] {
  return [
    {
      element: <AppLayout />,
      children: [
        ...allNavItems().map((item) => ({
          path: item.path,
          element: <RequireRole roles={item.roles}>{item.element ?? <ComingSoonPage item={item} />}</RequireRole>,
        })),
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ]
}
