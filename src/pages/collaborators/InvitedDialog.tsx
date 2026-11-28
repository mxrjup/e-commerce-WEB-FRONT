import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material'
import { CodeLine } from '../../components/CodeLine'
import { displayName, type Collaborator } from './api'

/**
 * What to send to the new collaborator. The temporary password is only in
 * this browser: once the dialog is closed, nobody can read it again.
 */
export function InvitedDialog({ invited, onClose }: {
  invited: { collaborator: Collaborator; password: string } | null
  onClose: () => void
}) {
  return (
    // Sans onClose, ni Echap ni un clic a cote ne ferment la fenetre : seul le bouton le fait.
    <Dialog open={invited !== null} maxWidth="sm" fullWidth aria-describedby="invitation-a-transmettre">
      <DialogTitle>Compte de {invited && displayName(invited.collaborator)} créé</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5}>
          <Alert severity="info" id="invitation-a-transmettre">
            Transmettez-lui ces informations par un canal sûr. Le mot de passe temporaire ne sera plus affiché ;
            à sa première connexion, il devra en choisir un.
          </Alert>
          {invited && (
            <>
              <CodeLine label="Adresse du back-office" value={window.location.origin} />
              <CodeLine label="Identifiant" value={invited.collaborator.email} />
              <CodeLine label="Mot de passe temporaire" value={invited.password} />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="contained" onClick={onClose}>C’est transmis</Button>
      </DialogActions>
    </Dialog>
  )
}
