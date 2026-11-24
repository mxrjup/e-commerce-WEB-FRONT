import ClearOutlined from '@mui/icons-material/ClearOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import SwapVertOutlined from '@mui/icons-material/SwapVertOutlined'
import {
  Alert, Box, Button, Chip, IconButton, Link, Stack, TableCell, TablePagination, TableRow, Tooltip, Typography,
} from '@mui/material'
import { useCallback, useMemo, useState } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router'
import { errorMessage } from '../../api/errors'
import { useApi } from '../../api/useApi'
import { useLoad } from '../../api/useLoad'
import { useNotify } from '../../components/Notifications'
import { PageHeader } from '../../components/PageHeader'
import { SearchField } from '../../components/SearchField'
import { StatusBadge } from '../../components/StatusBadge'
import { TableFrame } from '../../components/TableFrame'
import { monoFont } from '../../theme'
import { statusLabel, type Page } from '../products/api'
import { PAGE_SIZES } from '../products/productQuery'
import { inventoryPath, translations, type InventoryItem, type InventoryQuery } from './api'
import { paramsFromQuery, queryFromParams } from './inventoryQuery'
import { AdjustStockDialog, ThresholdDialog } from './StockDialogs'

const COLUMNS = 5
const mono = { fontFamily: monoFont, fontSize: 13, fontWeight: 500 } as const

type Editor = { kind: 'stock' | 'threshold'; variantId: number } | null

/**
 * C20: the stock of every variant, whatever the status of its product, on
 * the inventory API of catalog-service (C07). The alerts (stock at or below
 * the threshold) are counted at the top and can be listed alone; each line
 * can be corrected (units received, broken or lost) and get its threshold.
 */
export function InventoryPage() {
  const api = useApi()
  const notify = useNotify()
  const [params, setParams] = useSearchParams()
  const query = useMemo(() => queryFromParams(params), [params])
  const [editor, setEditor] = useState<Editor>(null)

  const change = useCallback((patch: Partial<InventoryQuery>, replace = false) => {
    setParams(paramsFromQuery({ ...query, page: 0, ...patch }), { replace })
  }, [query, setParams])

  const path = inventoryPath(query)
  const { data: page, error, loading, reload } = useLoad(useCallback(() => api<Page<InventoryItem>>(path), [api, path]))
  // Le nombre d'alertes sous la meme recherche : une page d'une ligne suffit, seul le total compte.
  const alertsPath = inventoryPath({ search: query.search, alerts: true, page: 0, size: 1 })
  const { data: alertsPage, reload: reloadAlerts } = useLoad(useCallback(() => api<Page<InventoryItem>>(alertsPath), [api, alertsPath]))
  const alertCount = alertsPage?.totalElements

  const rows = page?.content ?? []
  const pastTheEnd = page !== null && rows.length === 0 && query.page > 0
  // La ligne en cours de modification, telle que la liste la montre maintenant : elle suit les rechargements.
  const editing = editor ? rows.find((row) => row.variantId === editor.variantId) ?? null : null

  const refresh = useCallback(() => {
    void reload()
    void reloadAlerts()
  }, [reload, reloadAlerts])

  function done(message: string) {
    setEditor(null)
    notify(message)
    refresh()
  }

  const filtered = query.alerts || Boolean(query.search.trim())

  return (
    <>
      <PageHeader
        title="Inventaire"
        description="Le stock exact de chaque variante, tous statuts de produit confondus, et ses alertes."
      />

      <Stack spacing={2}>
        {!query.alerts && alertCount !== undefined && alertCount > 0 && (
          <Alert
            severity="warning"
            action={<Button color="inherit" size="small" onClick={() => change({ alerts: true })}>Voir les alertes</Button>}
          >
            {alertCount > 1
              ? `${alertCount} variantes sont à ou sous leur seuil d’alerte.`
              : '1 variante est à ou sous son seuil d’alerte.'}
          </Alert>
        )}

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} useFlexGap sx={{ flexWrap: 'wrap', alignItems: { md: 'center' } }}>
          <SearchField value={query.search} onChange={(search) => change({ search }, true)} placeholder="Titre ou SKU" />
          <Chip
            clickable
            aria-pressed={query.alerts}
            color={query.alerts ? 'primary' : 'default'}
            variant={query.alerts ? 'filled' : 'outlined'}
            onClick={() => change({ alerts: !query.alerts })}
            label={(
              <>
                Alertes seulement
                {alertCount !== undefined && <>{' '}<Box component="span" sx={{ fontFamily: monoFont, fontSize: 12, ml: 0.5 }}>{alertCount}</Box></>}
              </>
            )}
            sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}
          />
          {filtered && (
            <Button variant="text" color="secondary" startIcon={<ClearOutlined />} onClick={() => setParams(paramsFromQuery({ ...query, search: '', alerts: false, page: 0 }))}>
              Effacer les filtres
            </Button>
          )}
        </Stack>

        <Typography variant="body2" color="text.secondary" role="status">
          {page === null ? '' : page.totalElements > 1 ? `${page.totalElements} variantes` : `${page.totalElements} variante`}
        </Typography>

        <Box>
          <TableFrame
            label="Inventaire"
            minWidth={820}
            columns={COLUMNS}
            loading={loading}
            error={error ? errorMessage(error, translations) : null}
            onRetry={refresh}
            isEmpty={rows.length === 0}
            empty={pastTheEnd
              ? <>Cette page n’existe plus. <Button size="small" onClick={() => change({})}>Revenir à la première page</Button></>
              : query.alerts ? 'Aucune variante en alerte : tous les stocks sont au-dessus de leur seuil.'
                : filtered ? 'Aucune variante ne correspond à cette recherche.' : 'Aucune variante pour l’instant.'}
            head={(
              <>
                <TableCell>Variante</TableCell>
                <TableCell>Produit</TableCell>
                <TableCell align="right">Stock</TableCell>
                <TableCell align="right">Seuil</TableCell>
                <TableCell align="right">Actions</TableCell>
              </>
            )}
          >
            {rows.map((item) => <InventoryRow key={item.variantId} item={item} onEdit={(kind) => setEditor({ kind, variantId: item.variantId })} />)}
          </TableFrame>
          {page !== null && page.totalElements > 0 && (
            <TablePagination
              component="div"
              count={page.totalElements}
              page={pastTheEnd ? 0 : query.page}
              rowsPerPage={query.size}
              rowsPerPageOptions={[...PAGE_SIZES]}
              onPageChange={(_, next) => change({ page: next })}
              onRowsPerPageChange={(event) => change({ size: Number(event.target.value) })}
              labelRowsPerPage="Lignes par page"
              labelDisplayedRows={({ from, to, count }) => `${from} à ${to} sur ${count}`}
              getItemAriaLabel={(type) => (type === 'next' ? 'Page suivante' : type === 'previous' ? 'Page précédente' : type)}
            />
          )}
        </Box>
        <Typography variant="caption" color="text.secondary">
          Le stock ne garde pas l’historique de ses mouvements : seul le niveau actuel est enregistré.
        </Typography>
      </Stack>

      {editor?.kind === 'stock' && editing && (
        <AdjustStockDialog item={editing} onClose={() => setEditor(null)} onDone={done} onFailed={refresh} />
      )}
      {editor?.kind === 'threshold' && editing && (
        <ThresholdDialog item={editing} onClose={() => setEditor(null)} onDone={done} />
      )}
    </>
  )
}

