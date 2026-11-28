import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'
import { useState, type ReactNode } from 'react'

/**
 * Asks before an action that cannot be undone. The confirm button is
 * outlined, never filled: per the design system, a destructive action is
 * never the most visible button.
 */
export function ConfirmDialog({ open, title, children, confirmLabel, onConfirm, onClose, error }: {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  onConfirm: () => Promise<void>
  onClose: () => void
  error?: string | null
}) {
  const [running, setRunning] = useState(false)

  async function confirm() {
    setRunning(true)
    try {
      await onConfirm()
    } finally {
      setRunning(false)
    }
  }

  return (
    <Dialog open={open} onClose={running ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <DialogContentText component="div">{children}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="outlined" color="secondary" onClick={onClose} disabled={running}>Annuler</Button>
        <Button variant="outlined" color="error" onClick={confirm} loading={running}>{confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  )
}
