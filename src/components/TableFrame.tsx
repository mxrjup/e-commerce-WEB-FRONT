import { Alert, Button, Paper, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import type { ReactNode } from 'react'

/**
 * A table in its panel. Per the design system, a table is never turned into
 * cards on a small screen: it keeps a minimum width and scrolls sideways.
 *
 * Shows a placeholder while loading, the error with a retry if the load
 * failed, and `empty` when there is nothing to list.
 */
export function TableFrame({ label, head, columns, loading, error, onRetry, empty, isEmpty, minWidth = 720, children }: {
  /** The accessible name of the table. */
  label: string
  head: ReactNode
  columns: number
  loading: boolean
  /** The load error, in French; the table keeps showing its last rows below it. */
  error: string | null
  onRetry: () => void
  empty: ReactNode
  isEmpty: boolean
  minWidth?: number
  children: ReactNode
}) {
  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      {error && (
        <Alert severity="error" sx={{ borderRadius: 0 }} action={<Button color="inherit" size="small" onClick={onRetry}>Réessayer</Button>}>
          {error}
        </Alert>
      )}
      <TableContainer>
        <Table aria-label={label} aria-busy={loading} sx={{ minWidth }}>
          <TableHead><TableRow>{head}</TableRow></TableHead>
          <TableBody>
            {loading && isEmpty && !error
              ? [0, 1, 2].map((row) => (
                <TableRow key={row}>
                  <TableCell colSpan={columns}><Skeleton /></TableCell>
                </TableRow>
              ))
              : isEmpty && !error
                ? (
                  <TableRow>
                    <TableCell colSpan={columns} sx={{ py: 5, textAlign: 'center', color: 'text.secondary' }}>{empty}</TableCell>
                  </TableRow>
                )
                : children}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}
