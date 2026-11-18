import { Button, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router'

export function NotFoundPage() {
  return (
    <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
      <Typography variant="h2" component="h1">Page introuvable</Typography>
      <Typography color="text.secondary">Cette adresse ne correspond à aucun écran du back-office.</Typography>
      <Button variant="contained" component={RouterLink} to="/">Retour à l’accueil</Button>
    </Stack>
  )
}
