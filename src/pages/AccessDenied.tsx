import LockOutlined from '@mui/icons-material/LockOutlined'
import { Box, Button, Stack, Typography } from '@mui/material'

/**
 * @param reason why the page is refused
 * @param onLogout offered when the whole back-office is refused, to sign in with another account
 */
export function AccessDenied({ reason, onLogout }: { reason: string; onLogout?: () => void }) {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: onLogout ? '100vh' : '60vh', p: 3 }}>
      <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', maxWidth: 440 }}>
        <LockOutlined color="primary" sx={{ fontSize: 40 }} />
        <Typography variant="h2" component="h1">Accès refusé</Typography>
        <Typography color="text.secondary">{reason}</Typography>
        {onLogout && (
          <Button variant="contained" onClick={onLogout}>Se déconnecter</Button>
        )}
      </Stack>
    </Box>
  )
}
