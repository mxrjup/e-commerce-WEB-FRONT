import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined'
import CheckCircleOutlineOutlined from '@mui/icons-material/CheckCircleOutlineOutlined'
import LockOutlined from '@mui/icons-material/LockOutlined'
import SendOutlined from '@mui/icons-material/SendOutlined'
import {
  Alert, Box, Button, Divider, FormControl, InputLabel, Link, MenuItem, Paper, Select,
  Skeleton, Stack, TextField, Typography,
} from '@mui/material'
import { useCallback, useMemo, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router'
import { errorMessage } from '../../api/errors'
import { useApi } from '../../api/useApi'
import { useLoad } from '../../api/useLoad'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useNotify } from '../../components/Notifications'
import { PageHeader } from '../../components/PageHeader'
import { StatusBadge } from '../../components/StatusBadge'
import { formatDateTime } from '../../lib/format'
import { monoFont, tokens } from '../../theme'
import {
  adminSupportApi, sortMessagesChronologically, TICKET_STATUSES, ticketCategoryLabel,
  ticketStatusPresentation, translations, validateAdminReply,
  type AdminTicketDetail, type TicketStatus,
} from './api'

type ReplyStatusChoice = '' | TicketStatus

/**
 * S05 (part 2): ticket handling screen with chronological thread, agent reply
 * (POST /api/admin/support/tickets/{id}/reply), status transition and closure
 * (PATCH /api/admin/support/tickets/{id}/status).
 */
