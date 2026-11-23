import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined'
import KeyboardArrowDownOutlined from '@mui/icons-material/KeyboardArrowDownOutlined'
import KeyboardArrowUpOutlined from '@mui/icons-material/KeyboardArrowUpOutlined'
import {
  Alert, Box, Button, Divider, IconButton, Paper, Skeleton, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, Typography,
} from '@mui/material'
import { Fragment, useCallback, useMemo, useState } from 'react'
import { Link as RouterLink, useLocation, useParams } from 'react-router'
import { errorMessage } from '../../api/errors'
import { useApi } from '../../api/useApi'
import { useLoad } from '../../api/useLoad'
import { PageHeader } from '../../components/PageHeader'
import { StatusBadge } from '../../components/StatusBadge'
import { TableFrame } from '../../components/TableFrame'
import { formatDateTime, formatPercent, formatPrice } from '../../lib/format'
import { monoFont, tokens } from '../../theme'
import {
  customerDisplayName, customersApi, deliveryModeLabel, findCustomerById,
  orderStatusPresentation, sortOrdersNewestFirst, summarizeCustomerOrders,
  type Customer, type CustomerOrder,
} from './api'

type LocationState = { customer?: Customer } | null

type LoadedCustomerDetail = {
  customer: Customer | null
  orders: CustomerOrder[]
}

/**
 * U09 (part 2): customer sheet with contact details, total spent (excluding
 * cancelled orders) and full order history from GET /api/admin/orders?userId={id}.
 */
