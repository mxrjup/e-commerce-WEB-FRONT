import AutorenewOutlined from '@mui/icons-material/AutorenewOutlined'
import {
  Button, FormControl, FormControlLabel, FormLabel, Radio, RadioGroup, Stack, TextField, Typography,
} from '@mui/material'
import { useState } from 'react'
import { errorMessage } from '../../api/errors'
import { FormDialog } from '../../components/FormDialog'
import { check, email, maxLength, required } from '../../lib/validation'
import { monoFont } from '../../theme'
import { ROLES, translations, type Collaborator, type CollaboratorRole, type CreateCollaboratorRequest } from './api'
import { passwordError, temporaryPassword } from './password'

type Form = { firstName: string; lastName: string; email: string; role: CollaboratorRole; password: string }

const empty = (): Form => ({ firstName: '', lastName: '', email: '', role: 'collaborator', password: temporaryPassword() })

export function InviteDialog({ open, existing, onClose, onCreated, create }: {
  open: boolean
  /** To say at once that an address is taken by another collaborator. */
  existing: Collaborator[]
  onClose: () => void
  onCreated: (collaborator: Collaborator, password: string) => void
  create: (request: CreateCollaboratorRequest) => Promise<Collaborator>
}) {
  const [form, setForm] = useState<Form>(empty)
  const [submitted, setSubmitted] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => ({ ...current, [key]: value }))

  const address = form.email.trim().toLowerCase()
  const errors = {
    firstName: check(form.firstName, required, maxLength(100)),
    lastName: check(form.lastName, required, maxLength(100)),
    email: check(form.email, required, maxLength(254), email)
      ?? (existing.some((collaborator) => collaborator.email.toLowerCase() === address) ? 'Ce collaborateur existe déjà.' : null),
    password: passwordError(form.password, form.email),
  }
  const shown: Partial<typeof errors> = submitted ? errors : {}

  function close() {
    setForm(empty())
    setSubmitted(false)
    setFailure(null)
    onClose()
  }

  async function submit(): Promise<boolean> {
    setSubmitted(true)
    if (Object.values(errors).some(Boolean)) return false
    try {
      const created = await create({
        email: address,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        role: form.role,
        temporaryPassword: form.password,
      })
      onCreated(created, form.password)
      setForm(empty())
      setSubmitted(false)
      setFailure(null)
      return true
    } catch (e) {
      setFailure(errorMessage(e, translations))
      return false
    }
  }

  return (
    <FormDialog open={open} title="Inviter un collaborateur" submitLabel="Créer le compte" onClose={close} onSubmit={submit} error={failure}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Prénom" value={form.firstName} onChange={(event) => set('firstName', event.target.value)} required autoFocus
          error={Boolean(shown.firstName)} helperText={shown.firstName} sx={{ flex: 1 }} slotProps={{ htmlInput: { maxLength: 100 } }}
        />
        <TextField
          label="Nom" value={form.lastName} onChange={(event) => set('lastName', event.target.value)} required
          error={Boolean(shown.lastName)} helperText={shown.lastName} sx={{ flex: 1 }} slotProps={{ htmlInput: { maxLength: 100 } }}
        />
      </Stack>
      <TextField
        label="Adresse e-mail" type="email" value={form.email} onChange={(event) => set('email', event.target.value)} required
        error={Boolean(shown.email)} helperText={shown.email ?? 'C’est aussi son identifiant de connexion.'}
        slotProps={{ htmlInput: { maxLength: 254, autoComplete: 'off' } }}
      />
      <FormControl>
        <FormLabel id="role-invitation">Rôle</FormLabel>
        <RadioGroup aria-labelledby="role-invitation" value={form.role} onChange={(event) => set('role', event.target.value as CollaboratorRole)}>
          {ROLES.map((role) => (
            <FormControlLabel
              key={role.value}
              value={role.value}
              control={<Radio />}
              label={(
                <span>
                  <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>{role.label}</Typography>
                  <Typography component="span" variant="body2" color="text.secondary"> — {role.help}</Typography>
                </span>
              )}
            />
          ))}
        </RadioGroup>
      </FormControl>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
        <TextField
          label="Mot de passe temporaire" value={form.password} onChange={(event) => set('password', event.target.value)} required
          error={Boolean(shown.password)}
          helperText={shown.password ?? 'À lui transmettre : Keycloak lui fera choisir le sien à sa première connexion.'}
          sx={{ flex: 1 }}
          slotProps={{ htmlInput: { maxLength: 128, spellCheck: false, autoComplete: 'off', style: { fontFamily: monoFont } } }}
        />
        <Button variant="outlined" color="secondary" startIcon={<AutorenewOutlined />} onClick={() => set('password', temporaryPassword())} sx={{ mt: 1 }}>
          Générer
        </Button>
      </Stack>
    </FormDialog>
  )
}