export function SupportTicketDetailPage() {
  const api = useApi()
  const notify = useNotify()
  const { id } = useParams<{ id: string }>()
  const support = useMemo(() => adminSupportApi(api), [api])

  const ticketId = Number(id)
  const validId = Number.isInteger(ticketId) && ticketId > 0

  const [overrideTicket, setOverrideTicket] = useState<AdminTicketDetail | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [replyStatus, setReplyStatus] = useState<ReplyStatusChoice>('')
  const [replyFieldError, setReplyFieldError] = useState<string | null>(null)
  const [replySubmitError, setReplySubmitError] = useState<string | null>(null)
  const [sendingReply, setSendingReply] = useState(false)

  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [closingDialogOpen, setClosingDialogOpen] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!validId) return null
    const detail = await support.get(ticketId)
    setOverrideTicket(null)
    return detail
  }, [support, ticketId, validId])

  const { data, error, loading, reload } = useLoad(load)

  const ticket = overrideTicket && overrideTicket.id === ticketId ? overrideTicket : data
  const messages = useMemo(
    () => sortMessagesChronologically(ticket?.messages ?? []),
    [ticket?.messages],
  )

  async function handleStatusUpdate(nextStatus: TicketStatus) {
    if (!ticket || updatingStatus || ticket.status === nextStatus) return
    setUpdatingStatus(true)
    try {
      const updated = await support.updateStatus(ticket.id, nextStatus)
      setOverrideTicket(updated)
      notify(`Statut mis à jour : ${ticketStatusPresentation(nextStatus).label}.`)
    } catch (e) {
      notify(errorMessage(e, translations), 'error')
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function handleConfirmClose() {
    if (!ticket) return
    setCloseError(null)
    try {
      const updated = await support.updateStatus(ticket.id, 'CLOSED')
      setOverrideTicket(updated)
      setClosingDialogOpen(false)
      notify(`Le ticket #${ticket.id} est clôturé.`)
    } catch (e) {
      setCloseError(errorMessage(e, translations))
    }
  }

  async function handleSendReply(event: React.FormEvent) {
    event.preventDefault()
    if (!ticket || sendingReply || ticket.status === 'CLOSED') return

    const validationError = validateAdminReply(replyContent)
    setReplyFieldError(validationError)
    setReplySubmitError(null)
    if (validationError) return

    setSendingReply(true)
    try {
      const updated = await support.reply(ticket.id, {
        content: replyContent.trim(),
        status: replyStatus || null,
      })
      setOverrideTicket(updated)
      setReplyContent('')
      setReplyStatus('')
      notify('Réponse envoyée au client.')
    } catch (e) {
      setReplySubmitError(errorMessage(e, translations))
    } finally {
      setSendingReply(false)
    }
  }

  if (!validId) {
    return (
      <>
        <PageHeader
          title="Ticket introuvable"
          action={(
            <Button component={RouterLink} to="/support" variant="outlined" color="secondary" startIcon={<ArrowBackOutlined />}>
              Retour aux tickets SAV
            </Button>
          )}
        />
        <Alert severity="warning">L’identifiant du ticket demandé est invalide.</Alert>
      </>
    )
  }

  const statusInfo = ticket ? ticketStatusPresentation(ticket.status) : null
  const isClosed = ticket?.status === 'CLOSED'

  return (
    <>
      <Box sx={{ mb: 1.5 }}>
        <Button
          component={RouterLink}
          to="/support"
          size="small"
          color="secondary"
          startIcon={<ArrowBackOutlined />}
        >
          Tickets SAV
        </Button>
      </Box>

      <PageHeader
        title={ticket ? `#${ticket.id} · ${ticket.subject}` : `Ticket #${ticketId}`}
        description={ticket ? `Catégorie : ${ticketCategoryLabel(ticket.category)}` : 'Chargement du ticket SAV…'}
        action={
          ticket && !isClosed ? (
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<LockOutlined />}
              disabled={updatingStatus}
              onClick={() => {
                setCloseError(null)
                setClosingDialogOpen(true)
              }}
            >
              Clôturer le ticket
            </Button>
          ) : ticket && isClosed ? (
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<CheckCircleOutlineOutlined />}
              disabled={updatingStatus}
              onClick={() => void handleStatusUpdate('IN_PROGRESS')}
            >
              Rouvrir le ticket
            </Button>
          ) : undefined
        }
      />

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={<Button color="inherit" size="small" onClick={() => void reload()}>Réessayer</Button>}
        >
          {errorMessage(error, translations)}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} sx={{ alignItems: 'flex-start' }}>
        <Stack spacing={2.5} sx={{ flex: 2, width: '100%' }}>
          <Typography variant="h4" component="h2">
            Fil de discussion ({messages.length})
          </Typography>

          {loading && !ticket ? (
            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Stack spacing={1.5}>
                <Skeleton width="35%" />
                <Skeleton width="90%" />
                <Skeleton width="75%" />
              </Stack>
            </Paper>
          ) : messages.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="body2">Aucun message dans ce ticket.</Typography>
            </Paper>
          ) : (
            <Stack spacing={1.5}>
              {messages.map((message) => {
                const isAgent = message.authorRole === 'AGENT'
                return (
                  <Paper
                    key={message.id}
                    variant="outlined"
                    sx={{
                      p: 2.25,
                      bgcolor: isAgent ? tokens.accentSoft : tokens.canvas,
                      borderColor: isAgent ? tokens.accent : tokens.line,
                    }}
                  >
                    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: isAgent ? tokens.accent : tokens.ink }}>
                        {isAgent ? 'Conseiller SAV' : 'Client'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(message.createdAt)}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {message.content}
                    </Typography>
                  </Paper>
                )
              })}
            </Stack>
          )}

          {ticket && (
            isClosed ? (
              <Alert severity="info">
                Ce ticket est clôturé : l’envoi de nouvelles réponses est verrouillé. Cliquez sur « Rouvrir le ticket » pour reprendre l’échange.
              </Alert>
            ) : (
              <Paper component="form" onSubmit={(event) => void handleSendReply(event)} variant="outlined" sx={{ p: 2.5 }}>
                <Typography variant="h4" component="h3" sx={{ mb: 1.5 }}>
                  Répondre au client
                </Typography>

                {replySubmitError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {replySubmitError}
                  </Alert>
                )}

                <Stack spacing={2}>
                  <TextField
                    label="Votre réponse"
                    placeholder="Rédigez votre réponse au client…"
                    multiline
                    minRows={4}
                    fullWidth
                    value={replyContent}
                    onChange={(event) => {
                      setReplyContent(event.target.value)
                      if (replyFieldError) setReplyFieldError(null)
                    }}
                    disabled={sendingReply}
                    error={Boolean(replyFieldError)}
                    helperText={replyFieldError ?? `${replyContent.trim().length} / 5 000 caractères`}
                    slotProps={{ htmlInput: { maxLength: 5000 } }}
                  />

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' } }}>
                    <FormControl size="small" sx={{ minWidth: 260 }}>
                      <InputLabel id="reply-next-status-label">Statut après envoi</InputLabel>
                      <Select
                        labelId="reply-next-status-label"
                        label="Statut après envoi"
                        value={replyStatus}
                        disabled={sendingReply}
                        onChange={(event) => setReplyStatus(event.target.value as ReplyStatusChoice)}
                      >
                        <MenuItem value="">Automatique (En attente client)</MenuItem>
                        <MenuItem value="IN_PROGRESS">En cours</MenuItem>
                        <MenuItem value="WAITING_CUSTOMER">En attente client</MenuItem>
                        <MenuItem value="RESOLVED">Résolu</MenuItem>
                        <MenuItem value="CLOSED">Clôturé</MenuItem>
                      </Select>
                    </FormControl>

                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={<SendOutlined />}
                      disabled={sendingReply}
                    >
                      {sendingReply ? 'Envoi en cours…' : 'Envoyer la réponse'}
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            )
          )}
        </Stack>

        <Paper variant="outlined" sx={{ p: 2.5, flex: 1, width: '100%' }}>
          <Typography variant="overline" color="text.secondary">
            Informations du ticket
          </Typography>

          {loading && !ticket ? (
            <Stack spacing={1.25} sx={{ mt: 1.5 }}>
              <Skeleton width="50%" />
              <Skeleton width="70%" />
              <Skeleton width="60%" />
            </Stack>
          ) : ticket && statusInfo ? (
            <Stack spacing={1.5} sx={{ mt: 1.5 }}>
              <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">Statut</Typography>
                <StatusBadge tone={statusInfo.tone} label={statusInfo.label} />
              </Stack>

              <FormControl size="small" fullWidth>
                <InputLabel id="ticket-status-select-label">Changer le statut</InputLabel>
                <Select
                  labelId="ticket-status-select-label"
                  label="Changer le statut"
                  value={ticket.status}
                  disabled={updatingStatus}
                  onChange={(event) => void handleStatusUpdate(event.target.value as TicketStatus)}
                >
                  {TICKET_STATUSES.map((status) => (
                    <MenuItem key={status} value={status}>
                      {ticketStatusPresentation(status).label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Divider />

              <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Catégorie</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {ticketCategoryLabel(ticket.category)}
                </Typography>
              </Stack>

              <Divider />

              <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Client</Typography>
                {ticket.userId !== null ? (
                  <Link
                    component={RouterLink}
                    to={`/customers/${ticket.userId}`}
                    underline="hover"
                    sx={{ fontFamily: monoFont, fontSize: 13, fontWeight: 600 }}
                  >
                    Client #{ticket.userId}
                  </Link>
                ) : (
                  <Typography variant="body2" sx={{ fontFamily: monoFont }}>
                    {ticket.userSubject}
                  </Typography>
                )}
              </Stack>

              <Divider />

              <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Commande</Typography>
                <Typography variant="body2" sx={{ fontFamily: monoFont }}>
                  {ticket.orderNumber ?? (ticket.orderId !== null ? `#${ticket.orderId}` : 'Aucune')}
                </Typography>
              </Stack>

              <Divider />

              <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Ouvert le</Typography>
                <Typography variant="body2">{formatDateTime(ticket.createdAt)}</Typography>
              </Stack>

              <Divider />

              <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Mis à jour</Typography>
                <Typography variant="body2">{formatDateTime(ticket.updatedAt)}</Typography>
              </Stack>
            </Stack>
          ) : null}
        </Paper>
      </Stack>

      <ConfirmDialog
        open={closingDialogOpen}
        title="Clôturer ce ticket SAV ?"
        confirmLabel="Clôturer le ticket"
        onConfirm={handleConfirmClose}
        onClose={() => setClosingDialogOpen(false)}
        error={closeError}
      >
        Une fois clôturé, ni le client ni le support ne pourront ajouter de message tant que le ticket ne sera pas rouvert.
      </ConfirmDialog>
    </>
  )
}