export function CustomerDetailPage() {
  const api = useApi()
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const client = useMemo(() => customersApi(api), [api])
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null)

  const numericId = Number(id)
  const validId = Number.isInteger(numericId) && numericId > 0
  const stateCustomer = (location.state as LocationState)?.customer
  const initialCustomer = stateCustomer && stateCustomer.id === numericId ? stateCustomer : null

  const load = useCallback(async (): Promise<LoadedCustomerDetail> => {
    if (!validId) return { customer: null, orders: [] }
    const [resolvedCustomer, orders] = await Promise.all([
      initialCustomer ? Promise.resolve(initialCustomer) : findCustomerById(api, numericId),
      client.ordersByUser(numericId),
    ])
    return {
      customer: resolvedCustomer,
      orders: sortOrdersNewestFirst(orders),
    }
  }, [api, client, initialCustomer, numericId, validId])

  const { data, error, loading, reload } = useLoad(load)

  const customer = data?.customer ?? initialCustomer
  const orders = useMemo(() => data?.orders ?? [], [data?.orders])
  const summary = useMemo(() => summarizeCustomerOrders(orders), [orders])

  if (!validId) {
    return (
      <>
        <PageHeader
          title="Client introuvable"
          action={(
            <Button component={RouterLink} to="/customers" variant="outlined" color="secondary" startIcon={<ArrowBackOutlined />}>
              Retour aux clients
            </Button>
          )}
        />
        <Alert severity="warning">L’identifiant du client demandé est invalide.</Alert>
      </>
    )
  }

  if (!loading && !error && data && !data.customer) {
    return (
      <>
        <PageHeader
          title={`Client #${numericId}`}
          action={(
            <Button component={RouterLink} to="/customers" variant="outlined" color="secondary" startIcon={<ArrowBackOutlined />}>
              Retour aux clients
            </Button>
          )}
        />
        <Alert severity="warning">Ce client n’existe pas ou n’est plus accessible.</Alert>
      </>
    )
  }

  const title = customer ? customerDisplayName(customer) : `Client #${numericId}`

  return (
    <>
      <Box sx={{ mb: 1.5 }}>
        <Button
          component={RouterLink}
          to="/customers"
          size="small"
          color="secondary"
          startIcon={<ArrowBackOutlined />}
        >
          Clients
        </Button>
      </Box>

      <PageHeader
        title={title}
        description={customer ? `Fiche client #${customer.id}` : 'Chargement des informations client…'}
      />

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={<Button color="inherit" size="small" onClick={() => void reload()}>Réessayer</Button>}
        >
          {errorMessage(error)}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <Paper variant="outlined" sx={{ p: 2.5, flex: 1.3 }}>
          <Typography variant="overline" color="text.secondary">
            Coordonnées
          </Typography>
          {loading && !customer ? (
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Skeleton width="60%" />
              <Skeleton width="45%" />
              <Skeleton width="40%" />
            </Stack>
          ) : customer ? (
            <Stack spacing={1.25} sx={{ mt: 1.25 }}>
              <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <Typography variant="body2" color="text.secondary">Identifiant</Typography>
                <Typography variant="body2" sx={{ fontFamily: monoFont }}>#{customer.id}</Typography>
              </Stack>
              <Divider />
              <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <Typography variant="body2" color="text.secondary">Adresse e-mail</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{customer.email}</Typography>
              </Stack>
              <Divider />
              <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <Typography variant="body2" color="text.secondary">Téléphone</Typography>
                <Typography variant="body2" sx={{ fontFamily: customer.phone ? monoFont : undefined }}>
                  {customer.phone || 'Non renseigné'}
                </Typography>
              </Stack>
            </Stack>
          ) : null}
        </Paper>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ flex: 1.7 }}>
          <Paper variant="outlined" sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Typography variant="overline" color="text.secondary">
              Total dépensé (TTC)
            </Typography>
            {loading && !data ? (
              <Skeleton width="70%" height={40} />
            ) : (
              <Typography
                variant="h3"
                component="p"
                sx={{ fontFamily: monoFont, fontWeight: 800, my: 1 }}
              >
                {formatPrice(summary.totalSpentInclTax)}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              {summary.cancelledOrderCount > 0
                ? `Hors ${summary.cancelledOrderCount} commande${summary.cancelledOrderCount > 1 ? 's' : ''} annulée${summary.cancelledOrderCount > 1 ? 's' : ''}`
                : 'Toutes commandes validées confondues'}
            </Typography>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Typography variant="overline" color="text.secondary">
              Commandes
            </Typography>
            {loading && !data ? (
              <Skeleton width="50%" height={40} />
            ) : (
              <Typography
                variant="h3"
                component="p"
                sx={{ fontFamily: monoFont, fontWeight: 800, my: 1 }}
              >
                {summary.validOrderCount}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              {summary.averageBasketInclTax !== null
                ? `Panier moyen : ${formatPrice(summary.averageBasketInclTax)}`
                : 'Aucune commande validée'}
            </Typography>
          </Paper>
        </Stack>
      </Stack>

      <Typography variant="h4" component="h2" sx={{ mb: 1.5 }}>
        Historique des commandes
      </Typography>

      <TableFrame
        label="Historique des commandes du client"
        head={(
          <>
            <TableCell sx={{ width: 48 }} />
            <TableCell>Numéro</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Livraison</TableCell>
            <TableCell align="right">Articles</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell align="right">Total TTC</TableCell>
          </>
        )}
        columns={7}
        minWidth={820}
        loading={loading && !data}
        error={null}
        onRetry={() => void reload()}
        isEmpty={orders.length === 0}
        empty="Ce client n’a pas encore passé de commande."
      >
        {orders.map((order) => {
          const status = orderStatusPresentation(order.status)
          const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
          const expanded = expandedOrderId === order.id

          return (
            <Fragment key={order.id}>
              <TableRow hover>
                <TableCell sx={{ py: 0.5, px: 1 }}>
                  <IconButton
                    size="small"
                    aria-label={
                      expanded
                        ? `Masquer les articles de la commande ${order.orderNumber}`
                        : `Afficher les articles de la commande ${order.orderNumber}`
                    }
                    aria-expanded={expanded}
                    onClick={() => setExpandedOrderId(expanded ? null : order.id)}
                  >
                    {expanded ? <KeyboardArrowUpOutlined fontSize="small" /> : <KeyboardArrowDownOutlined fontSize="small" />}
                  </IconButton>
                </TableCell>
                <TableCell component="th" scope="row" sx={{ fontFamily: monoFont, fontWeight: 600 }}>
                  {order.orderNumber}
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {formatDateTime(order.createdAt)}
                </TableCell>
                <TableCell>{deliveryModeLabel(order.deliveryMode)}</TableCell>
                <TableCell align="right" sx={{ fontFamily: monoFont }}>
                  {itemCount}
                </TableCell>
                <TableCell>
                  <StatusBadge tone={status.tone} label={status.label} />
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: monoFont, fontWeight: 600 }}>
                  {formatPrice(order.totalInclTax)}
                </TableCell>
              </TableRow>

              {expanded && (
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 2, px: 3, bgcolor: tokens.canvasWarm }}>
                    <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      Détail des articles ({order.items.length} ligne{order.items.length > 1 ? 's' : ''})
                    </Typography>
                    <Table size="small" aria-label={`Articles de la commande ${order.orderNumber}`}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Désignation</TableCell>
                          <TableCell align="right">Quantité</TableCell>
                          <TableCell align="right">PU HT</TableCell>
                          <TableCell align="right">TVA</TableCell>
                          <TableCell align="right">Sous-total TTC</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {order.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.designation}</TableCell>
                            <TableCell align="right" sx={{ fontFamily: monoFont }}>{item.quantity}</TableCell>
                            <TableCell align="right" sx={{ fontFamily: monoFont }}>{formatPrice(item.unitPriceExclTax)}</TableCell>
                            <TableCell align="right" sx={{ fontFamily: monoFont }}>{formatPercent(item.vatRate)}</TableCell>
                            <TableCell align="right" sx={{ fontFamily: monoFont, fontWeight: 600 }}>
                              {formatPrice(item.subTotalInclTax)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          )
        })}
      </TableFrame>
    </>
  )
}