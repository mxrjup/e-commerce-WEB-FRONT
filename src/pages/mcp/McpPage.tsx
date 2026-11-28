import AddOutlined from '@mui/icons-material/AddOutlined'
import BlockOutlined from '@mui/icons-material/BlockOutlined'
import {
  Button, Chip, IconButton, Paper, Stack, TableCell, TableRow, Tooltip, Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { ApiError } from '../../api/client'
import { errorMessage } from '../../api/errors'
import { useApi } from '../../api/useApi'
import { useList } from '../../api/useList'
import { CodeLine } from '../../components/CodeLine'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useNotify } from '../../components/Notifications'
import { PageHeader } from '../../components/PageHeader'
import { StatusBadge } from '../../components/StatusBadge'
import { TableFrame } from '../../components/TableFrame'
import { config } from '../../config'
import { formatDate, formatDateTime, formatRelative } from '../../lib/format'
import { useNow } from '../../lib/useNow'
import { monoFont, tokens } from '../../theme'
import { mcpTokens, SCOPES, type CreatedMcpToken, type McpToken, type McpTokenStatus } from './api'
import { CreateTokenDialog } from './CreateTokenDialog'
import { TokenCreatedDialog } from './TokenCreatedDialog'
import { useAccountNames } from './useAccountNames'

const STATUS: Record<McpTokenStatus, { tone: 'ok' | 'neutral' | 'danger'; label: string }> = {
  active: { tone: 'ok', label: 'Actif' },
  expired: { tone: 'neutral', label: 'Expiré' },
  revoked: { tone: 'danger', label: 'Révoqué' },
}

const SCOPE_LABELS = new Map(SCOPES.map((scope) => [scope.value, scope.label]))

/** An expiry under a week away is worth noticing before a client stops working. */
const SOON = 7 * 24 * 60 * 60 * 1000

/** The MCP transport, behind the gateway: what a client is configured with. */
const ENDPOINT = new URL('/mcp', config.apiUrl).toString()

/**
 * M04: the tokens that open the shop's data, read-only, to an MCP client
 * such as Claude Desktop. Create one (shown once), see when each was last
 * used, revoke one at once. Admins only, like the API behind it.
 */
