import { TextField } from '@mui/material'
import { slugify } from '../../lib/slugs'
import type { FieldErrors } from '../../lib/validation'
import { monoFont } from '../../theme'
import type { NamedForm } from './namedForm'

export function NamedFields({ form, errors, set, editing }: {
  form: NamedForm
  errors: FieldErrors<keyof NamedForm>
  set: <K extends keyof NamedForm>(key: K, value: string) => void
  editing: boolean
}) {
  const derived = slugify(form.name.trim())
  const slugHelp = editing
    ? 'Changer le slug change l’adresse publique : les liens déjà partagés ne marcheront plus.'
    : form.slug.trim()
      ? 'Identifiant dans les adresses du catalogue : il ne changera plus tout seul.'
      : derived
        ? `Laissé vide, il sera « ${derived} ».`
        : 'Laissé vide, il sera tiré du nom.'

  return (
    <>
      <TextField
        label="Nom"
        value={form.name}
        onChange={(event) => set('name', event.target.value)}
        error={Boolean(errors.name)}
        helperText={errors.name}
        required
        autoFocus
        slotProps={{ htmlInput: { maxLength: 100 } }}
      />
      <TextField
        label="Slug"
        value={form.slug}
        onChange={(event) => set('slug', event.target.value.toLowerCase())}
        error={Boolean(errors.slug)}
        helperText={errors.slug ?? slugHelp}
        required={editing}
        placeholder={editing ? undefined : derived || undefined}
        slotProps={{ htmlInput: { maxLength: 120, spellCheck: false, style: { fontFamily: monoFont } } }}
      />
      <TextField
        label="Description"
        value={form.description}
        onChange={(event) => set('description', event.target.value)}
        error={Boolean(errors.description)}
        helperText={errors.description ?? `${form.description.length} / 2000`}
        multiline
        minRows={3}
        slotProps={{ htmlInput: { maxLength: 2000 } }}
      />
    </>
  )
}
