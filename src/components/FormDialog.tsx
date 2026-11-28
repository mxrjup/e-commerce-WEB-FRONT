import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material'
import { useState, type FormEvent, type ReactNode } from 'react'

/**
 * A dialog holding a form. While the request runs, nothing can be clicked
 * twice nor closed; if it fails, the message shows above the fields and
 * everything typed is kept.
 *
 * @param onSubmit returns false to stay open without calling the API (invalid fields)
 */
export function FormDialog({ open, title, submitLabel, onClose, onSubmit, error, children, maxWidth = 'sm' }: {
  open: boolean
  title: string
  submitLabel: string
  onClose: () => void
  onSubmit: () => Promise<boolean | void>
  /** The failure of the last attempt, in French. */
  error?: string | null
  children: ReactNode
  maxWidth?: 'xs' | 'sm' | 'md'
}) {
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    // Le dialogue s'affiche hors de la page, mais React fait remonter ses evenements a ses parents :
    // ouvert depuis un autre formulaire (une fiche produit), il l'enverrait aussi.
    event.stopPropagation()
    setSaving(true)
    try {
      await onSubmit()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth={maxWidth}
      slotProps={{ paper: { component: 'form', onSubmit: submit, noValidate: true } as object }}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {children}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="outlined" color="secondary" onClick={onClose} disabled={saving}>Annuler</Button>
        <Button type="submit" variant="contained" loading={saving}>{submitLabel}</Button>
      </DialogActions>
    </Dialog>
  )
}
