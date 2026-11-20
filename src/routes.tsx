import type { RouteObject } from 'react-router'
import { RequireRole } from './auth/RequireRole'
import { AppLayout } from './layout/AppLayout'
import { allNavItems } from './navigation'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { NotFoundPage } from './pages/NotFoundPage'

/** The routes, built from the menu: one route per entry and per page under it, guarded by its roles. */
export function routes(): RouteObject[] {
  return [
    {
      element: <AppLayout />,
      children: [
        ...allNavItems().flatMap((item) => [
          {
            path: item.path,
            element: <RequireRole roles={item.roles}>{item.element ?? <ComingSoonPage item={item} />}</RequireRole>,
          },
          ...(item.pages ?? []).map((page) => ({
            path: page.path,
            element: <RequireRole roles={item.roles}>{page.element}</RequireRole>,
          })),
        ]),
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ]
}
