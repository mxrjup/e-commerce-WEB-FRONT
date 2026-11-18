import {
  Checkbox, FormControl, FormControlLabel, FormGroup, FormHelperText, FormLabel, MenuItem, Stack, TextField, Typography,
} from '@mui/material'
import { useState } from 'react'
import { errorMessage } from '../../api/errors'
import { FormDialog } from '../../components/FormDialog'
import { formatDate } from '../../lib/format'
import { useNow } from '../../lib/useNow'
import { check, maxLength, required } from '../../lib/validation'
import { SCOPES, type CreatedMcpToken, type CreateMcpTokenRequest, type McpScope } from './api'
import { expiryOf, LIFETIMES, localDay, type Lifetime } from './lifetimes'

export function CreateTokenDialog({ open, onClose, onCreated, create }: {
  open: boolean
  onClose: () => void
  onCreated: (token: CreatedMcpToken) => void
  create: (request: CreateMcpTokenRequest) => Promise<CreatedMcpToken>
}) {
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<McpScope[]>(['catalog:read'])
  const [lifetime, setLifetime] = useState<Lifetime>('90')
  const [date, setDate] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  const now = useNow()
  const expiry = expiryOf(lifetime, date, now)
  const errors = {
    name: check(name, required, maxLength(100)),
    scopes: scopes.length === 0 ? 'Cochez au moins une portée.' : null,
    date: lifetime !== 'date' ? null
      : !date ? 'Choisissez une date.'
        : expiry && expiry.getTime() <= now ? 'La date doit être dans le futur.' : null,
  }
  const shown = submitted ? errors : { name: null, scopes: null, date: null }

  function reset() {
    setName('')
    setScopes(['catalog:read'])
    setLifetime('90')
    setDate('')
    setSubmitted(false)
    setFailure(null)
  }

  async function submit(): Promise<boolean> {
    setSubmitted(true)
    if (errors.name || errors.scopes || errors.date) return false
    try {
      // L'ordre du formulaire, pour que la liste affiche toujours les portees dans le meme ordre.
      const ordered = SCOPES.map((scope) => scope.value).filter((value) => scopes.includes(value))
      const created = await create({ name: name.trim(), scopes: ordered, expiresAt: expiry?.toISOString() ?? null })
      reset()
      onCreated(created)
      return true
    } catch (e) {
      setFailure(errorMessage(e))
      return false
    }
  }

  function toggle(scope: McpScope, checked: boolean) {
    setScopes((current) => (checked ? [...current, scope] : current.filter((value) => value !== scope)))
  }

  return (
    <FormDialog
      open={open}
      title="Nouveau jeton MCP"
      submitLabel="Créer le jeton"
      onClose={() => {
        reset()
        onClose()
      }}
      onSubmit={submit}
      error={failure}
    >
      <TextField
        label="Nom"
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={Boolean(shown.name)}
        helperText={shown.name ?? 'À quoi il sert et pour qui, par exemple « Claude Desktop – Marie ».'}
        required
        autoFocus
        slotProps={{ htmlInput: { maxLength: 100 } }}
      />
      <FormControl error={Boolean(shown.scopes)} component="fieldset" variant="standard">
        <FormLabel component="legend" sx={{ mb: 0.5 }}>Ce que le jeton peut lire</FormLabel>
        <FormGroup>
          {SCOPES.map((scope) => (
            <FormControlLabel
              key={scope.value}
              control={<Checkbox checked={scopes.includes(scope.value)} onChange={(event) => toggle(scope.value, event.target.checked)} />}
              label={(
                <span>
                  <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>{scope.label}</Typography>
                  <Typography component="span" variant="body2" color="text.secondary"> — {scope.help}</Typography>
                </span>
              )}
            />
          ))}
        </FormGroup>
        <FormHelperText>{shown.scopes ?? 'En lecture seule : aucun outil MCP ne modifie la boutique.'}</FormHelperText>
      </FormControl>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          select
          label="Expiration"
          value={lifetime}
          onChange={(event) => setLifetime(event.target.value as Lifetime)}
          helperText={lifetime === 'never'
            ? 'Il restera valide jusqu’à sa révocation.'
            : expiry ? `Expire le ${formatDate(expiry.toISOString())}.` : ' '}
          sx={{ flex: 1 }}
        >
          {LIFETIMES.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
        </TextField>
        {lifetime === 'date' && (
          <TextField
            label="Date d’expiration"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            error={Boolean(shown.date)}
            helperText={shown.date ?? 'Valide jusqu’à la fin de ce jour.'}
            sx={{ flex: 1 }}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: localDay(now) } }}
          />
        )}
      </Stack>
    </FormDialog>
  )
}
