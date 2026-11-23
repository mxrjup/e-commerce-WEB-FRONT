import ArrowForwardOutlined from '@mui/icons-material/ArrowForwardOutlined'
import ClearOutlined from '@mui/icons-material/ClearOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import {
  Button, IconButton, InputAdornment, Pagination, Stack, TableCell, TableRow, TextField, Typography,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { errorMessage } from '../../api/errors'
import { useApi } from '../../api/useApi'
import { useLoad } from '../../api/useLoad'
import { PageHeader } from '../../components/PageHeader'
import { TableFrame } from '../../components/TableFrame'
import { monoFont } from '../../theme'
import { customerDisplayName, customersApi } from './api'

const PAGE_SIZE = 20

function parsePositivePage(raw: string | null): number {
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1
}

/**
 * U09 (part 1): customer directory backed by GET /api/admin/users.
 * Search and page number live in the URL (?recherche=...&page=2) so reload and
 * back navigation restore the exact view.
 */
export function CustomersPage() {
  const api = useApi()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const client = useMemo(() => customersApi(api), [api])

  const urlQuery = searchParams.get('recherche') ?? ''
  const currentPage = parsePositivePage(searchParams.get('page'))
  const [inputQuery, setInputQuery] = useState(urlQuery)

  useEffect(() => {
    setInputQuery(urlQuery)
  }, [urlQuery])

  useEffect(() => {
    const trimmed = inputQuery.trim()
    if (trimmed === urlQuery) return
    const timer = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (trimmed) next.set('recherche', trimmed)
        else next.delete('recherche')
        next.delete('page')
        return next
      }, { replace: true })
    }, 300)
    return () => clearTimeout(timer)
  }, [inputQuery, urlQuery, setSearchParams])

  const load = useCallback(
    () => client.list({ search: urlQuery, page: currentPage - 1, size: PAGE_SIZE }),
    [client, urlQuery, currentPage],
  )
  const { data, error, loading, reload } = useLoad(load)

  const rows = data?.content ?? []
  const totalElements = data?.totalElements ?? 0
  const totalPages = data?.totalPages ?? 0

  function handlePageChange(nextPage: number) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (nextPage <= 1) next.delete('page')
      else next.set('page', String(nextPage))
      return next
    })
  }

  function clearSearch() {
    setInputQuery('')
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('recherche')
      next.delete('page')
      return next
    })
  }

  return (
    <>
      <PageHeader
        title="Clients"
        description="Les comptes clients de la boutique. Ouvrez une fiche pour consulter son historique de commandes et le total dépensé."
      />

      <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
        <TextField
          size="small"
          label="Rechercher un client"
          placeholder="Nom, prénom ou adresse e-mail"
          value={inputQuery}
          onChange={(event) => setInputQuery(event.target.value)}
          sx={{ width: { xs: '100%', sm: 320 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlined fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: inputQuery ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    aria-label="Effacer la recherche"
                    onClick={clearSearch}
                  >
                    <ClearOutlined fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            },
          }}
        />
        <Typography variant="body2" color="text.secondary" role="status">
          {data === null
            ? ''
            : `${totalElements} client${totalElements > 1 ? 's' : ''}${urlQuery ? ` pour « ${urlQuery} »` : ''}`}
        </Typography>
      </Stack>

      <TableFrame
        label="Clients"
        head={(
          <>
            <TableCell align="right" sx={{ width: 88 }}>ID</TableCell>
            <TableCell>Client</TableCell>
            <TableCell>Adresse e-mail</TableCell>
            <TableCell>Téléphone</TableCell>
            <TableCell align="right">Fiche</TableCell>
          </>
        )}
        columns={5}
        minWidth={760}
        loading={loading}
        error={error ? errorMessage(error) : null}
        onRetry={() => void reload()}
        isEmpty={rows.length === 0}
        empty={urlQuery ? 'Aucun client ne correspond à cette recherche.' : 'Aucun client enregistré.'}
      >
        {rows.map((customer) => {
          const name = customerDisplayName(customer)
          return (
            <TableRow
              key={customer.id}
              hover
              onClick={() => navigate(`/customers/${customer.id}`, { state: { customer } })}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell align="right" sx={{ fontFamily: monoFont, color: 'text.secondary' }}>
                #{customer.id}
              </TableCell>
              <TableCell component="th" scope="row">
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {name}
                </Typography>
              </TableCell>
              <TableCell>{customer.email}</TableCell>
              <TableCell sx={{ fontFamily: customer.phone ? monoFont : undefined, color: customer.phone ? 'text.primary' : 'text.secondary' }}>
                {customer.phone || '—'}
              </TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap', py: 1 }}>
                <Button
                  size="small"
                  endIcon={<ArrowForwardOutlined fontSize="small" />}
                  aria-label={`Ouvrir la fiche de ${name}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    navigate(`/customers/${customer.id}`, { state: { customer } })
                  }}
                >
                  Voir la fiche
                </Button>
              </TableCell>
            </TableRow>
          )
        })}
      </TableFrame>

      {totalPages > 1 && (
        <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 2.5 }}>
          <Pagination
            count={totalPages}
            page={Math.min(currentPage, totalPages)}
            onChange={(_event, page) => handlePageChange(page)}
            color="primary"
            shape="rounded"
          />
        </Stack>
      )}
    </>
  )
}