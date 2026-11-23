import { Box, CircularProgress } from '@mui/material'
import { lazy, Suspense } from 'react'

const StatisticsPage = lazy(() => import('./StatisticsPage').then((module) => ({ default: module.StatisticsPage })))

/** Load the dashboard and its chart only when the statistics route opens. */
export function LazyStatisticsPage() {
  return <Suspense fallback={<Box sx={{ py: 5 }}><CircularProgress aria-label="Chargement des statistiques" /></Box>}>
    <StatisticsPage />
  </Suspense>
}
