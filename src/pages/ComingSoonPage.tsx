import ConstructionOutlined from '@mui/icons-material/ConstructionOutlined'
import { Link, Paper, Stack, Typography } from '@mui/material'
import type { NavItem } from '../navigation'

const ISSUES = 'https://github.com/mxrjup/e-commerce-BACK/issues/'

/** The placeholder of a screen not delivered yet: which task brings it, and who owns it. */
export function ComingSoonPage({ item }: { item: NavItem }) {
  const task = item.task
  return (
    <Paper variant="outlined" sx={{ p: 4, maxWidth: 640 }}>
      <Stack spacing={2}>
        <ConstructionOutlined color="primary" sx={{ fontSize: 36 }} />
        <Typography variant="h2" component="h1">{item.label}</Typography>
        <Typography color="text.secondary">Cet écran arrive bientôt.</Typography>
        {task && (
          <Typography variant="body2">
            Tâche{' '}
            <Link href={`${ISSUES}${task.issue}`} target="_blank" rel="noreferrer">{task.id} (#{task.issue})</Link>
            {task.owner ? ` · ${task.owner}` : ' · à attribuer'}
          </Typography>
        )}
      </Stack>
    </Paper>
  )
}
