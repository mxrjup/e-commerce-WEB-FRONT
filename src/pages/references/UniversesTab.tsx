import { TableCell, TextField } from '@mui/material'
import { useMemo } from 'react'
import { useApi } from '../../api/useApi'
import { check, maxLength, optional, optionalUrl } from '../../lib/validation'
import { PATHS, resource, type Universe, type UniverseRequest } from './api'
import { MonoCell, NameCell, TextCell } from './cells'
import { NamedFields } from './NamedFields'
import { emptyNamedForm, namedFormOf, slugToSend, validateNamed, type NamedForm } from './namedForm'
import { position, POSITION_HELP, positionToSend } from './positionField'
import { ReferenceTab, type FieldsProps, type ReferenceConfig } from './ReferenceTab'
import { Thumbnail } from './Thumbnail'

type UniverseForm = NamedForm & { imageUrl: string; position: string }

function UniverseFields({ form, errors, set, editing }: FieldsProps<Universe, UniverseForm>) {
  return (
    <>
      <NamedFields form={form} errors={errors} set={set} editing={editing !== null} />
      <TextField
        label="Adresse de l’image"
        value={form.imageUrl}
        onChange={(event) => set('imageUrl', event.target.value)}
        error={Boolean(errors.imageUrl)}
        helperText={errors.imageUrl ?? 'Facultatif. Le visuel de la tuile de l’univers sur l’accueil, en https.'}
        type="url"
        slotProps={{ htmlInput: { maxLength: 500 } }}
      />
      <TextField
        label="Position"
        value={form.position}
        onChange={(event) => set('position', event.target.value)}
        error={Boolean(errors.position)}
        helperText={errors.position ?? POSITION_HELP}
        slotProps={{ htmlInput: { inputMode: 'numeric' } }}
        sx={{ maxWidth: 240 }}
      />
    </>
  )
}

export function UniversesTab() {
  const api = useApi()
  const config = useMemo<ReferenceConfig<Universe, UniverseForm, UniverseRequest>>(() => {
    const universes = resource<Universe, UniverseRequest>(api, PATHS.universes)
    return {
      words: {
        table: 'Univers',
        count: (n) => `${n} univers`,
        empty: 'Aucun univers pour l’instant.',
        add: 'Ajouter un univers',
        createTitle: 'Nouvel univers',
        created: 'Univers créé.',
        updated: 'Univers enregistré.',
        deleted: 'Univers supprimé.',
        deleteTitle: 'Supprimer l’univers ?',
      },
      load: universes.list,
      create: universes.create,
      update: universes.update,
      remove: universes.remove,
      name: (universe) => universe.name,
      search: (universe, query) => universe.name.toLowerCase().includes(query) || universe.slug.includes(query),
      head: (
        <>
          <TableCell>Univers</TableCell>
          <TableCell>Slug</TableCell>
          <TableCell>Description</TableCell>
          <TableCell align="right">Position</TableCell>
        </>
      ),
      columns: 4,
      cells: (universe) => (
        <>
          <NameCell leading={<Thumbnail src={universe.imageUrl} name={universe.name} />}>{universe.name}</NameCell>
          <MonoCell>{universe.slug}</MonoCell>
          <TextCell text={universe.description} />
          <MonoCell align="right">{universe.position}</MonoCell>
        </>
      ),
      emptyForm: () => ({ ...emptyNamedForm, imageUrl: '', position: '' }),
      formOf: (universe) => ({ ...namedFormOf(universe), imageUrl: universe.imageUrl ?? '', position: String(universe.position) }),
      validate: (form, editing, items) => ({
        ...validateNamed(form, editing, items, true),
        imageUrl: check(form.imageUrl, maxLength(500), optionalUrl) ?? undefined,
        position: check(form.position, position) ?? undefined,
      }),
      request: (form) => ({
        name: form.name.trim(),
        slug: slugToSend(form),
        description: optional(form.description),
        imageUrl: optional(form.imageUrl),
        position: positionToSend(form.position),
      }),
      Fields: UniverseFields,
      deleteText: (universe) => <>L’univers <strong>{universe.name}</strong> sera supprimé définitivement.</>,
      inUse: (universe) => `« ${universe.name} » regroupe encore des produits du catalogue : retirez-les de cet univers avant de le supprimer.`,
    }
  }, [api])

  return <ReferenceTab config={config} />
}
