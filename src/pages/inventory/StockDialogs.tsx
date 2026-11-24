import { Box, InputAdornment, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { useState } from 'react'
import { errorMessage } from '../../api/errors'
import { json, useApi } from '../../api/useApi'
import { FormDialog } from '../../components/FormDialog'
import { monoFont } from '../../theme'
import { adjustmentPath, MAX_UNITS, thresholdPath, translations, type InventoryItem } from './api'

const units = (count: number) => (count > 1 ? `${count} unités` : `${count} unité`)
const mono = { htmlInput: { inputMode: 'numeric' as const, style: { fontFamily: monoFont, textAlign: 'right' as const } } }

/** A whole number from 0 (or from 1) to the service's limit, or an error to show under the field. */
function count(text: string, min: number): { value: number; error: null } | { value: null; error: string } {
  if (!/^\d{1,7}$/.test(text.trim())) return { value: null, error: min === 0 ? 'Un nombre entier, 0 ou plus.' : 'Un nombre entier, 1 ou plus.' }
  const value = Number(text.trim())
  if (value < min) return { value: null, error: 'Un nombre entier, 1 ou plus.' }
  if (value > MAX_UNITS) return { value: null, error: `${MAX_UNITS.toLocaleString('fr-FR')} au maximum.` }
  return { value, error: null }
}

/**
 * A manual correction of the stock (C20): units received, or units broken or
 * lost. What is sent is the difference, so a sale made meanwhile is kept;
 * taking out more than the stock is refused here, and by the service if the
 * stock went down in the meantime.
 *
 * @param onFailed reloads the list: after a refusal, the stock shown is probably out of date
 */
export function AdjustStockDialog({ item, onClose, onDone, onFailed }: {
  item: InventoryItem
  onClose: () => void
  onDone: (message: string) => void
  onFailed: () => void
}) {
  const api = useApi()
  const [direction, setDirection] = useState<'in' | 'out'>('in')
  const [quantity, setQuantity] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsed = count(quantity, 1)
  const tooMany = direction === 'out' && parsed.value !== null && parsed.value > item.stock
  const fieldError = submitted ? (parsed.error ?? (tooMany ? `Il n’y a que ${units(item.stock)} en stock.` : null)) : null
  const next = parsed.value === null ? null : item.stock + (direction === 'in' ? parsed.value : -parsed.value)

  async function save(): Promise<boolean> {
    setSubmitted(true)
    if (parsed.value === null || tooMany) return false
    const delta = direction === 'in' ? parsed.value : -parsed.value
    try {
      const updated = await api<InventoryItem>(adjustmentPath(item.variantId), json('POST', { delta }))
      onDone(`Stock de ${item.sku} : ${units(updated.stock)}.`)
      return true
    } catch (e) {
      setError(errorMessage(e, translations))
      onFailed()
      return false
    }
  }

  return (
    <FormDialog open title={`Ajuster le stock de ${item.sku}`} submitLabel="Enregistrer" onClose={onClose} onSubmit={save} error={error} maxWidth="xs">
      <Typography variant="body2" color="text.secondary">{item.designation}</Typography>
      <ToggleButtonGroup
        exclusive
        fullWidth
        color="primary"
        value={direction}
        onChange={(_, value: 'in' | 'out' | null) => value && setDirection(value)}
        aria-label="Sens du mouvement"
      >
        <ToggleButton value="in">Entrée (livraison reçue)</ToggleButton>
        <ToggleButton value="out">Sortie (casse, perte)</ToggleButton>
      </ToggleButtonGroup>
      <TextField
        label="Quantité"
        required
        autoFocus
        value={quantity}
        onChange={(event) => setQuantity(event.target.value)}
        error={Boolean(fieldError)}
        helperText={fieldError ?? 'En unités.'}
        slotProps={{ ...mono, input: { endAdornment: <InputAdornment position="end">u.</InputAdornment> } }}
      />
      <Typography variant="body2" role="status">
        Stock :{' '}
        <Box component="strong" sx={{ fontFamily: monoFont }}>{item.stock}{next !== null && next >= 0 && ` → ${next}`}</Box>
        {next !== null && next >= 0 && next <= item.alertThreshold && <>{' '}(à ou sous le seuil de {item.alertThreshold})</>}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Seul l’écart est envoyé : une commande payée pendant que cette fenêtre est ouverte garde sa vente.
      </Typography>
    </FormDialog>
  )
}

/** The stock level at or below which a variant shows in the alerts (C20). */
export function ThresholdDialog({ item, onClose, onDone }: {
  item: InventoryItem
  onClose: () => void
  onDone: (message: string) => void
}) {
  const api = useApi()
  const [threshold, setThreshold] = useState(String(item.alertThreshold))
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const parsed = count(threshold, 0)
  const fieldError = submitted ? parsed.error : null

  async function save(): Promise<boolean> {
    setSubmitted(true)
    if (parsed.value === null) return false
    try {
      await api<InventoryItem>(thresholdPath(item.variantId), json('PUT', { alertThreshold: parsed.value }))
      onDone(`Seuil d’alerte de ${item.sku} : ${parsed.value}.`)
      return true
    } catch (e) {
      setError(errorMessage(e, translations))
      return false
    }
  }

  return (
    <FormDialog open title={`Seuil d’alerte de ${item.sku}`} submitLabel="Enregistrer" onClose={onClose} onSubmit={save} error={error} maxWidth="xs">
      <Typography variant="body2" color="text.secondary">{item.designation}</Typography>
      <TextField
        label="Seuil d’alerte"
        required
        autoFocus
        value={threshold}
        onChange={(event) => setThreshold(event.target.value)}
        error={Boolean(fieldError)}
        helperText={fieldError ?? 'À ce stock ou en dessous, la variante est signalée. 0 pour ne l’être qu’en rupture.'}
        slotProps={{ ...mono, input: { endAdornment: <InputAdornment position="end">u.</InputAdornment> } }}
      />
      {parsed.value !== null && (
        <Typography variant="body2" role="status">
          Avec {units(item.stock)} en stock, elle {item.stock <= parsed.value ? 'sera' : 'ne sera pas'} en alerte.
        </Typography>
      )}
    </FormDialog>
  )
}
