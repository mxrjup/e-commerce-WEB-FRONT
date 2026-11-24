import { Alert, Button, Paper, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { StatusBadge } from '../../components/StatusBadge'
import { statusLabel, type ProductDetail, type ProductStatus } from './api'

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Paper variant="outlined" component="section" aria-label={title} sx={{ p: 2.5 }}>
      <Typography variant="h6" component="h2" sx={{ mb: 2 }}>{title}</Typography>
      {children}
    </Paper>
  )
}

const STATUS_HELP: Record<ProductStatus, string> = {
  BROUILLON: 'Invisible dans la boutique. Un brouillon n’a jamais été en vente : il peut encore être supprimé.',
  PUBLIE: 'Visible dans la boutique et en vente.',
  ARCHIVE: 'Retiré de la boutique, mais gardé pour les commandes et le SAV qui le citent.',
}

/**
 * The publication workflow of C04: a draft is published once it has a
 * variant, then goes between published and archived, never back to draft.
 * Only a draft can be deleted. The buttons wait for the sheet to be saved,
 * so that publishing never shows a half-edited product.
 */
export function StatusPanel({ product, dirty, busy, onStatus, onDelete }: {
  /** null while creating: the product will be a draft. */
  product: ProductDetail | null
  dirty: boolean
  busy: boolean
  onStatus: (status: ProductStatus) => void
  onDelete: () => void
}) {
  if (!product) {
    return (
      <Panel title="Statut">
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
          <StatusBadge tone="neutral" label="Brouillon" />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Le produit sera créé en brouillon. Vous pourrez le publier une fois sa première variante ajoutée.
        </Typography>
      </Panel>
    )
  }

  const noVariant = product.variants.length === 0
  return (
    <Panel title="Statut">
      <Stack spacing={1.5}>
        <div><StatusBadge tone={product.status === 'PUBLIE' ? 'ok' : 'neutral'} label={statusLabel(product.status)} /></div>
        <Typography variant="body2" color="text.secondary">{STATUS_HELP[product.status]}</Typography>
        {dirty && <Alert severity="info">Enregistrez d’abord vos modifications pour changer le statut.</Alert>}
        {product.status !== 'PUBLIE' && noVariant && (
          <Typography variant="body2" color="text.secondary">
            Pas encore publiable : ce produit n’a aucune variante, donc ni prix ni stock.
          </Typography>
        )}
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {product.status === 'PUBLIE' && (
            <Button variant="outlined" color="secondary" disabled={dirty || busy} onClick={() => onStatus('ARCHIVE')}>Archiver</Button>
          )}
          {product.status !== 'PUBLIE' && (
            <Button variant="contained" disabled={dirty || busy || noVariant} onClick={() => onStatus('PUBLIE')}>
              {product.status === 'ARCHIVE' ? 'Republier' : 'Publier'}
            </Button>
          )}
          {product.status === 'BROUILLON' && (
            <Button variant="outlined" color="error" disabled={busy} onClick={onDelete}>Supprimer le brouillon</Button>
          )}
        </Stack>
      </Stack>
    </Panel>
  )
}
