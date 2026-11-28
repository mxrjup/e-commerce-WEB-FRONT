import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined'
import {
  Alert, Box, Button, Divider, Paper, Skeleton, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, Typography,
} from '@mui/material'
import { useCallback, useMemo } from 'react'
import { Link as RouterLink, useParams } from 'react-router'
import { errorMessage } from '../../api/errors'
import { useApi } from '../../api/useApi'
import { useLoad } from '../../api/useLoad'
import { PageHeader } from '../../components/PageHeader'
import { StatusBadge } from '../../components/StatusBadge'
import { formatDateTime, formatPercent, formatPrice } from '../../lib/format'
import { monoFont } from '../../theme'
import { deliveryModeLabel, orderStatusPresentation, ordersApi, type AdminOrder } from './api'

export function OrderDetailPage() {
  const api = useApi()
  const { id } = useParams<{ id: string }>()
  const numericId = Number(id)
  const validId = Number.isInteger(numericId) && numericId > 0
  const client = useMemo(() => ordersApi(api), [api])

  const load = useCallback(async (): Promise<AdminOrder | null> => {
    if (!validId) return null
    return client.get(numericId)
  }, [client, numericId, validId])

  const { data: order, error, loading, reload } = useLoad(load)

  if (!validId) {
    return (
      <>
        <PageHeader title="Commande introuvable" action={<Button component={RouterLink} to="/orders" variant="outlined" startIcon={<ArrowBackOutlined />}>Retour aux commandes</Button>} />
        <Alert severity="warning">L’identifiant demandé n’est pas valide.</Alert>
      </>
    )
  }

  const presentation = order ? orderStatusPresentation(order.status) : null

  return (
    <>
      <Box sx={{ mb: 1.5 }}>
        <Button component={RouterLink} to="/orders" size="small" color="secondary" startIcon={<ArrowBackOutlined />}>
          Commandes
        </Button>
      </Box>

      <PageHeader
        title={order ? order.orderNumber : `Commande #${numericId}`}
        description={order ? `Créée le ${formatDateTime(order.createdAt)}` : 'Chargement du détail de commande…'}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} action={<Button color="inherit" size="small" onClick={() => void reload()}>Réessayer</Button>}>
          {errorMessage(error)}
        </Alert>
      )}

      {loading && !order ? (
        <Stack spacing={2}><Skeleton height={48} /><Skeleton height={220} /><Skeleton height={220} /></Stack>
      ) : order ? (
        <>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
            <Paper variant="outlined" sx={{ p: 2.5, flex: 1 }}>
              <Typography variant="overline" color="text.secondary">Traitement</Typography>
              <Stack spacing={1.25} sx={{ mt: 1.25 }}>
                <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography variant="body2" color="text.secondary">Statut</Typography>
                  {presentation && <StatusBadge tone={presentation.tone} label={presentation.label} />}
                </Stack>
                <Divider />
                <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <Typography variant="body2" color="text.secondary">Mode de livraison</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{deliveryModeLabel(order.deliveryMode)}</Typography>
                </Stack>
                <Divider />
                <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <Typography variant="body2" color="text.secondary">Adresse de livraison</Typography>
                  <Typography variant="body2" sx={{ fontFamily: monoFont }}>#{order.shippingAddressId ?? '—'}</Typography>
                </Stack>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2.5, flex: 1 }}>
              <Typography variant="overline" color="text.secondary">Paiement</Typography>
              <Stack spacing={1.25} sx={{ mt: 1.25 }}>
                <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <Typography variant="body2" color="text.secondary">Total HT</Typography>
                  <Typography variant="body2" sx={{ fontFamily: monoFont, fontWeight: 600 }}>{formatPrice(order.totalExclTax)}</Typography>
                </Stack>
                <Divider />
                <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <Typography variant="body2" color="text.secondary">Total TTC</Typography>
                  <Typography variant="h6" sx={{ fontFamily: monoFont, fontWeight: 800 }}>{formatPrice(order.totalInclTax)}</Typography>
                </Stack>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2.5, flex: 1 }}>
              <Typography variant="overline" color="text.secondary">Client</Typography>
              <Typography variant="h6" sx={{ fontFamily: monoFont, mt: 1 }}>#{order.userId}</Typography>
            </Paper>
          </Stack>

          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            <Box sx={{ p: 2.5, pb: 1.5 }}>
              <Typography variant="h6">Articles</Typography>
              <Typography variant="body2" color="text.secondary">{order.items.length} ligne{order.items.length > 1 ? 's' : ''}</Typography>
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <Table aria-label={`Articles de la commande ${order.orderNumber}`} sx={{ minWidth: 760 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Article</TableCell>
                    <TableCell>Variante</TableCell>
                    <TableCell align="right">Prix HT</TableCell>
                    <TableCell align="right">TVA</TableCell>
                    <TableCell align="right">Quantité</TableCell>
                    <TableCell align="right">Sous-total TTC</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell sx={{ fontWeight: 600 }}>{item.designation}</TableCell>
                      <TableCell sx={{ fontFamily: monoFont }}>#{item.variantId}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: monoFont }}>{formatPrice(item.unitPriceExclTax)}</TableCell>
                      <TableCell align="right">{formatPercent(item.vatRate)}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: monoFont }}>{item.quantity}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: monoFont, fontWeight: 700 }}>{formatPrice(item.subTotalInclTax)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        </>
      ) : null}
    </>
  )
}
