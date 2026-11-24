import AddOutlined from '@mui/icons-material/AddOutlined'
import ArrowDownwardOutlined from '@mui/icons-material/ArrowDownwardOutlined'
import ArrowUpwardOutlined from '@mui/icons-material/ArrowUpwardOutlined'
import DeleteOutlined from '@mui/icons-material/DeleteOutlined'
import { Alert, Button, Chip, IconButton, Stack, TableCell, TextField, Tooltip, Typography } from '@mui/material'
import { useMemo } from 'react'
import { useApi } from '../../api/useApi'
import { check, maxLength, required } from '../../lib/validation'
import { PATHS, resource, type Attribute, type AttributeRequest } from './api'
import { NameCell } from './cells'
import { ReferenceTab, type FieldsProps, type ReferenceConfig } from './ReferenceTab'

/** A value row; `key` keeps React's keys stable while rows move, `id` is null for a new value. */
type ValueRow = { key: number; id: number | null; value: string }
type AttributeForm = { name: string; values: ValueRow[] }

const MAX_VALUES = 100
let nextKey = 1
const row = (id: number | null = null, value = ''): ValueRow => ({ key: nextKey++, id, value })

/** Empty or repeated values (« Noir » and « noir »), by row key: the service refuses both. */
function valueProblems(rows: ValueRow[]): Map<number, string> {
  const problems = new Map<number, string>()
  const seen = new Set<string>()
  for (const current of rows) {
    const value = current.value.trim().toLowerCase()
    const error = check(current.value, required, maxLength(50))
      ?? (seen.has(value) ? `« ${current.value.trim()} » est déjà dans la liste.` : null)
    if (error) problems.set(current.key, error)
    seen.add(value)
  }
  return problems
}

function AttributeFields({ form, errors, set }: FieldsProps<Attribute, AttributeForm>) {
  const problems = errors.values ? valueProblems(form.values) : new Map<number, string>()
  const update = (key: number, value: string) => set('values', form.values.map((current) => (current.key === key ? { ...current, value } : current)))
  const move = (index: number, by: number) => {
    const next = [...form.values]
    ;[next[index], next[index + by]] = [next[index + by], next[index]]
    set('values', next)
  }

  return (
    <>
      <TextField
        label="Nom"
        value={form.name}
        onChange={(event) => set('name', event.target.value)}
        error={Boolean(errors.name)}
        helperText={errors.name ?? 'Ce qui fait varier un produit : Couleur, Layout clavier, Capacité…'}
        required
        autoFocus
        slotProps={{ htmlInput: { maxLength: 50 } }}
      />
      <Stack spacing={1}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>Valeurs</Typography>
        <Typography variant="body2" color="text.secondary">
          Dans l’ordre où le client les verra. Une valeur utilisée par une variante ne peut pas être retirée, mais peut être renommée.
        </Typography>
        {errors.values && <Alert severity="error">{errors.values}</Alert>}
        {form.values.map((current, index) => (
          <Stack key={current.key} direction="row" spacing={0.5} sx={{ alignItems: 'flex-start' }}>
            <TextField
              size="small"
              label={`Valeur ${index + 1}`}
              value={current.value}
              onChange={(event) => update(current.key, event.target.value)}
              error={problems.has(current.key)}
              helperText={problems.get(current.key)}
              sx={{ flex: 1 }}
              slotProps={{ htmlInput: { maxLength: 50 } }}
            />
            <Tooltip title="Monter">
              <span>
                <IconButton aria-label={`Monter la valeur ${index + 1}`} disabled={index === 0} onClick={() => move(index, -1)}>
                  <ArrowUpwardOutlined fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Descendre">
              <span>
                <IconButton aria-label={`Descendre la valeur ${index + 1}`} disabled={index === form.values.length - 1} onClick={() => move(index, 1)}>
                  <ArrowDownwardOutlined fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Retirer">
              <IconButton aria-label={`Retirer la valeur ${index + 1}`} onClick={() => set('values', form.values.filter((other) => other.key !== current.key))}>
                <DeleteOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ))}
        <div>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<AddOutlined />}
            disabled={form.values.length >= MAX_VALUES}
            onClick={() => set('values', [...form.values, row()])}
          >
            Ajouter une valeur
          </Button>
        </div>
      </Stack>
    </>
  )
}

/**
 * C17: the attributes the variants of a product pick their values from
 * (C04). Same screen as the other reference lists; the values are edited
 * as a list, in display order, and the service keeps the ones sent with
 * their id, so a renamed value stays on its variants.
 */
export function AttributesTab() {
  const api = useApi()
  const config = useMemo<ReferenceConfig<Attribute, AttributeForm, AttributeRequest>>(() => {
    const attributes = resource<Attribute, AttributeRequest>(api, PATHS.attributes)
    return {
      words: {
        table: 'Attributs',
        count: (n) => (n > 1 ? `${n} attributs` : `${n} attribut`),
        empty: 'Aucun attribut pour l’instant : créez-en un avant de décliner un produit en variantes.',
        add: 'Ajouter un attribut',
        createTitle: 'Nouvel attribut',
        created: 'Attribut créé.',
        updated: 'Attribut enregistré.',
        deleted: 'Attribut supprimé.',
        deleteTitle: 'Supprimer l’attribut ?',
      },
      load: attributes.list,
      create: attributes.create,
      update: attributes.update,
      remove: attributes.remove,
      name: (attribute) => attribute.name,
      search: (attribute, query) => attribute.name.toLowerCase().includes(query)
        || attribute.values.some((value) => value.value.toLowerCase().includes(query)),
      head: (
        <>
          <TableCell>Attribut</TableCell>
          <TableCell>Valeurs</TableCell>
        </>
      ),
      columns: 2,
      minWidth: 640,
      cells: (attribute) => (
        <>
          <NameCell>{attribute.name}</NameCell>
          <TableCell>
            <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {attribute.values.length === 0
                ? <Typography variant="body2" color="text.disabled">Aucune valeur</Typography>
                : attribute.values.map((value) => <Chip key={value.id} size="small" variant="outlined" label={value.value} />)}
            </Stack>
          </TableCell>
        </>
      ),
      emptyForm: () => ({ name: '', values: [row()] }),
      formOf: (attribute) => ({ name: attribute.name, values: attribute.values.map((value) => row(value.id, value.value)) }),
      validate: (form, editing, items) => {
        const name = form.name.trim().toLowerCase()
        const taken = items.some((attribute) => attribute.id !== editing?.id && attribute.name.toLowerCase() === name)
        const problems = valueProblems(form.values)
        return {
          name: check(form.name, required, maxLength(50)) ?? (taken ? 'Ce nom est déjà pris.' : undefined),
          values: problems.size > 0 ? 'Certaines valeurs sont vides ou en double : elles sont signalées ci-dessous.' : undefined,
        }
      },
      request: (form) => ({
        name: form.name.trim(),
        values: form.values.map((current) => ({ id: current.id, value: current.value.trim() })),
      }),
      Fields: AttributeFields,
      deleteText: (attribute) => <>L’attribut <strong>{attribute.name}</strong> et ses valeurs seront supprimés définitivement.</>,
      inUse: (attribute) => `« ${attribute.name} » est encore utilisé par des variantes : changez-les ou supprimez-les avant de supprimer l’attribut.`,
    }
  }, [api])

  return <ReferenceTab config={config} />
}
