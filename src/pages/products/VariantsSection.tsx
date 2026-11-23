import AddOutlined from '@mui/icons-material/AddOutlined'
import AutoAwesomeMotionOutlined from '@mui/icons-material/AutoAwesomeMotionOutlined'
import DeleteOutlined from '@mui/icons-material/DeleteOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import {
  Box, Button, IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography,
} from '@mui/material'
import { useCallback, useState, type ReactNode } from 'react'
import { errorMessage } from '../../api/errors'
import { useApi } from '../../api/useApi'
import { useList } from '../../api/useList'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useNotify } from '../../components/Notifications'
import { StatusBadge } from '../../components/StatusBadge'
import { formatPrice } from '../../lib/format'
import { monoFont } from '../../theme'
import { PATHS, type Attribute } from '../references/api'
import { marginExclTax, unitPriceInclTax, variantPath, type AdminVariant, type ProductDetail } from './api'
import { GenerateVariantsDialog } from './GenerateVariantsDialog'
import { VariantDialog } from './VariantDialog'
import { variantTranslations } from './variantForm'

const mono = { fontFamily: monoFont, whiteSpace: 'nowrap' } as const

type Editor = { kind: 'add' } | { kind: 'edit'; variant: AdminVariant } | { kind: 'generate' } | null

/**
 * The variants of a product (C17): what is actually sold, with its prices,
 * margin and stock. Added one by one or generated from a choice of values;
 * edited without touching the stock; deleted only while the product is a
 * draft, since a variant that has been on sale may be in orders.
 *
 * @param ratePercent the VAT rate chosen in the sheet, so a new rate shows its effect before saving
 * @param onChanged reloads the product: its status panel depends on its variants
 */
export function VariantsSection({ product, ratePercent, onChanged }: {
  product: ProductDetail | null
  ratePercent: number | null
  onChanged: () => Promise<void>
}) {
  const api = useApi()
  const notify = useNotify()
  const attributes = useList(useCallback(() => api<Attribute[]>(PATHS.attributes), [api]))
  const [editor, setEditor] = useState<Editor>(null)
  const [deleting, setDeleting] = useState<AdminVariant | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  if (!product) {
    return (
      <Section>
        <Typography variant="body2" color="text.secondary">Les variantes s’ajoutent une fois le produit créé.</Typography>
      </Section>
    )
  }

  const rate = ratePercent ?? product.vatRate.rate
  const draft = product.status === 'BROUILLON'
  const ready = attributes.items !== null

  async function saved(message: string) {
    setEditor(null)
    notify(message)
    await onChanged()
  }

  async function remove() {
    if (!deleting) return
    try {
      await api<void>(variantPath(deleting.id), { method: 'DELETE' })
    } catch (e) {
      setDeleteError(errorMessage(e, variantTranslations))
      return
    }
    setDeleting(null)
    notify('Variante supprimée.')
    await onChanged()
  }

  return (
    <Section
      actions={(
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <Button variant="outlined" color="secondary" startIcon={<AutoAwesomeMotionOutlined />} disabled={!ready} onClick={() => setEditor({ kind: 'generate' })}>
            Générer les combinaisons
          </Button>
          <Button variant="contained" startIcon={<AddOutlined />} disabled={!ready} onClick={() => setEditor({ kind: 'add' })}>
            Ajouter une variante
          </Button>
        </Stack>
      )}
    >
      {product.variants.length === 0
        ? <Typography variant="body2" color="text.secondary">Aucune variante pour l’instant : sans variante, le produit n’a ni prix ni stock, et ne peut pas être publié.</Typography>
        : (
          <TableContainer>
            <Table size="small" aria-label="Variantes" sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Variante</TableCell>
                  <TableCell align="right">Prix HT</TableCell>
                  <TableCell align="right">TTC</TableCell>
                  <TableCell align="right">Marge HT</TableCell>
                  <TableCell align="right">Stock</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {product.variants.map((variant) => {
                  const values = variant.values.map((value) => value.value).join(', ')
                  const current = variant.discountPriceExclTax ?? variant.salePriceExclTax
                  const name = values || variant.sku
                  return (
                    <TableRow key={variant.id} hover>
                      <TableCell component="th" scope="row">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{values || 'Variante unique'}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: monoFont }}>{variant.sku}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={mono}>
                        {formatPrice(current)}
                        {variant.discountPriceExclTax !== null && (
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'block', textDecoration: 'line-through' }}>
                            {formatPrice(variant.salePriceExclTax)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right" sx={mono}>{formatPrice(unitPriceInclTax(variant, rate))}</TableCell>
                      <TableCell align="right" sx={mono}>{formatPrice(marginExclTax(current, variant.purchasePriceExclTax))}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
                          {variant.stock === 0
                            ? <StatusBadge tone="danger" label="Rupture" />
                            : variant.lowStock && <StatusBadge tone="neutral" label="Stock bas" />}
                          <Box component="span" sx={{ fontFamily: monoFont, fontWeight: variant.lowStock ? 600 : 500 }}>{variant.stock}</Box>
                        </Stack>
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="Modifier">
                          <IconButton aria-label={`Modifier ${name}`} onClick={() => setEditor({ kind: 'edit', variant })}><EditOutlined /></IconButton>
                        </Tooltip>
                        <Tooltip title={draft ? 'Supprimer' : 'Une variante d’un produit déjà publié ne se supprime pas : mettez son stock à 0, ou archivez le produit.'}>
                          {/* Un bouton desactive ne recoit pas le survol : le span porte l'explication. */}
                          <span>
                            <IconButton
                              aria-label={`Supprimer ${name}`}
                              disabled={!draft}
                              onClick={() => {
                                setDeleteError(null)
                                setDeleting(variant)
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
              </TableBody>
            </Table>
          </TableContainer>
        )}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
        TTC : remise, écotaxe et TVA comprises, pour une unité. Marge : prix de vente HT moins prix d’achat HT.
        {!draft && ' Le stock se modifie depuis l’inventaire.'}
      </Typography>

      {editor && editor.kind !== 'generate' && attributes.items && (
        <VariantDialog
          product={product}
          attributes={attributes.items}
          editing={editor.kind === 'edit' ? editor.variant : null}
          ratePercent={rate}
          onClose={() => setEditor(null)}
          onSaved={(message) => void saved(message)}
        />
      )}
      {editor?.kind === 'generate' && attributes.items && (
        <GenerateVariantsDialog
          product={product}
          attributes={attributes.items}
          ratePercent={rate}
          onClose={() => setEditor(null)}
          onCreated={async (message) => {
            if (message) notify(message)
            await onChanged()
          }}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        title="Supprimer la variante ?"
        confirmLabel="Supprimer"
        onConfirm={remove}
        onClose={() => setDeleting(null)}
        error={deleteError}
      >
        La variante <strong>{deleting?.sku}</strong> sera supprimée définitivement.
      </ConfirmDialog>
    </Section>
  )
}

function Section({ actions, children }: { actions?: ReactNode; children: ReactNode }) {
  return (
    <Paper variant="outlined" component="section" aria-label="Variantes" sx={{ p: 2.5 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 2 }}>
        <Typography variant="h6" component="h2">Variantes</Typography>
        {actions}
      </Stack>
      {children}
    </Paper>
  )
}
