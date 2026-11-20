import { FormControl, FormControlLabel, Radio, RadioGroup, Typography } from '@mui/material'
import { useState } from 'react'
import { errorMessage } from '../../api/errors'
import { FormDialog } from '../../components/FormDialog'
import { displayName, ROLES, translations, type Collaborator, type CollaboratorRole } from './api'

/** Changes the role of an account; keyed by the account, so it opens on its current role. */
export function RoleDialog({ collaborator, onClose, onSave }: {
  collaborator: Collaborator
  onClose: () => void
  onSave: (role: CollaboratorRole) => Promise<void>
}) {
  const [role, setRole] = useState<CollaboratorRole>(collaborator.role)
  const [failure, setFailure] = useState<string | null>(null)

  async function submit(): Promise<boolean> {
    if (role === collaborator.role) {
      onClose()
      return true
    }
    try {
      await onSave(role)
      return true
    } catch (e) {
      setFailure(errorMessage(e, translations))
      return false
    }
  }

  return (
    <FormDialog open title={`Rôle de ${displayName(collaborator)}`} submitLabel="Enregistrer" onClose={onClose} onSubmit={submit} error={failure}>
      <FormControl>
        <RadioGroup aria-label="Rôle" value={role} onChange={(event) => setRole(event.target.value as CollaboratorRole)}>
          {ROLES.map((option) => (
            <FormControlLabel
              key={option.value}
              value={option.value}
              control={<Radio />}
              label={(
                <span>
                  <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>{option.label}</Typography>
                  <Typography component="span" variant="body2" color="text.secondary"> — {option.help}</Typography>
                </span>
              )}
            />
          ))}
        </RadioGroup>
      </FormControl>
      <Typography variant="body2" color="text.secondary">
        Le changement vaut à sa prochaine connexion, ou au plus tard au renouvellement de sa session (quelques minutes).
      </Typography>
    </FormDialog>
  )
}
