import ArrowForwardOutlined from '@mui/icons-material/ArrowForwardOutlined'
import ClearOutlined from '@mui/icons-material/ClearOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import {
  Button, Chip, FormControl, IconButton, InputAdornment, InputLabel, Link, MenuItem, Select, Stack,
  TableCell, TableRow, TextField, Typography,
} from '@mui/material'
import { useCallback, useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router'
import { errorMessage } from '../../api/errors'
import { useApi } from '../../api/useApi'
import { useLoad } from '../../api/useLoad'
import { PageHeader } from '../../components/PageHeader'
import { StatusBadge } from '../../components/StatusBadge'
import { TableFrame } from '../../components/TableFrame'
import { formatDateTime } from '../../lib/format'
import { monoFont } from '../../theme'
import {
  adminSupportApi, TICKET_CATEGORIES, TICKET_STATUSES, ticketCategoryLabel,
  ticketStatusPresentation, translations, type TicketCategory, type TicketStatus,
} from './api'

const STATUS_URL_TO_ENUM: Record<string, TicketStatus> = {
  ouvert: 'OPEN',
  'en-cours': 'IN_PROGRESS',
  'attente-client': 'WAITING_CUSTOMER',
  resolu: 'RESOLVED',
  cloture: 'CLOSED',
}

const ENUM_TO_STATUS_URL: Record<TicketStatus, string> = {
  OPEN: 'ouvert',
  IN_PROGRESS: 'en-cours',
  WAITING_CUSTOMER: 'attente-client',
  RESOLVED: 'resolu',
  CLOSED: 'cloture',
}

function parseCategoryParam(raw: string | null): TicketCategory | '' {
  if (!raw) return ''
  return (TICKET_CATEGORIES as readonly string[]).includes(raw) ? (raw as TicketCategory) : ''
}

/**
 * S05 (part 1): back-office support queue backed by GET /api/admin/support/tickets.
 * Filters by status and category live in the URL (?statut=...&categorie=...)
 * and call the server-side filter parameters directly.
 */
export function SupportTicketsPage() {
  const api = useApi()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const support = useMemo(() => adminSupportApi(api), [api])

  const statusParam = searchParams.get('statut') ?? ''
  const selectedStatus: TicketStatus | null = STATUS_URL_TO_ENUM[statusParam] ?? null
  const selectedCategory: TicketCategory | '' = parseCategoryParam(searchParams.get('categorie'))
  const [query, setQuery] = useState('')

  const load = useCallback(
    () => support.list({ status: selectedStatus, category: selectedCategory || null }),
    [support, selectedStatus, selectedCategory],
  )
  const { data, error, loading, reload } = useLoad(load)

  const all = data ?? []
  const wanted = query.trim().toLowerCase()
  const rows = wanted
    ? all.filter((ticket) =>
        ticket.subject.toLowerCase().includes(wanted)
        || `#${ticket.id}`.includes(wanted)
        || (ticket.orderNumber?.toLowerCase().includes(wanted) ?? false)
        || (ticket.userId !== null && `#${ticket.userId}`.includes(wanted))
        || ticket.userSubject.toLowerCase().includes(wanted))
    : all

  function handleStatusChange(nextStatus: TicketStatus | null) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (nextStatus) next.set('statut', ENUM_TO_STATUS_URL[nextStatus])
      else next.delete('statut')
      return next
    })
  }

  function handleCategoryChange(nextCategory: TicketCategory | '') {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (nextCategory) next.set('categorie', nextCategory)
      else next.delete('categorie')
      return next
    })
  }

  return (
    <>
      <PageHeader
        title="Tickets SAV"
        description="File de traitement des demandes du service après-vente : répondez aux clients, suivez l’avancement et clôturez les tickets résolus."
      />

      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mb: 2 }}>
        <Chip
          label="Tous"
          clickable
          color={selectedStatus === null ? 'primary' : 'default'}
          variant={selectedStatus === null ? 'filled' : 'outlined'}
          onClick={() => handleStatusChange(null)}
        />
        {TICKET_STATUSES.map((status) => {
          const info = ticketStatusPresentation(status)
          const active = selectedStatus === status
          return (
            <Chip
              key={status}
              label={info.label}
              clickable
              color={active ? 'primary' : 'default'}
              variant={active ? 'filled' : 'outlined'}
              onClick={() => handleStatusChange(active ? null : status)}
            />
          )
        })}
      </Stack>

      <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
        <TextField
          size="small"
          label="Rechercher un ticket"
          placeholder="Numéro, sujet, commande ou client"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          sx={{ width: { xs: '100%', sm: 300 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlined fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: query ? (
                <InputAdornment position="end">
                  <IconButton size="small" aria-label="Effacer la recherche" onClick={() => setQuery('')}>
                    <ClearOutlined fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            },
          }}
        />

        <FormControl size="small" sx={{ minWidth: 210 }}>
          <InputLabel id="support-category-filter-label">Catégorie</InputLabel>
          <Select
            labelId="support-category-filter-label"
            label="Catégorie"
            value={selectedCategory}
            onChange={(event) => handleCategoryChange(event.target.value as TicketCategory | '')}
          >
            <MenuItem value="">Toutes les catégories</MenuItem>
            {TICKET_CATEGORIES.map((category) => (
              <MenuItem key={category} value={category}>
                {ticketCategoryLabel(category)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Typography variant="body2" color="text.secondary" role="status">
          {data === null
            ? ''
            : `${wanted ? `${rows.length} sur ` : ''}${all.length} ticket${all.length > 1 ? 's' : ''}`}
        </Typography>
      </Stack>

      <TableFrame
        label="Tickets SAV"
        head={(
          <>
            <TableCell align="right" sx={{ width: 84 }}>Ticket</TableCell>
            <TableCell>Sujet</TableCell>
            <TableCell>Catégorie</TableCell>
            <TableCell>Client</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell align="right">Messages</TableCell>
            <TableCell>Dernière activité</TableCell>
            <TableCell align="right">Action</TableCell>
          </>
        )}
        columns={8}
        minWidth={940}
        loading={loading}
        error={error ? errorMessage(error, translations) : null}
        onRetry={() => void reload()}
        isEmpty={rows.length === 0}
        empty={
          selectedStatus || selectedCategory || wanted
            ? 'Aucun ticket ne correspond aux filtres sélectionnés.'
            : 'Aucun ticket SAV enregistré.'
        }
      >
        {rows.map((ticket) => {
          const status = ticketStatusPresentation(ticket.status)
          return (
            <TableRow
              key={ticket.id}
              hover
              onClick={() => navigate(`/support/${ticket.id}`)}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell align="right" sx={{ fontFamily: monoFont, color: 'text.secondary' }}>
                #{ticket.id}
              </TableCell>
              <TableCell component="th" scope="row">
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {ticket.subject}
                </Typography>
                {(ticket.orderNumber || ticket.orderId !== null) && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: monoFont, display: 'block' }}>
                    {ticket.orderNumber ?? `Commande #${ticket.orderId}`}
                  </Typography>
                )}
              </TableCell>
              <TableCell>{ticketCategoryLabel(ticket.category)}</TableCell>
              <TableCell onClick={(event) => event.stopPropagation()}>
                {ticket.userId !== null ? (
                  <Link
                    component={RouterLink}
                    to={`/customers/${ticket.userId}`}
                    underline="hover"
                    sx={{ fontFamily: monoFont, fontSize: 13 }}
                  >
                    Client #{ticket.userId}
                  </Link>
                ) : (
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: monoFont }}>
                    {ticket.userSubject.slice(0, 12)}…
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <StatusBadge tone={status.tone} label={status.label} />
              </TableCell>
              <TableCell align="right" sx={{ fontFamily: monoFont }}>
                {ticket.messageCount}
              </TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                {formatDateTime(ticket.updatedAt)}
              </TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap', py: 1 }}>
                <Button
                  size="small"
                  endIcon={<ArrowForwardOutlined fontSize="small" />}
                  aria-label={`Ouvrir le ticket #${ticket.id}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    navigate(`/support/${ticket.id}`)
                  }}
                >
                  Traiter
                </Button>
              </TableCell>
            </TableRow>
          )
        })}
      </TableFrame>
    </>
  )
}