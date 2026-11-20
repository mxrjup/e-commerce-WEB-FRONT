import { FormControlLabel, FormHelperText, InputAdornment, Stack, Switch, TableCell, TextField } from '@mui/material'
import { useMemo } from 'react'
import { useApi } from '../../api/useApi'
import { StatusBadge } from '../../components/StatusBadge'
import { decimalPlaces, formatPercent, parseDecimal } from '../../lib/format'
import { check, maxLength, required } from '../../lib/validation'
import { monoFont } from '../../theme'
import { PATHS, resource, type VatRate, type VatRateRequest } from './api'
import { MonoCell, NameCell } from './cells'
import { ReferenceTab, type FieldsProps, type ReferenceConfig } from './ReferenceTab'

type VatRateForm = { label: string; rate: string; defaultRate: boolean }

function rateError(text: string): string | null {
  if (!text.trim()) return 'Ce champ est obligatoire.'
  const rate = parseDecimal(text)
  if (rate === null) return 'Un nombre, par exemple 20 ou 5,5.'
  if (rate > 100) return 'Entre 0 et 100 %.'
  if (decimalPlaces(text) > 2) return 'Deux décimales au maximum.'
  return null
}

/**
 * The default rate (the one a new product gets) can only move, never
 * disappear: the API refuses to unmark it, so the switch is locked on it,
 * and saying so is better than a refusal after the click.
 */
function VatRateFields({ form, errors, set, editing, items }: FieldsProps<VatRate, VatRateForm>) {
  const isCurrentDefault = editing?.defaultRate ?? false
  const firstRate = !editing && items.length === 0
  const current = items.find((rate) => rate.defaultRate && rate.id !== editing?.id)
  const help = isCurrentDefault
    ? 'C’est le taux par défaut. Pour en changer, marquez un autre taux comme taux par défaut.'
    : firstRate
      ? 'Le premier taux créé devient le taux par défaut.'
      : form.defaultRate && current
        ? `Il remplacera « ${current.label} » comme taux par défaut.`
        : 'Le taux proposé pour un nouveau produit.'

  return (
    <>
      <TextField
        label="Libellé"
        value={form.label}
        onChange={(event) => set('label', event.target.value)}
        error={Boolean(errors.label)}
        helperText={errors.label ?? 'Par exemple « Taux normal » ou « Taux réduit ».'}
        required
        autoFocus
        slotProps={{ htmlInput: { maxLength: 50 } }}
      />
      <TextField
        label="Taux"
        value={form.rate}
        onChange={(event) => set('rate', event.target.value)}
        error={Boolean(errors.rate)}
        helperText={errors.rate ?? 'En pourcentage, deux décimales au maximum.'}
        required
        sx={{ maxWidth: 240 }}
        slotProps={{
          htmlInput: { inputMode: 'decimal', style: { fontFamily: monoFont, textAlign: 'right' } },
          input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
        }}
      />
      <Stack>
        <FormControlLabel
          control={(
            <Switch
              checked={form.defaultRate || isCurrentDefault || firstRate}
              disabled={isCurrentDefault || firstRate}
              onChange={(event) => set('defaultRate', event.target.checked)}
            />
          )}
          label="Taux par défaut"
        />
        <FormHelperText sx={{ mt: 0 }}>{help}</FormHelperText>
      </Stack>
    </>
  )
}

export function VatRatesTab() {
  const api = useApi()
  const config = useMemo<ReferenceConfig<VatRate, VatRateForm, VatRateRequest>>(() => {
    const vatRates = resource<VatRate, VatRateRequest>(api, PATHS.vatRates)
    return {
      words: {
        table: 'Taux de TVA',
        count: (n) => `${n} taux`,
        empty: 'Aucun taux pour l’instant : créez au moins le taux normal avant d’ajouter des produits.',
        add: 'Ajouter un taux',
        createTitle: 'Nouveau taux de TVA',
        created: 'Taux créé.',
        updated: 'Taux enregistré.',
        deleted: 'Taux supprimé.',
        deleteTitle: 'Supprimer le taux ?',
      },
      load: vatRates.list,
      create: vatRates.create,
      update: vatRates.update,
      remove: vatRates.remove,
      name: (rate) => rate.label,
      head: (
        <>
          <TableCell>Libellé</TableCell>
          <TableCell align="right">Taux</TableCell>
          <TableCell>Statut</TableCell>
        </>
      ),
      columns: 3,
      minWidth: 560,
      cells: (rate) => (
        <>
          <NameCell>{rate.label}</NameCell>
          <MonoCell align="right">{formatPercent(rate.rate)}</MonoCell>
          <TableCell>{rate.defaultRate && <StatusBadge tone="neutral" label="Par défaut" />}</TableCell>
        </>
      ),
      emptyForm: () => ({ label: '', rate: '', defaultRate: false }),
      formOf: (rate) => ({ label: rate.label, rate: String(rate.rate).replace('.', ','), defaultRate: rate.defaultRate }),
      validate: (form, editing, items) => {
        const label = form.label.trim().toLowerCase()
        const taken = items.some((rate) => rate.id !== editing?.id && rate.label.toLowerCase() === label)
        return {
          label: check(form.label, required, maxLength(50)) ?? (taken ? 'Ce libellé est déjà pris.' : undefined),
          rate: rateError(form.rate) ?? undefined,
        }
      },
      request: (form, editing) => ({
        label: form.label.trim(),
        rate: parseDecimal(form.rate) ?? 0,
        // Le taux par defaut le reste : l'API refuse de le retirer.
        defaultRate: form.defaultRate || (editing?.defaultRate ?? false),
      }),
      Fields: VatRateFields,
      deleteBlocked: (rate) => (rate.defaultRate ? 'Le taux par défaut ne se supprime pas : marquez d’abord un autre taux par défaut.' : null),
      deleteText: (rate) => <>Le taux <strong>{rate.label}</strong> ({formatPercent(rate.rate)}) sera supprimé définitivement.</>,
      inUse: (rate) => `« ${rate.label} » est encore le taux de produits du catalogue : changez leur taux avant de le supprimer.`,
    }
  }, [api])

  return <ReferenceTab config={config} />
}
