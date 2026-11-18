import AddOutlined from '@mui/icons-material/AddOutlined'
import DeleteOutlined from '@mui/icons-material/DeleteOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import { Button, IconButton, InputAdornment, Stack, TableCell, TableRow, TextField, Tooltip, Typography } from '@mui/material'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ApiError } from '../../api/client'
import { errorMessage } from '../../api/errors'
import { useList } from '../../api/useList'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { FormDialog } from '../../components/FormDialog'
import { useNotify } from '../../components/Notifications'
import { TableFrame } from '../../components/TableFrame'
import { hasErrors, type FieldErrors } from '../../lib/validation'
import { translations } from './api'

export type FieldsProps<T, F> = {
  form: F
  errors: FieldErrors<Extract<keyof F, string>>
  set: <K extends keyof F>(key: K, value: F[K]) => void
  /** The entry being edited, null when creating one. */
  editing: T | null
  items: T[]
}

/**
 * Everything one kind of reference entry needs: its words, its columns, its
 * form and its rules. The behaviour around them (loading, searching,
 * creating, editing, deleting, telling what failed) is the same for all four.
 */
export type ReferenceConfig<T extends { id: number }, F, R> = {
  words: {
    /** « Marques », the accessible name of the table. */
    table: string
    count: (count: number) => string
    empty: string
    add: string
    createTitle: string
    created: string
    updated: string
    deleted: string
    deleteTitle: string
  }
  load: () => Promise<T[]>
  create: (request: R) => Promise<unknown>
  update: (id: number, request: R) => Promise<unknown>
  remove: (id: number) => Promise<unknown>
  name: (item: T) => string
  /** The order of the rows, when it is not the order of the API. */
  arrange?: (items: T[]) => T[]
  search?: (item: T, query: string) => boolean
  head: ReactNode
  /** The cells of a row, without the actions, which come last. */
  cells: (item: T, items: T[]) => ReactNode
  columns: number
  /** Below this width, the table scrolls sideways. */
  minWidth?: number
  emptyForm: () => F
  formOf: (item: T) => F
  validate: (form: F, editing: T | null, items: T[]) => FieldErrors<Extract<keyof F, string>>
  request: (form: F, editing: T | null) => R
  Fields: (props: FieldsProps<T, F>) => ReactNode
  /** Why an entry cannot be deleted right now, if it cannot. */
  deleteBlocked?: (item: T, items: T[]) => string | null
  deleteText: (item: T) => ReactNode
  /** What a 409 on deletion means: the entry is still used somewhere. */
  inUse: (item: T) => string
}

type Editor<T> = { editing: T | null } | null

export function ReferenceTab<T extends { id: number }, F, R>({ config }: { config: ReferenceConfig<T, F, R> }) {
  const notify = useNotify()
  const { items, error, loading, reload } = useList(config.load)
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<Editor<T>>(null)
  const [form, setForm] = useState<F>(config.emptyForm)
  const [submitted, setSubmitted] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<T | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const all = useMemo(() => items ?? [], [items])
  const rows = useMemo(() => {
    const arranged = config.arrange ? config.arrange(all) : all
    const wanted = query.trim().toLowerCase()
    return wanted && config.search ? arranged.filter((item) => config.search!(item, wanted)) : arranged
  }, [all, config, query])

  function open(editing: T | null) {
    setForm(editing ? config.formOf(editing) : config.emptyForm())
    setSubmitted(false)
    setSaveError(null)
    setEditor({ editing })
  }

  const set = useCallback(<K extends keyof F>(key: K, value: F[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }, [])

  // Rien n'est signale avant le premier essai ; ensuite, les erreurs suivent la saisie.
  const shownErrors = useMemo(
    () => (submitted && editor ? config.validate(form, editor.editing, all) : {}),
    [submitted, editor, config, form, all],
  )

  async function save(): Promise<boolean> {
    if (!editor) return false
    setSubmitted(true)
    if (hasErrors(config.validate(form, editor.editing, all))) return false
    try {
      if (editor.editing) {
        await config.update(editor.editing.id, config.request(form, editor.editing))
      } else {
        await config.create(config.request(form, null))
      }
    } catch (e) {
      setSaveError(errorMessage(e, translations))
      // L'entree a disparu, ou son parent : la liste affichee n'est plus la bonne.
      if (e instanceof ApiError && e.status === 404) void reload()
      return false
    }
    notify(editor.editing ? config.words.updated : config.words.created)
    setEditor(null)
    await reload()
    return true
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await config.remove(deleting.id)
    } catch (e) {
      setDeleteError(errorMessage(e, translations, config.inUse(deleting)))
      if (e instanceof ApiError && e.status === 404) void reload()
      return
    }
    notify(config.words.deleted)
    setDeleting(null)
    await reload()
  }

  const { Fields } = config

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
        {config.search && (
          <TextField
            size="small"
            label="Rechercher"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            sx={{ width: { xs: '100%', sm: 280 } }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchOutlined fontSize="small" /></InputAdornment> } }}
          />
        )}
        <Typography variant="body2" color="text.secondary" role="status" sx={{ flexGrow: 1 }}>
          {items === null ? '' : query.trim() ? `${rows.length} sur ${config.words.count(all.length)}` : config.words.count(all.length)}
        </Typography>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={() => open(null)}>{config.words.add}</Button>
      </Stack>

      <TableFrame
        label={config.words.table}
        head={<>{config.head}<TableCell align="right">Actions</TableCell></>}
        columns={config.columns + 1}
        minWidth={config.minWidth}
        loading={loading}
        error={error ? errorMessage(error, translations) : null}
        onRetry={() => void reload()}
        isEmpty={rows.length === 0}
        empty={query.trim() ? 'Aucun résultat pour cette recherche.' : config.words.empty}
      >
        {rows.map((item) => {
          const name = config.name(item)
          const blocked = config.deleteBlocked?.(item, all) ?? null
          return (
            <TableRow key={item.id} hover>
              {config.cells(item, all)}
              <TableCell align="right" sx={{ whiteSpace: 'nowrap', py: 1 }}>
                <Tooltip title="Modifier">
                  <IconButton aria-label={`Modifier ${name}`} onClick={() => open(item)}><EditOutlined /></IconButton>
                </Tooltip>
                <Tooltip title={blocked ?? 'Supprimer'}>
                  {/* Un bouton desactive ne recoit pas le survol : le span porte l'explication. */}
                  <span>
                    <IconButton
                      aria-label={`Supprimer ${name}`}
                      disabled={blocked !== null}
                      onClick={() => {
                        setDeleteError(null)
                        setDeleting(item)
                      }}
                    >
                      <DeleteOutlined />
                    </IconButton>
                  </span>
                </Tooltip>
              </TableCell>
            </TableRow>
          )
        })}
      </TableFrame>

      <FormDialog
        open={editor !== null}
        title={editor?.editing ? `Modifier « ${config.name(editor.editing)} »` : config.words.createTitle}
        submitLabel={editor?.editing ? 'Enregistrer' : 'Créer'}
        onClose={() => setEditor(null)}
        onSubmit={save}
        error={saveError}
      >
        {editor && <Fields form={form} errors={shownErrors} set={set} editing={editor.editing} items={all} />}
      </FormDialog>

      <ConfirmDialog
        open={deleting !== null}
        title={config.words.deleteTitle}
        confirmLabel="Supprimer"
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
        error={deleteError}
      >
        {deleting && config.deleteText(deleting)}
      </ConfirmDialog>
    </Stack>
  )
}
