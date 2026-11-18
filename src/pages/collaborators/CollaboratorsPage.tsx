import BlockOutlined from '@mui/icons-material/BlockOutlined'
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined'
import ManageAccountsOutlined from '@mui/icons-material/ManageAccountsOutlined'
import PersonAddOutlined from '@mui/icons-material/PersonAddOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import {
  Button, IconButton, InputAdornment, Stack, TableCell, TableRow, TextField, Tooltip, Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { ApiError } from '../../api/client'
import { errorMessage } from '../../api/errors'
import { useApi } from '../../api/useApi'
import { useList } from '../../api/useList'
import { useAuth } from '../../auth/AuthContext'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useNotify } from '../../components/Notifications'
import { PageHeader } from '../../components/PageHeader'
import { StatusBadge } from '../../components/StatusBadge'
import { TableFrame } from '../../components/TableFrame'
import { formatDate } from '../../lib/format'
import { collaboratorsApi, displayName, ROLE_LABELS, translations, type Collaborator } from './api'
import { InviteDialog } from './InviteDialog'
import { InvitedDialog } from './InvitedDialog'
import { RoleDialog } from './RoleDialog'

/** The API refuses both on one's own account: an admin could lock the shop out of its own back-office. */
const OWN_ACCOUNT = 'Pas sur votre propre compte : demandez-le à un autre administrateur.'

/**
 * U08, first half: the back-office accounts. Invite one with a temporary
 * password, change its role, disable it (its sessions end at once) or
 * enable it again. Admins only, like the API behind it.
 */
export function CollaboratorsPage() {
  const api = useApi()
  const notify = useNotify()
  const { user } = useAuth()
  const accounts = useMemo(() => collaboratorsApi(api), [api])
  const { items, error, loading, reload } = useList(accounts.list)
  const [query, setQuery] = useState('')
  const [inviting, setInviting] = useState(false)
  const [invited, setInvited] = useState<{ collaborator: Collaborator; password: string } | null>(null)
  const [editingRole, setEditingRole] = useState<Collaborator | null>(null)
  const [disabling, setDisabling] = useState<Collaborator | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const all = items ?? []
  const wanted = query.trim().toLowerCase()
  const rows = wanted
    ? all.filter((account) => displayName(account).toLowerCase().includes(wanted) || account.email.toLowerCase().includes(wanted))
    : all

  async function disable() {
    if (!disabling) return
    try {
      await accounts.disable(disabling.id)
    } catch (e) {
      setActionError(errorMessage(e, translations))
      if (e instanceof ApiError && e.status === 404) void reload()
      return
    }
    notify(`${displayName(disabling)} ne peut plus se connecter.`)
    setDisabling(null)
    await reload()
  }

  async function enable(account: Collaborator) {
    try {
      await accounts.enable(account.id)
      notify(`${displayName(account)} peut de nouveau se connecter.`)
    } catch (e) {
      notify(errorMessage(e, translations), 'error')
    }
    await reload()
  }

  return (
    <>
      <PageHeader
        title="Collaborateurs"
        description="Les comptes qui entrent dans le back-office, et leur rôle. Ils sont gérés dans Keycloak."
        action={<Button variant="contained" startIcon={<PersonAddOutlined />} onClick={() => setInviting(true)}>Inviter un collaborateur</Button>}
      />

      <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
        <TextField
          size="small"
          label="Rechercher"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          sx={{ width: { xs: '100%', sm: 280 } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchOutlined fontSize="small" /></InputAdornment> } }}
        />
        <Typography variant="body2" color="text.secondary" role="status">
          {items === null ? '' : `${wanted ? `${rows.length} sur ` : ''}${all.length} compte${all.length > 1 ? 's' : ''}`}
        </Typography>
      </Stack>

      <TableFrame
        label="Collaborateurs"
        head={(
          <>
            <TableCell>Nom</TableCell>
            <TableCell>Adresse e-mail</TableCell>
            <TableCell>Rôle</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell>Créé le</TableCell>
            <TableCell align="right">Actions</TableCell>
          </>
        )}
        columns={6}
        minWidth={880}
        loading={loading}
        error={error ? errorMessage(error, translations) : null}
        onRetry={() => void reload()}
        isEmpty={rows.length === 0}
        empty={wanted ? 'Aucun compte pour cette recherche.' : 'Aucun compte.'}
      >
        {rows.map((account) => {
          const own = account.id === user.id
          const name = displayName(account)
          return (
            <TableRow key={account.id} hover>
              <TableCell component="th" scope="row">
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{name}</Typography>
                  {own && <StatusBadge tone="neutral" label="Vous" />}
                </Stack>
              </TableCell>
              <TableCell>{account.email}</TableCell>
              <TableCell>{ROLE_LABELS[account.role]}</TableCell>
              <TableCell>
                {account.enabled ? <StatusBadge tone="ok" label="Actif" /> : <StatusBadge tone="neutral" label="Désactivé" />}
              </TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{account.createdAt ? formatDate(account.createdAt) : '—'}</TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap', py: 1 }}>
                <Tooltip title={own ? OWN_ACCOUNT : 'Changer le rôle'}>
                  <span>
                    <IconButton aria-label={`Changer le rôle de ${name}`} disabled={own} onClick={() => setEditingRole(account)}>
                      <ManageAccountsOutlined />
                    </IconButton>
                  </span>
                </Tooltip>
                {account.enabled ? (
                  <Tooltip title={own ? OWN_ACCOUNT : 'Désactiver'}>
                    <span>
                      <IconButton
                        aria-label={`Désactiver ${name}`}
                        disabled={own}
                        onClick={() => {
                          setActionError(null)
                          setDisabling(account)
                        }}
                      >
                        <BlockOutlined />
                      </IconButton>
                    </span>
                  </Tooltip>
                ) : (
                  <Tooltip title="Réactiver">
                    <IconButton aria-label={`Réactiver ${name}`} onClick={() => void enable(account)}>
                      <CheckCircleOutlined />
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableFrame>

      <InviteDialog
        open={inviting}
        existing={all}
        create={accounts.create}
        onClose={() => setInviting(false)}
        onCreated={(collaborator, password) => {
          setInviting(false)
          setInvited({ collaborator, password })
          void reload()
        }}
      />
      <InvitedDialog invited={invited} onClose={() => setInvited(null)} />
      {editingRole && (
        <RoleDialog
          key={editingRole.id}
          collaborator={editingRole}
          onClose={() => setEditingRole(null)}
          onSave={async (role) => {
            await accounts.changeRole(editingRole.id, role)
            notify(`${displayName(editingRole)} est maintenant ${ROLE_LABELS[role].toLowerCase()}.`)
            setEditingRole(null)
            await reload()
          }}
        />
      )}
      <ConfirmDialog
        open={disabling !== null}
        title="Désactiver le compte ?"
        confirmLabel="Désactiver"
        onConfirm={disable}
        onClose={() => setDisabling(null)}
        error={actionError}
      >
        <strong>{disabling && displayName(disabling)}</strong> ne pourra plus se connecter, et ses sessions en cours
        seront fermées. Le compte est conservé : vous pourrez le réactiver.
      </ConfirmDialog>
    </>
  )
}
