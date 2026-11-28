import { InputAdornment, Link, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { errorMessage } from '../../api/errors'
import { json, useApi } from '../../api/useApi'
import { FormDialog } from '../../components/FormDialog'
import { formatPrice, parseDecimal } from '../../lib/format'
import { monoFont } from '../../theme'
import type { Attribute } from '../references/api'
import { marginExclTax, priceInclTax, variantPath, variantsPath, type AdminVariant, type ProductDetail } from './api'
import {
  emptyVariantForm, hasVariantErrors, validateVariant, variantFormOf, variantRequest, variantTranslations, type VariantForm,
} from './variantForm'

const mono = { htmlInput: { inputMode: 'decimal' as const, style: { fontFamily: monoFont, textAlign: 'right' as const } } }

/**
 * Adds a variant to a product, or edits one (C17). One list per attribute,
 * so a variant cannot be « Noir » and « Blanc » at once. The stock is set
 * at creation only: afterwards, it moves through the inventory.
 */
export function VariantDialog({ product, attributes, editing, ratePercent, onClose, onSaved }: {
  product: ProductDetail
  attributes: Attribute[]
  /** null to add a variant. */
  editing: AdminVariant | null
  ratePercent: number
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const api = useApi()
  const [form, setForm] = useState<VariantForm>(() => (editing ? variantFormOf(editing) : emptyVariantForm()))
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const others = product.variants.filter((variant) => variant.id !== editing?.id)
  const errors = submitted ? validateVariant(form, editing, others) : {}
  const set = <K extends keyof VariantForm>(key: K, value: VariantForm[K]) => setForm((current) => ({ ...current, [key]: value }))

  async function save(): Promise<boolean> {
    setSubmitted(true)
    if (hasVariantErrors(validateVariant(form, editing, others))) return false
    try {
      const body = variantRequest(form, editing === null)
      if (editing) {
        await api<AdminVariant>(variantPath(editing.id), json('PUT', body))
      } else {
        await api<AdminVariant>(variantsPath(product.id), json('POST', body))
      }
    } catch (e) {
      setError(errorMessage(e, variantTranslations))
      return false
    }
    onSaved(editing ? 'Variante enregistrée.' : 'Variante ajoutée.')
    return true
  }

  const sale = parseDecimal(form.sale)
  const discount = parseDecimal(form.discount)
  const purchase = parseDecimal(form.purchase)
  const current = discount ?? sale
  const field = (key: Exclude<keyof VariantForm, 'values'>, label: string, help: string, unit = '€') => (
    <TextField
      label={label}
      value={form[key]}
      onChange={(event) => set(key, event.target.value)}
      error={Boolean(errors[key])}
      helperText={errors[key] ?? help}
      sx={{ flex: 1 }}
      slotProps={{ ...mono, input: { endAdornment: <InputAdornment position="end">{unit}</InputAdornment> } }}
    />
  )

  return (
    <FormDialog
      open
      title={editing ? `Modifier ${editing.sku}` : 'Nouvelle variante'}
      submitLabel={editing ? 'Enregistrer' : 'Ajouter'}
      onClose={onClose}
      onSubmit={save}
      error={error}
      maxWidth="md"
    >
      <TextField
        label="SKU"
        required
        autoFocus
        value={form.sku}
        onChange={(event) => set('sku', event.target.value)}
        error={Boolean(errors.sku)}
        helperText={errors.sku ?? 'La référence unique de cette variante, par exemple CLAVIER-K2-NOIR-AZERTY.'}
        slotProps={{ htmlInput: { maxLength: 64, style: { fontFamily: monoFont } } }}
      />

      <Stack spacing={1}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>Valeurs</Typography>
        {attributes.length === 0 && (
          <Typography variant="body2" color="text.secondary">Aucun attribut n’existe encore : cette variante n’aura pas de valeur.</Typography>
        )}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {attributes.map((attribute) => (
            <TextField
              key={attribute.id}
              select
              label={attribute.name}
              value={form.values[attribute.id] ?? ''}
              onChange={(event) => set('values', { ...form.values, [attribute.id]: event.target.value })}
              sx={{ minWidth: 180 }}
              slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
            >
              <MenuItem value=""><em>Aucune</em></MenuItem>
              {attribute.values.map((value) => <MenuItem key={value.id} value={String(value.id)}>{value.value}</MenuItem>)}
            </TextField>
          ))}
        </Stack>
        <Typography variant="body2" color={errors.values ? 'error' : 'text.secondary'}>
          {errors.values ?? (
            <>Il manque une valeur ? <Link href="/references?onglet=attributs" target="_blank" rel="noopener">Gérer les attributs</Link> (s’ouvre dans un nouvel onglet).</>
          )}
        </Typography>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        {field('purchase', 'Prix d’achat HT', 'Ce que la boutique paie au fournisseur.')}
        {field('sale', 'Prix de vente HT', 'Le prix normal.')}
        {field('discount', 'Prix remisé HT', 'Facultatif : en promotion.')}
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        {field('ecoTax', 'Écotaxe HT', 'Facultatif : taxe DEEE ajoutée au prix.')}
        {field('weight', 'Poids', 'Pour les frais de port.', 'kg')}
      </Stack>
      {current !== null && (
        <Typography variant="body2" color="text.secondary" role="status">
          Le client paiera <strong>{formatPrice(priceInclTax(current, parseDecimal(form.ecoTax), ratePercent))}</strong> TTC
          {purchase !== null && <> · marge {formatPrice(marginExclTax(current, purchase))} HT par unité</>}.
        </Typography>
      )}

      {editing
        ? (
          <Typography variant="body2" color="text.secondary">
            Stock : <strong>{editing.stock}</strong>, seuil d’alerte : {editing.alertThreshold}. Ils se modifient depuis{' '}
            <Link href={`/inventory?q=${encodeURIComponent(editing.sku)}`} target="_blank" rel="noopener">l’inventaire</Link>
            {' '}(nouvel onglet), pour ne jamais effacer une vente faite pendant que ce formulaire est ouvert.
          </Typography>
        )
        : (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            {field('initialStock', 'Stock de départ', 'Les unités disponibles à la création.', 'u.')}
            {field('alertThreshold', 'Seuil d’alerte', 'À ce stock ou en dessous, l’inventaire la signale.', 'u.')}
          </Stack>
        )}
    </FormDialog>
  )
}