function InventoryRow({ item, onEdit }: { item: InventoryItem; onEdit: (kind: 'stock' | 'threshold') => void }) {
  const out = item.stock === 0
  return (
    <TableRow hover>
      <TableCell component="th" scope="row" sx={{ maxWidth: 360 }}>
        <Link component={RouterLink} to={`/products/${item.productId}`} variant="body2" underline="hover" color="text.primary" sx={{ fontWeight: 600 }}>
          {item.designation}
        </Link>
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: monoFont, display: 'block' }}>{item.sku}</Typography>
      </TableCell>
      <TableCell>
        <StatusBadge tone={item.productStatus === 'PUBLIE' ? 'ok' : 'neutral'} label={statusLabel(item.productStatus)} />
      </TableCell>
      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
          {out
            ? <StatusBadge tone="danger" label="Rupture" />
            : item.lowStock && <StatusBadge tone="neutral" label="Stock bas" />}
          <Box component="span" sx={{ ...mono, fontWeight: item.lowStock ? 600 : 500 }}>{item.stock}</Box>
        </Stack>
      </TableCell>
      <TableCell align="right" sx={mono}>{item.alertThreshold}</TableCell>
      <TableCell align="right" sx={{ whiteSpace: 'nowrap', py: 1 }}>
        <Tooltip title="Ajuster le stock">
          <IconButton aria-label={`Ajuster le stock de ${item.sku}`} onClick={() => onEdit('stock')}><SwapVertOutlined /></IconButton>
        </Tooltip>
        <Tooltip title="Modifier le seuil">
          <IconButton aria-label={`Modifier le seuil de ${item.sku}`} onClick={() => onEdit('threshold')}><EditOutlined /></IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  )
}
