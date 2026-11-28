import { Alert, Chip, InputAdornment, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { errorMessage } from '../../api/errors'
import { json, useApi } from '../../api/useApi'
import { FormDialog } from '../../components/FormDialog'
import { formatPrice, parseDecimal } from '../../lib/format'
import { monoFont } from '../../theme'
import type { Attribute } from '../references/api'
import { priceInclTax, variantsPath, type AdminVariant, type ProductDetail } from './api'
import {
  emptyVariantForm, hasVariantErrors, missingCombinations, suggestedSku, validateVariant, variantRequest,
  variantTranslations, type Choice, type VariantForm,
} from './variantForm'

/** Past this, a mistake in the choice would create a long list of variants to delete by hand. */
const MAX_GENERATED = 50

const comboKey = (values: Attribute['values']) => values.map((value) => value.id).sort((a, b) => a - b).join('-')

/**
 * Creates the missing variants of a product from a choice of values (C17):
 * Noir and Blanc by AZERTY and QWERTY give four, minus the ones the product
 * already has. They share one price, weight and starting stock, and each
 * can be edited afterwards. The service has no bulk endpoint: they are
 * created one by one, and the ones it refuses stay listed with the reason.
 */
export function GenerateVariantsDialog({ product, attributes, ratePercent, onClose, onCreated }: {
  product: ProductDetail
  attributes: Attribute[]
  ratePercent: number
  onClose: () => void
  /** After each run, so the sheet shows the new variants; `message` sums it up. */
  onCreated: (message: string) => Promise<void>
}) {
  const api = useApi()
  const [chosen, setChosen] = useState<Record<number, number[]>>({})
  const [common, setCommon] = useState<VariantForm>(emptyVariantForm)
  const [skus, setSkus] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const choices: Choice[] = attributes.map((attribute) => ({
    attribute,
    values: attribute.values.filter((value) => (chosen[attribute.id] ?? []).includes(value.id)),
  }))
  const combos = missingCombinations(choices, product.variants)
  const skuOf = (values: Attribute['values']) => skus[comboKey(values)] ?? suggestedSku(product.slug, values)

  const toggle = (attributeId: number, valueId: number) => setChosen((current) => {
    const values = current[attributeId] ?? []
    return { ...current, [attributeId]: values.includes(valueId) ? values.filter((id) => id !== valueId) : [...values, valueId] }
  })
  const setField = (key: keyof VariantForm, value: string) => setCommon((current) => ({ ...current, [key]: value }))

  // Les champs communs se verifient comme une variante, avec un SKU quelconque : chaque SKU se verifie a part.
  const commonErrors = submitted ? validateVariant({ ...common, sku: 'X' }, null, []) : {}
  /** Empty, too long, or already taken in this product, including by another line of the list. */
  function skuProblems(): Map<string, string> {
    const problems = new Map<string, string>()
    const seen = new Set(product.variants.map((variant) => variant.sku))
    for (const combo of combos) {
      const sku = skuOf(combo).trim()
      if (!sku) problems.set(comboKey(combo), 'Ce champ est obligatoire.')
      else if (sku.length > 64) problems.set(comboKey(combo), '64 caractères au maximum.')
      else if (seen.has(sku)) problems.set(comboKey(combo), 'Ce SKU est déjà pris dans ce produit.')
      seen.add(sku)
    }
    return problems
  }
  const skuErrors = submitted ? skuProblems() : new Map<string, string>()

  async function generate(): Promise<boolean> {
    setSubmitted(true)
    setError(null)
    if (combos.length === 0 || combos.length > MAX_GENERATED) return false
    const fieldErrors = validateVariant({ ...common, sku: 'X' }, null, [])
    if (hasVariantErrors(fieldErrors) || skuProblems().size > 0) return false

    const refused: string[] = []
    let created = 0
    for (const combo of combos) {
      const sku = skuOf(combo).trim()
      try {
        await api<AdminVariant>(variantsPath(product.id), json('POST', {
          ...variantRequest({ ...common, sku }, true),
          valueIds: combo.map((value) => value.id),
        }))
        created++
      } catch (e) {
        refused.push(`${sku} : ${errorMessage(e, variantTranslations)}`)
      }
    }
    const summary = created > 1 ? `${created} variantes créées.` : created === 1 ? '1 variante créée.' : ''
    await onCreated(summary)
    if (refused.length > 0) {
      setError(`${summary ? `${summary} ` : ''}Refusées : ${refused.join(' ; ')}`)
      return false
    }
    onClose()
    return true
  }

  const sale = parseDecimal(common.sale)
  const current = parseDecimal(common.discount) ?? sale
  const field = (key: keyof Omit<VariantForm, 'values' | 'sku'>, label: string, help: string, unit = '€') => (
    <TextField
      label={label}
      value={common[key]}
      onChange={(event) => setField(key, event.target.value)}
      error={Boolean(commonErrors[key])}
      helperText={commonErrors[key] ?? help}
      sx={{ flex: 1 }}
      slotProps={{
        htmlInput: { inputMode: 'decimal', style: { fontFamily: monoFont, textAlign: 'right' } },
        input: { endAdornment: <InputAdornment position="end">{unit}</InputAdornment> },
      }}
    />
  )

  return (
    <FormDialog
      open
      title="Générer les combinaisons"
      submitLabel={combos.length > 1 ? `Créer ${combos.length} variantes` : 'Créer la variante'}
      onClose={onClose}
      onSubmit={generate}
      error={error}
      maxWidth="md"
    >
      <Stack spacing={1.5}>
        <Typography variant="body2" color="text.secondary">
          Choisissez les valeurs à combiner : une variante sera préparée pour chaque combinaison que ce produit n’a pas encore.
        </Typography>
        {attributes.length === 0 && <Alert severity="info">Aucun attribut n’existe encore : créez-en un dans Référentiels › Attributs.</Alert>}
        {attributes.map((attribute) => (
          <Stack key={attribute.id} spacing={0.5}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{attribute.name}</Typography>
            <Stack direction="row" spacing={1} useFlexGap role="group" aria-label={attribute.name} sx={{ flexWrap: 'wrap' }}>
              {attribute.values.map((value) => {
                const selected = (chosen[attribute.id] ?? []).includes(value.id)
                return (
                  <Chip
                    key={value.id}
                    clickable
                    label={value.value}
                    aria-pressed={selected}
                    color={selected ? 'primary' : 'default'}
                    variant={selected ? 'filled' : 'outlined'}
                    onClick={() => toggle(attribute.id, value.id)}
                  />
                )
              })}
            </Stack>
          </Stack>
        ))}
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        {field('purchase', 'Prix d’achat HT', 'Le même pour toutes.')}
        {field('sale', 'Prix de vente HT', current !== null ? `${formatPrice(priceInclTax(current, parseDecimal(common.ecoTax), ratePercent))} TTC` : 'Le même pour toutes.')}
        {field('discount', 'Prix remisé HT', 'Facultatif.')}
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        {field('ecoTax', 'Écotaxe HT', 'Facultatif.')}
        {field('weight', 'Poids', 'Pour les frais de port.', 'kg')}
        {field('initialStock', 'Stock de départ', 'Pour chacune.', 'u.')}
        {field('alertThreshold', 'Seuil d’alerte', 'Pour chacune.', 'u.')}
      </Stack>

      {combos.length > MAX_GENERATED && (
        <Alert severity="warning">{combos.length} combinaisons : c’est plus de {MAX_GENERATED}. Choisissez moins de valeurs, quitte à générer en plusieurs fois.</Alert>
      )}
      {submitted && combos.length === 0 && <Alert severity="info">Aucune combinaison à créer : choisissez des valeurs, ou ce produit les a déjà toutes.</Alert>}
      {combos.length > 0 && combos.length <= MAX_GENERATED && (
        <Table size="small" aria-label="Variantes à créer">
          <TableHead>
            <TableRow>
              <TableCell>Valeurs</TableCell>
              <TableCell>SKU</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {combos.map((combo) => {
              const key = comboKey(combo)
              const label = combo.map((value) => value.value).join(', ')
              return (
                <TableRow key={key}>
                  <TableCell component="th" scope="row">{label}</TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      fullWidth
                      value={skuOf(combo)}
                      onChange={(event) => setSkus((current) => ({ ...current, [key]: event.target.value }))}
                      error={skuErrors.has(key)}
                      helperText={skuErrors.get(key)}
                      slotProps={{ htmlInput: { 'aria-label': `SKU de ${label}`, maxLength: 64, style: { fontFamily: monoFont } } }}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </FormDialog>
  )
}
