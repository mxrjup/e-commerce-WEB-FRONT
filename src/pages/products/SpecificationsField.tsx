import AddOutlined from '@mui/icons-material/AddOutlined'
import ArrowDownwardOutlined from '@mui/icons-material/ArrowDownwardOutlined'
import ArrowUpwardOutlined from '@mui/icons-material/ArrowUpwardOutlined'
import DeleteOutlined from '@mui/icons-material/DeleteOutlined'
import { Alert, Autocomplete, Button, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material'
import { useCallback } from 'react'
import { useApi } from '../../api/useApi'
import { useLoad } from '../../api/useLoad'
import { SPECIFICATION_KEYS } from './api'
import { LIMITS, specRow, type ProductErrors, type SpecRow } from './productForm'

/**
 * The characteristics of a product (« Garantie : 2 ans »), in display order.
 * The key suggests what the other products of the category already use, so
 * that every keyboard says « Connectique » and not « Connexion » once and
 * « Connectivité » elsewhere: the storefront filters on these keys (C03).
 */
export function SpecificationsField({ rows, onChange, categoryId, errors }: {
  rows: SpecRow[]
  onChange: (rows: SpecRow[]) => void
  /** '' while no category is chosen: no suggestion then. */
  categoryId: string
  errors: Pick<ProductErrors, 'rows' | 'specifications'>
}) {
  const api = useApi()
  const loadKeys = useCallback(
    () => (categoryId ? api<string[]>(`${SPECIFICATION_KEYS}?categoryId=${categoryId}`) : Promise.resolve([])),
    [api, categoryId],
  )
  const { data: keys } = useLoad(loadKeys)
  const used = new Set(rows.map((row) => row.key.trim().toLowerCase()))
  const suggestions = (keys ?? []).filter((key) => !used.has(key.toLowerCase()))

  const update = (id: number, patch: Partial<SpecRow>) => onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  const move = (index: number, by: number) => {
    const next = [...rows]
    ;[next[index], next[index + by]] = [next[index + by], next[index]]
    onChange(next)
  }

  return (
    <Stack spacing={1.5}>
      <Stack spacing={0.5}>
        <Typography variant="h6" component="h2">Caractéristiques</Typography>
        <Typography variant="body2" color="text.secondary">
          Communes à toutes les variantes, dans l’ordre d’affichage.
          {categoryId ? ' Les clés proposées sont celles des autres produits de la catégorie.' : ' Choisissez une catégorie pour voir les clés déjà utilisées.'}
        </Typography>
      </Stack>
      {errors.specifications && <Alert severity="error">{errors.specifications}</Alert>}
      {rows.length === 0 && <Typography variant="body2" color="text.secondary">Aucune caractéristique pour l’instant.</Typography>}
      {rows.map((row, index) => {
        const rowErrors = errors.rows?.[row.id]
        return (
          <Stack key={row.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'flex-start' } }}>
            <Autocomplete
              freeSolo
              options={suggestions}
              inputValue={row.key}
              onInputChange={(_, key) => update(row.id, { key })}
              sx={{ flex: 2 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label={`Clé ${index + 1}`}
                  error={Boolean(rowErrors?.key)}
                  helperText={rowErrors?.key}
                  slotProps={{ ...params.slotProps, htmlInput: { ...params.slotProps.htmlInput, maxLength: LIMITS.key } }}
                />
              )}
            />
            <TextField
              size="small"
              label={`Valeur ${index + 1}`}
              value={row.value}
              onChange={(event) => update(row.id, { value: event.target.value })}
              error={Boolean(rowErrors?.value)}
              helperText={rowErrors?.value}
              sx={{ flex: 3 }}
              slotProps={{ htmlInput: { maxLength: LIMITS.value } }}
            />
            <Stack direction="row" sx={{ flexShrink: 0 }}>
              <Tooltip title="Monter">
                <span>
                  <IconButton aria-label={`Monter la caractéristique ${index + 1}`} disabled={index === 0} onClick={() => move(index, -1)}>
                    <ArrowUpwardOutlined fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Descendre">
                <span>
                  <IconButton aria-label={`Descendre la caractéristique ${index + 1}`} disabled={index === rows.length - 1} onClick={() => move(index, 1)}>
                    <ArrowDownwardOutlined fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Retirer">
                <IconButton aria-label={`Retirer la caractéristique ${index + 1}`} onClick={() => onChange(rows.filter((other) => other.id !== row.id))}>
                  <DeleteOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        )
      })}
      <div>
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<AddOutlined />}
          disabled={rows.length >= LIMITS.specifications}
          onClick={() => onChange([...rows, specRow()])}
        >
          Ajouter une caractéristique
        </Button>
      </div>
    </Stack>
  )
}
