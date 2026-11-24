import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined'
import CategoryOutlined from '@mui/icons-material/CategoryOutlined'
import HomeOutlined from '@mui/icons-material/HomeOutlined'
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined'
import InsightsOutlined from '@mui/icons-material/InsightsOutlined'
import KeyOutlined from '@mui/icons-material/KeyOutlined'
import LocalShippingOutlined from '@mui/icons-material/LocalShippingOutlined'
import PeopleOutlined from '@mui/icons-material/PeopleOutlined'
import SellOutlined from '@mui/icons-material/SellOutlined'
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined'
import SupportAgentOutlined from '@mui/icons-material/SupportAgentOutlined'
import type { ReactNode } from 'react'
import { hasAnyRole, type Role } from './auth/roles'
import { CollaboratorsPage } from './pages/collaborators/CollaboratorsPage'
import { CustomerDetailPage } from './pages/customers/CustomerDetailPage'
import { CustomersPage } from './pages/customers/CustomersPage'
import { HomePage } from './pages/HomePage'
import { InventoryPage } from './pages/inventory/InventoryPage'
import { McpPage } from './pages/mcp/McpPage'
import { LazyProductFormPage } from './pages/products/LazyProductFormPage'
import { ProductsPage } from './pages/products/ProductsPage'
import { ReferencesPage } from './pages/references/ReferencesPage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { LazyStatisticsPage } from './pages/statistics/LazyStatisticsPage'

/**
 * Every page of the back-office, in one place: the menu, the routes and the
 * role guard are built from this list.
 *
 * To deliver a screen, replace the `task` of its entry with an `element`.
 * An entry without element shows a "à venir" page naming the task and who
 * owns it. `roles` restricts an entry beyond the collaborator/admin rule of
 * the whole back-office; the gateway enforces the same rule on the API.
 */
export type NavItem = {
  path: string
  label: string
  icon: ReactNode
  /** Who may see and open it; by default every back-office role. */
  roles?: readonly Role[]
  element?: ReactNode
  /** While the screen is not delivered: the board task and its owner (GitHub login). */
  task?: { id: string; issue: number; owner: string | null }
  /** Pages reached from this one (a product sheet), not in the menu, open to the same roles. */
  pages?: { path: string; element: ReactNode }[]
}

export type NavSection = { title: string | null; items: NavItem[] }

export const navigation: NavSection[] = [
  {
    title: null,
    items: [{ path: '/', label: 'Accueil', icon: <HomeOutlined />, element: <HomePage /> }],
  },
  {
    title: 'Catalogue',
    items: [
      {
        path: '/products', label: 'Produits', icon: <SellOutlined />, element: <ProductsPage />,
        // Une seule route pour creer et modifier : apres une creation, seule la fiche se recharge.
        pages: [{ path: '/products/:id', element: <LazyProductFormPage /> }],
      },
      { path: '/inventory', label: 'Inventaire', icon: <Inventory2Outlined />, element: <InventoryPage /> },
      { path: '/references', label: 'Référentiels', icon: <CategoryOutlined />, element: <ReferencesPage /> },
    ],
  },
  {
    title: 'Ventes',
    items: [
      { path: '/orders', label: 'Commandes', icon: <LocalShippingOutlined />, task: { id: 'O13', issue: 37, owner: 'YoanBst' } },
      {
        path: '/customers', label: 'Clients', icon: <PeopleOutlined />, element: <CustomersPage />,
        pages: [{ path: '/customers/:id', element: <CustomerDetailPage /> }],
      },
      { path: '/support', label: 'SAV', icon: <SupportAgentOutlined />, task: { id: 'S05', issue: 75, owner: null } },
      { path: '/statistics', label: 'Statistiques', icon: <InsightsOutlined />, element: <LazyStatisticsPage /> },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        path: '/collaborators', label: 'Collaborateurs', icon: <AdminPanelSettingsOutlined />,
        roles: ['admin'], element: <CollaboratorsPage />,
      },
      {
        path: '/mcp', label: 'Accès MCP', icon: <KeyOutlined />,
        roles: ['admin'], element: <McpPage />,
      },
      {
        path: '/settings', label: 'Paramètres', icon: <StorefrontOutlined />,
        roles: ['admin'], element: <SettingsPage />,
      },
    ],
  },
]

/** The menu as a given user sees it: entries they may not open are left out, and so are empty sections. */
export function visibleNavigation(userRoles: readonly string[]): NavSection[] {
  return navigation
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.roles || hasAnyRole(userRoles, item.roles)),
    }))
    .filter((section) => section.items.length > 0)
}

export function allNavItems(): NavItem[] {
  return navigation.flatMap((section) => section.items)
}