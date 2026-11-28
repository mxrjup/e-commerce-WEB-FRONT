import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import logo from '../assets/logo-log-lockup.svg'

/** While signing in, or when Keycloak cannot be reached. */
export function StartupScreen({ state, onRetry }: { state: 'loading' | 'error'; onRetry: () => void }) {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh', p: 3 }}>
      <Stack spacing={3} sx={{ alignItems: 'center', maxWidth: 440 }}>
        <Box component="img" src={logo} alt="log" sx={{ height: 56 }} />
        {state === 'loading' ? (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <CircularProgress size={20} />
            <Typography color="text.secondary" role="status">Connexion en cours…</Typography>
          </Stack>
        ) : (
          <>
            <Alert severity="error" sx={{ width: '100%' }}>
              Le service de connexion ne répond pas. Vérifiez que Keycloak est démarré, puis réessayez.
            </Alert>
            <Button variant="contained" onClick={onRetry}>Réessayer</Button>
          </>
        )}
      </Stack>
    </Box>
  )
}
