import { Alert, Box, Button, Grid, InputAdornment, Paper, Skeleton, Stack, TextField, Typography } from '@mui/material'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useBlocker } from 'react-router'
import { errorMessage } from '../../api/errors'
import { json, useApi } from '../../api/useApi'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useNotify } from '../../components/Notifications'
import { PageHeader } from '../../components/PageHeader'
import { formatDateTime } from '../../lib/format'
import { hasErrors } from '../../lib/validation'
import { monoFont, tokens } from '../../theme'
import { formOf, requestOf, SECTIONS, validate, type Field, type SettingsForm, type StoreSettings } from './settingsForm'

const PATH = '/api/admin/store-settings'

/**
 * U08, second half: the shop settings of U05 (contact, legal mentions,
 * shipping fees). Admins only, like the API. Leaving with unsaved changes
 * asks first, inside the back-office as when closing the tab.
 */
export function SettingsPage() {
  const api = useApi()
  const notify = useNotify()
  const [saved, setSaved] = useState<StoreSettings | null>(null)
  const [form, setForm] = useState<SettingsForm | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const load = useCallback(() => api<StoreSettings>(PATH).then((settings) => {
    setSaved(settings)
    setForm(formOf(settings))
    setLoadError(null)
  }, setLoadError), [api])

  useEffect(() => {
    void load()
  }, [load])

  const dirty = useMemo(() => saved !== null && form !== null && JSON.stringify(formOf(saved)) !== JSON.stringify(form), [saved, form])
  const errors = useMemo(() => (form && submitted ? validate(form) : {}), [form, submitted])

  // Quitter l'ecran avec des modifications : on demande d'abord.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!form) return
    setSubmitted(true)
    if (hasErrors(validate(form))) {
      setSaveError('Certains champs sont à corriger : ils sont signalés en rouge.')
      // Le premier champ a corriger peut etre loin de la barre : on y amene le curseur.
      requestAnimationFrame(() => document.querySelector<HTMLElement>('form [aria-invalid="true"]')?.focus())
      return
    }
    setSaving(true)
    try {
      const updated = await api<StoreSettings>(PATH, json('PUT', requestOf(form)))
      setSaved(updated)
      setForm(formOf(updated))
      setSubmitted(false)
      setSaveError(null)
      notify('Paramètres enregistrés.')
    } catch (e) {
      setSaveError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  function input(field: Field) {
    if (!form) return null
    const error = errors[field.key]
    const money = field.kind === 'money'
    return (
      <TextField
        label={field.label}
        value={form[field.key]}
        onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
        required={field.required}
        error={Boolean(error)}
        helperText={error ?? field.help}
        type={field.kind === 'email' ? 'email' : field.kind === 'url' ? 'url' : 'text'}
        multiline={field.kind === 'long'}
        minRows={field.kind === 'long' ? 3 : undefined}
        fullWidth
        slotProps={{
          htmlInput: {
            maxLength: field.max ?? (field.kind === 'currency' ? 3 : 255),
            inputMode: money ? 'decimal' : undefined,
            style: money || field.kind === 'currency' || field.kind === 'siret'
              ? { fontFamily: monoFont, textAlign: money ? 'right' : undefined, textTransform: field.kind === 'currency' ? 'uppercase' : undefined }
              : undefined,
          },
          input: money ? { endAdornment: <InputAdornment position="end">{form.currency.toUpperCase() || '—'}</InputAdornment> } : undefined,
        }}
      />
    )
  }

  return (
    <Box component="form" noValidate onSubmit={save}>
      <PageHeader
        title="Paramètres de la boutique"
        description={saved?.updatedAt ? `Dernière modification le ${formatDateTime(saved.updatedAt)}.` : 'Coordonnées, mentions légales et frais de port.'}
      />

      {loadError !== null && (
        <Alert severity="error" sx={{ mb: 3 }} action={<Button color="inherit" size="small" onClick={() => void load()}>Réessayer</Button>}>
          {errorMessage(loadError)}
        </Alert>
      )}

      <Stack spacing={3}>
        {SECTIONS.map((section) => (
          <Paper key={section.title} variant="outlined" component="section" aria-labelledby={`section-${section.fields[0].key}`} sx={{ p: 3 }}>
            <Typography variant="h4" component="h2" id={`section-${section.fields[0].key}`}>{section.title}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>{section.description}</Typography>
            <Grid container spacing={2.5}>
              {section.fields.map((field) => (
                <Grid key={field.key} size={{ xs: 12, md: field.kind === 'long' ? 12 : 6 }}>
                  {form ? input(field) : <Skeleton variant="rounded" height={56} />}
                </Grid>
              ))}
            </Grid>
          </Paper>
        ))}
      </Stack>

      {/* La barre d'enregistrement reste visible au bas de l'ecran pendant qu'on fait defiler le formulaire. */}
      <Paper
        variant="outlined"
        sx={{
          position: 'sticky', bottom: 16, mt: 3, p: 2, zIndex: 1, borderColor: dirty ? tokens.lineStrong : undefined,
          display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'flex-end',
        }}
      >
        {saveError && <Alert severity="error" sx={{ flex: '1 1 100%' }}>{saveError}</Alert>}
        <Typography variant="body2" color="text.secondary" role="status" sx={{ flexGrow: 1 }}>
          {dirty ? 'Modifications non enregistrées.' : form ? 'Tout est enregistré.' : ''}
        </Typography>
        <Button
          variant="outlined"
          color="secondary"
          disabled={!dirty || saving}
          onClick={() => {
            if (saved) setForm(formOf(saved))
            setSubmitted(false)
            setSaveError(null)
          }}
        >
          Annuler les modifications
        </Button>
        <Button type="submit" variant="contained" disabled={!dirty} loading={saving}>Enregistrer</Button>
      </Paper>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Quitter sans enregistrer ?"
        confirmLabel="Quitter sans enregistrer"
        onConfirm={async () => blocker.proceed?.()}
        onClose={() => blocker.reset?.()}
      >
        Les modifications des paramètres seront perdues.
      </ConfirmDialog>
    </Box>
  )
}