export function McpPage() {
  const api = useApi()
  const notify = useNotify()
  const tokensApi = useMemo(() => mcpTokens(api), [api])
  const { items, error, loading, reload } = useList(tokensApi.list)
  const nameOf = useAccountNames(api)
  const now = useNow()
  const [showAll, setShowAll] = useState(false)
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<CreatedMcpToken | null>(null)
  const [revoking, setRevoking] = useState<McpToken | null>(null)
  const [revokeError, setRevokeError] = useState<string | null>(null)

  const all = items ?? []
  const active = all.filter((token) => token.status === 'active')
  const rows = showAll ? all : active

  async function revoke() {
    if (!revoking) return
    try {
      await tokensApi.revoke(revoking.id)
    } catch (e) {
      setRevokeError(errorMessage(e))
      if (e instanceof ApiError && e.status === 404) void reload()
      return
    }
    notify(`Jeton « ${revoking.name} » révoqué : il ne donne plus accès à rien.`)
    setRevoking(null)
    await reload()
  }

  return (
    <>
      <PageHeader
        title="Accès MCP"
        description="Les jetons qui ouvrent les données de la boutique, en lecture seule, à un assistant comme Claude Desktop."
        action={<Button variant="contained" startIcon={<AddOutlined />} onClick={() => setCreating(true)}>Créer un jeton</Button>}
      />

      <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
        <CodeLine label="Adresse du serveur MCP" value={ENDPOINT} />
      </Paper>

      <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
        {/* chip-filter de la charte : contour au repos, accent une fois actif, aria-pressed. */}
        {[{ all: false, label: 'Actifs', count: active.length }, { all: true, label: 'Tous', count: all.length }].map((filter) => (
          <Chip
            key={filter.label}
            label={(
              <span>
                {filter.label}{' '}
                <Typography component="span" sx={{ fontFamily: monoFont, fontSize: 12 }}>{items === null ? '' : filter.count}</Typography>
              </span>
            )}
            onClick={() => setShowAll(filter.all)}
            aria-pressed={showAll === filter.all}
            color={showAll === filter.all ? 'primary' : 'default'}
            variant={showAll === filter.all ? 'filled' : 'outlined'}
            sx={showAll === filter.all ? undefined : { borderColor: tokens.lineStrong }}
          />
        ))}
      </Stack>

      <TableFrame
        label="Jetons MCP"
        head={(
          <>
            <TableCell>Nom</TableCell>
            <TableCell>Jeton</TableCell>
            <TableCell>Portées</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell>Créé</TableCell>
            <TableCell>Expiration</TableCell>
            <TableCell>Dernière utilisation</TableCell>
            <TableCell align="right">Actions</TableCell>
          </>
        )}
        columns={8}
        minWidth={1080}
        loading={loading}
        error={error ? errorMessage(error) : null}
        onRetry={() => void reload()}
        isEmpty={rows.length === 0}
        empty={showAll || all.length === 0
          ? 'Aucun jeton pour l’instant. Créez-en un pour brancher un assistant sur la boutique.'
          : 'Aucun jeton actif. Les jetons expirés et révoqués sont sous « Tous ».'}
      >
        {rows.map((token) => {
          const status = STATUS[token.status]
          const expiresSoon = token.status === 'active' && token.expiresAt !== null
            && new Date(token.expiresAt).getTime() - now < SOON
          return (
            <TableRow key={token.id} hover>
              <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>{token.name}</TableCell>
              <TableCell sx={{ fontFamily: monoFont, fontSize: 13, whiteSpace: 'nowrap' }}>{token.prefix}…</TableCell>
              <TableCell>
                <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
                  {token.scopes.map((scope) => <StatusBadge key={scope} tone="neutral" label={SCOPE_LABELS.get(scope) ?? scope} />)}
                </Stack>
              </TableCell>
              <TableCell>
                <StatusBadge tone={status.tone} label={status.label} />
                {token.revokedAt && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    le {formatDate(token.revokedAt)}, par {nameOf(token.revokedBy)}
                  </Typography>
                )}
              </TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                <Typography variant="body2" title={formatDateTime(token.createdAt)}>{formatDate(token.createdAt)}</Typography>
                <Typography variant="caption" color="text.secondary">par {nameOf(token.createdBy)}</Typography>
              </TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                {token.expiresAt === null
                  ? <Typography variant="body2" color="text.secondary">Jamais</Typography>
                  : (
                    <>
                      <Typography variant="body2" title={formatDateTime(token.expiresAt)}>{formatDate(token.expiresAt)}</Typography>
                      {token.status === 'active' && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: expiresSoon ? 600 : 400 }}>
                          {formatRelative(token.expiresAt, now)}
                        </Typography>
                      )}
                    </>
                  )}
              </TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                {token.lastUsedAt === null
                  ? <Typography variant="body2" color="text.secondary">Jamais utilisé</Typography>
                  : <Typography variant="body2" title={formatDateTime(token.lastUsedAt)}>{formatRelative(token.lastUsedAt, now)}</Typography>}
              </TableCell>
              <TableCell align="right" sx={{ py: 1 }}>
                <Tooltip title={token.status === 'active' ? 'Révoquer' : token.status === 'revoked' ? 'Déjà révoqué' : 'Expiré : il ne donne déjà plus accès'}>
                  <span>
                    <IconButton
                      aria-label={`Révoquer ${token.name}`}
                      disabled={token.status !== 'active'}
                      onClick={() => {
                        setRevokeError(null)
                        setRevoking(token)
                      }}
                    >
                      <BlockOutlined />
                    </IconButton>
                  </span>
                </Tooltip>
              </TableCell>
            </TableRow>
          )
        })}
      </TableFrame>
      <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
        La dernière utilisation est notée à la minute près au plus.
      </Typography>

      <CreateTokenDialog
        open={creating}
        create={tokensApi.create}
        onClose={() => setCreating(false)}
        onCreated={(token) => {
          setCreating(false)
          setCreated(token)
          void reload()
        }}
      />
      <TokenCreatedDialog token={created} endpoint={ENDPOINT} onClose={() => setCreated(null)} />
      <ConfirmDialog
        open={revoking !== null}
        title="Révoquer le jeton ?"
        confirmLabel="Révoquer"
        onConfirm={revoke}
        onClose={() => setRevoking(null)}
        error={revokeError}
      >
        Le jeton <strong>{revoking?.name}</strong> ({revoking?.prefix}…) cessera de fonctionner immédiatement, pour
        tous les clients qui l’utilisent. Une révocation est définitive.
      </ConfirmDialog>
    </>
  )
}
