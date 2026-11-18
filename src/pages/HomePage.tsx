import { Card, CardActionArea, CardContent, Chip, Grid, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { visibleNavigation } from '../navigation'

/** The entry point: a greeting, then a card per screen the user may open. */
export function HomePage() {
  const { user } = useAuth()
  const sections = visibleNavigation(user.roles).filter((section) => section.title)

  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Typography variant="h1">Bonjour {user.name}</Typography>
        <Typography color="text.secondary">Le back-office de log : catalogue, ventes et administration.</Typography>
      </Stack>
      {sections.map((section) => (
        <Stack key={section.title} spacing={2}>
          <Typography variant="overline" color="text.secondary">{section.title}</Typography>
          <Grid container spacing={2}>
            {section.items.map((item) => (
              <Grid key={item.path} size={{ xs: 12, sm: 6, lg: 4 }}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardActionArea component={RouterLink} to={item.path} sx={{ height: '100%' }}>
                    <CardContent>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        {item.icon}
                        <Typography variant="h4" component="h2">{item.label}</Typography>
                      </Stack>
                      {!item.element && <Chip size="small" label="À venir" sx={{ mt: 2 }} />}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Stack>
      ))}
    </Stack>
  )
}
