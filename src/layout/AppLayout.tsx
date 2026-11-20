import LogoutOutlined from '@mui/icons-material/LogoutOutlined'
import MenuOutlined from '@mui/icons-material/MenuOutlined'
import {
  AppBar, Avatar, Box, Chip, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText,
  ListSubheader, Stack, Toolbar, Tooltip, Typography, useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import logo from '../assets/logo-log-lockup.svg'
import { useAuth } from '../auth/AuthContext'
import { NotificationsProvider } from '../components/Notifications'
import { visibleNavigation } from '../navigation'
import { tokens } from '../theme'

const DRAWER_WIDTH = 264

/**
 * The frame of every page: the menu on the left (a drawer on small
 * screens), the signed-in user and the logout at the top, the page below.
 */
export function AppLayout() {
  const theme = useTheme()
  const wide = useMediaQuery(theme.breakpoints.up('md'))
  const [open, setOpen] = useState(false)
  const { user, hasRole, logout } = useAuth()
  const { pathname } = useLocation()
  const sections = visibleNavigation(user.roles)

  const menu = (
    <Box component="nav" aria-label="Menu principal" sx={{ py: 2 }}>
      <Box component="img" src={logo} alt="log" sx={{ height: 40, mx: 3, mb: 2, filter: 'invert(1)' }} />
      {sections.map((section, index) => (
        <List
          key={section.title ?? index}
          dense
          subheader={section.title ? (
            <ListSubheader disableSticky sx={{ bgcolor: 'transparent', color: tokens.onDark2, lineHeight: '32px' }}>
              {section.title}
            </ListSubheader>
          ) : undefined}
        >
          {section.items.map((item) => (
            <ListItemButton
              key={item.path}
              component={NavLink}
              to={item.path}
              end={item.path === '/'}
              selected={item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)}
              onClick={() => setOpen(false)}
              sx={{
                mx: 1.5, borderRadius: 1.5, color: tokens.onDark,
                '&.Mui-selected, &.Mui-selected:hover': { bgcolor: tokens.accent },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
              {!item.element && <Typography variant="caption" sx={{ color: tokens.onDark2 }}>bientôt</Typography>}
            </ListItemButton>
          ))}
        </List>
      ))}
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ ml: { md: `${DRAWER_WIDTH}px` }, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` } }}>
        <Toolbar sx={{ gap: 2 }}>
          {!wide && (
            <IconButton edge="start" aria-label="Ouvrir le menu" onClick={() => setOpen(true)}>
              <MenuOutlined />
            </IconButton>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Chip size="small" label={hasRole('admin') ? 'Administrateur' : 'Collaborateur'} variant="outlined" />
            <Avatar sx={{ width: 32, height: 32, bgcolor: tokens.accent, fontSize: 14 }}>
              {user.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{user.name}</Typography>
              {user.email && <Typography variant="caption" color="text.secondary">{user.email}</Typography>}
            </Box>
            <Tooltip title="Se déconnecter">
              <IconButton aria-label="Se déconnecter" onClick={logout}>
                <LogoutOutlined />
              </IconButton>
            </Tooltip>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        {wide ? (
          <Drawer variant="permanent" open sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}>{menu}</Drawer>
        ) : (
          <Drawer variant="temporary" open={open} onClose={() => setOpen(false)}
            sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}>
            {menu}
          </Drawer>
        )}
      </Box>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, md: 4 } }}>
        <Toolbar />
        <NotificationsProvider>
          <Outlet />
        </NotificationsProvider>
      </Box>
    </Box>
  )
}
