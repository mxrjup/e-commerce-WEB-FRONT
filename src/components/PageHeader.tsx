import { Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

/** The title of a screen, what it is for, and its main action on the right. */
export function PageHeader({ title, description, action }: {
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'flex-end' }, mb: 3 }}
    >
      <Stack spacing={0.5}>
        <Typography variant="h3" component="h1">{title}</Typography>
        {description && <Typography variant="body2" color="text.secondary">{description}</Typography>}
      </Stack>
      {action}
    </Stack>
  )
}
