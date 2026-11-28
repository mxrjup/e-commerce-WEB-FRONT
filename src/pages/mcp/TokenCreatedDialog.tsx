import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material'
import { CodeLine } from '../../components/CodeLine'
import { monoFont } from '../../theme'
import type { CreatedMcpToken } from './api'

/**
 * The only time a token is shown: the service keeps nothing but its
 * fingerprint. The dialog does not close on Escape nor on a click outside,
 * so the token is not lost by accident.
 */
export function TokenCreatedDialog({ token, endpoint, onClose }: {
  token: CreatedMcpToken | null
  endpoint: string
  onClose: () => void
}) {
  return (
    // Sans onClose, ni Echap ni un clic a cote ne ferment la fenetre : seul le bouton le fait.
    <Dialog open={token !== null} maxWidth="sm" fullWidth aria-describedby="jeton-unique">
      <DialogTitle>Jeton « {token?.name} » créé</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5}>
          <Alert severity="warning" id="jeton-unique">
            Copiez-le maintenant : il ne sera <strong>plus jamais affiché</strong>. Perdu, il faut le révoquer et en créer un autre.
          </Alert>
          {token && <CodeLine label="Jeton" value={token.token} />}
          <CodeLine label="Adresse du serveur MCP" value={endpoint} />
          <Typography variant="body2" color="text.secondary">
            Dans le client MCP (Claude Desktop, MCP Inspector…), indiquez cette adresse, en transport HTTP, et
            envoyez le jeton dans l’en-tête <Box component="code" sx={{ fontFamily: monoFont }}>Authorization: Bearer …</Box>.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="contained" onClick={onClose}>J’ai copié le jeton</Button>
      </DialogActions>
    </Dialog>
  )
}
