import { MenuItem, Stack, TableCell, TextField, Typography } from '@mui/material'
import { useMemo } from 'react'
import { useApi } from '../../api/useApi'
import { check, optional } from '../../lib/validation'
import { PATHS, resource, type Category, type CategoryRequest } from './api'
import { MonoCell } from './cells'
import { branchOf, categoryTree, type TreeRow } from './categoryTree'
import { NamedFields } from './NamedFields'
import { emptyNamedForm, namedFormOf, slugToSend, validateNamed, type NamedForm } from './namedForm'
import { position, POSITION_HELP, positionToSend } from './positionField'
import { ReferenceTab, type FieldsProps, type ReferenceConfig } from './ReferenceTab'

/** parentId is '' for a root category: a select needs a string. */
type CategoryForm = NamedForm & { parentId: string; position: string }

// L'arbre se calcule une fois par liste chargee, pas une fois par ligne.
const trees = new WeakMap<readonly Category[], Map<number, TreeRow>>()
function rowsOf(categories: readonly Category[]): Map<number, TreeRow> {
  let rows = trees.get(categories)
  if (!rows) {
    rows = new Map(categoryTree(categories).map((row) => [row.category.id, row]))
    trees.set(categories, rows)
  }
  return rows
}

function CategoryFields({ form, errors, set, editing, items }: FieldsProps<Category, CategoryForm>) {
  // Ni elle-meme ni ses descendantes : l'arbre aurait une boucle.
  const excluded = editing ? branchOf(editing.id, items) : new Set<number>()
  const parents = [...rowsOf(items).values()].filter((row) => !excluded.has(row.category.id))

  return (
    <>
      <NamedFields form={form} errors={errors} set={set} editing={editing !== null} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          select
          label="Catégorie parente"
          value={form.parentId}
          onChange={(event) => set('parentId', event.target.value)}
          helperText="Aucune : elle apparaît au premier niveau du menu."
          sx={{ flex: 2 }}
          // Sans cela, la valeur vide (« Aucune ») ne s'affiche pas et le libelle recouvre le champ.
          slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
        >
          <MenuItem value="">Aucune (premier niveau)</MenuItem>
          {parents.map((row) => (
            <MenuItem key={row.category.id} value={String(row.category.id)}>{row.path.join(' › ')}</MenuItem>
          ))}
        </TextField>
        <TextField
          label="Position"
          value={form.position}
          onChange={(event) => set('position', event.target.value)}
          error={Boolean(errors.position)}
          helperText={errors.position ?? POSITION_HELP}
          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
          sx={{ flex: 1 }}
        />
      </Stack>
    </>
  )
}

export function CategoriesTab() {
  const api = useApi()
  const config = useMemo<ReferenceConfig<Category, CategoryForm, CategoryRequest>>(() => {
    const categories = resource<Category, CategoryRequest>(api, PATHS.categories)
    return {
      words: {
        table: 'Catégories',
        count: (n) => (n > 1 ? `${n} catégories` : `${n} catégorie`),
        empty: 'Aucune catégorie pour l’instant.',
        add: 'Ajouter une catégorie',
        createTitle: 'Nouvelle catégorie',
        created: 'Catégorie créée.',
        updated: 'Catégorie enregistrée.',
        deleted: 'Catégorie supprimée.',
        deleteTitle: 'Supprimer la catégorie ?',
      },
      load: categories.list,
      create: categories.create,
      update: categories.update,
      remove: categories.remove,
      name: (category) => category.name,
      arrange: (items) => [...rowsOf(items).values()].map((row) => row.category),
      search: (category, query) => category.name.toLowerCase().includes(query) || category.slug.includes(query),
      head: (
        <>
          <TableCell>Catégorie</TableCell>
          <TableCell>Slug</TableCell>
          <TableCell align="right">Position</TableCell>
          <TableCell align="right">Sous-catégories</TableCell>
        </>
      ),
      columns: 4,
      cells: (category, items) => {
        const row = rowsOf(items).get(category.id)
        const depth = row?.depth ?? 0
        return (
          <>
            <TableCell component="th" scope="row" sx={{ pl: `${16 + depth * 24}px` }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {depth > 0 && <Typography component="span" aria-hidden color="text.disabled" sx={{ mr: 1 }}>└</Typography>}
                {category.name}
              </Typography>
              {depth > 0 && row && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 3 }}>
                  dans {row.path.slice(0, -1).join(' › ')}
                </Typography>
              )}
            </TableCell>
            <MonoCell>{category.slug}</MonoCell>
            <MonoCell align="right">{category.position}</MonoCell>
            <MonoCell align="right">{row?.children ?? 0}</MonoCell>
          </>
        )
      },
      emptyForm: () => ({ ...emptyNamedForm, parentId: '', position: '' }),
      formOf: (category) => ({
        ...namedFormOf(category),
        parentId: category.parentId === null ? '' : String(category.parentId),
        position: String(category.position),
      }),
      validate: (form, editing, items) => ({
        ...validateNamed(form, editing, items, false),
        position: check(form.position, position) ?? undefined,
      }),
      request: (form) => ({
        name: form.name.trim(),
        slug: slugToSend(form),
        description: optional(form.description),
        parentId: form.parentId ? Number(form.parentId) : null,
        position: positionToSend(form.position),
      }),
      Fields: CategoryFields,
      deleteBlocked: (category, items) => {
        const children = rowsOf(items).get(category.id)?.children ?? 0
        if (children === 0) return null
        return children > 1
          ? `Elle contient ${children} sous-catégories : déplacez-les ou supprimez-les d’abord.`
          : 'Elle contient une sous-catégorie : déplacez-la ou supprimez-la d’abord.'
      },
      deleteText: (category) => <>La catégorie <strong>{category.name}</strong> sera supprimée définitivement.</>,
      inUse: (category) => `« ${category.name} » range encore des produits du catalogue : changez leur catégorie avant de la supprimer.`,
    }
  }, [api])

  return <ReferenceTab config={config} />
}
