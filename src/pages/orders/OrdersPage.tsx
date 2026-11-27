import SearchOutlined from '@mui/icons-material/SearchOutlined'
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined'
import {
  IconButton, InputAdornment, Link, MenuItem, Stack, TableCell, TableRow, TextField, Tooltip, Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router'
import { errorMessage } from '../../api/errors'
import { useApi } from '../../api/useApi'
import { useList } from '../../api/useList'
import { PageHeader } from '../../components/PageHeader'
import { StatusBadge } from '../../components/StatusBadge'
import { TableFrame } from '../../components/TableFrame'
import { formatDateTime, formatPrice } from '../../lib/format'
import { monoFont } from '../../theme'
import {
  deliveryModeLabel, ORDER_STATUSES, orderStatusPresentation, ordersApi,
  type OrderStatus,
} from './api'

/** O13: the list makes the next logistics action visible without hiding the order context. */
export function OrdersPage() {
  const api = useApi()
  const client = useMemo(() => ordersApi(api), [api])
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [query, setQuery] = useState('')
  const load = useMemo(() => () => client.list({ status: status || undefined }), [client, status])
  const { items, error, loading, reload } = useList(load)

  const rows = useMemo(() => {
    const wanted = query.trim().toLowerCase()
    const all = items ?? []
    return wanted
      ? all.filter((order) => `${order.orderNumber} ${order.id}`.toLowerCase().includes(wanted))
      : all
  }, [items, query])

  return (
    <>
      <PageHeader
        title="Commandes"
        description="Suivi des commandes, statuts de traitement et informations de livraison."
      />

      <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
        <TextField
          select
          size="small"
          label="Statut"
          value={status}
          onChange={(event) => setStatus(event.target.value as OrderStatus | '')}
          sx={{ width: { xs: '100%', sm: 220 } }}
        >
          <MenuItem value="">Tous les statuts</MenuItem>
          {ORDER_STATUSES.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
        </TextField>
        <TextField
          size="small"
          label="Rechercher"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Numéro ou identifiant"
          sx={{ width: { xs: '100%', sm: 260 } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchOutlined fontSize="small" /></InputAdornment> } }}
        />
        <Typography variant="body2" color="text.secondary" role="status" sx={{ flexGrow: 1 }}>
          {items === null ? '' : query.trim() ? `${rows.length} sur ${items.length} commandes` : `${items.length} commande${items.length > 1 ? 's' : ''}`}
        </Typography>
      </Stack>

      <TableFrame
        label="Commandes"
        head={(
          <>
            <TableCell>Commande</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Client</TableCell>
            <TableCell>Livraison</TableCell>
            <TableCell>Montant TTC</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell align="right">Actions</TableCell>
          </>
        )}
        columns={7}
        minWidth={980}
        loading={loading}
        error={error ? errorMessage(error) : null}
        onRetry={() => void reload()}
        isEmpty={rows.length === 0}
        empty={query.trim() ? 'Aucune commande ne correspond à cette recherche.' : 'Aucune commande pour ce filtre.'}
      >
        {rows.map((order) => {
          const presentation = orderStatusPresentation(order.status)
          return (
            <TableRow key={order.id} hover>
              <TableCell component="th" scope="row">
                <Link component={RouterLink} to={`/orders/${order.id}`} sx={{ fontFamily: monoFont, fontWeight: 700 }}>
                  {order.orderNumber}
                </Link>
              </TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(order.createdAt)}</TableCell>
              <TableCell><Typography variant="body2" sx={{ fontFamily: monoFont }}>#{order.userId}</Typography></TableCell>
              <TableCell>{deliveryModeLabel(order.deliveryMode)}</TableCell>
              <TableCell sx={{ fontFamily: monoFont, whiteSpace: 'nowrap' }}>{formatPrice(order.totalInclTax)}</TableCell>
              <TableCell><StatusBadge tone={presentation.tone} label={presentation.label} /></TableCell>
              <TableCell align="right" sx={{ py: 1 }}>
                <Tooltip title="Voir le détail">
                  <IconButton component={RouterLink} to={`/orders/${order.id}`} aria-label={`Voir la commande ${order.orderNumber}`}>
                    <VisibilityOutlined />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          )
        })}
      </TableFrame>
    </>
  )
}
