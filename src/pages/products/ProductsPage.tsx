import ClearOutlined from '@mui/icons-material/ClearOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import {
  Box, Button, Chip, InputAdornment, MenuItem, Stack, TableCell, TablePagination, TableRow, TableSortLabel, TextField,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { errorMessage } from '../../api/errors'
import { useApi } from '../../api/useApi'
import { useList } from '../../api/useList'
import { useLoad } from '../../api/useLoad'
import { PageHeader } from '../../components/PageHeader'
import { StatusBadge } from '../../components/StatusBadge'
import { TableFrame } from '../../components/TableFrame'
import { formatDateTime, formatPrice } from '../../lib/format'
import { monoFont } from '../../theme'
import { PATHS, type Brand, type Category } from '../references/api'
import { categoryTree } from '../references/categoryTree'
import {
  productsPath, STATUSES, statusLabel, type Page, type ProductQuery, type ProductSort, type ProductStatus,
  type ProductSummary,
} from './api'
import { isFiltered, PAGE_SIZES, paramsFromQuery, queryFromParams } from './productQuery'

const COLUMNS = 8
const mono = { fontFamily: monoFont, fontSize: 13, fontWeight: 500 } as const

/**
 * C15: the products of the catalog, every status included, for the
 * back-office. Search, status, brand and category filter the list; the API
 * sorts and paginates (C04). The filters are in the address, so a reload or
 * a link lands on the same view.
 */
export function ProductsPage() {
  const api = useApi()
  const [params, setParams] = useSearchParams()
  const query = useMemo(() => queryFromParams(params), [params])

  /** A new filter goes back to the first page; turning a page keeps the filters. */
  const change = useCallback((patch: Partial<ProductQuery>, replace = false) => {
    setParams(paramsFromQuery({ ...query, page: 0, ...patch }), { replace })
  }, [query, setParams])

  const path = productsPath(query)
  const loadPage = useCallback(() => api<Page<ProductSummary>>(path), [api, path])
  const { data: page, error, loading, reload } = useLoad(loadPage)

  const brands = useList(useCallback(() => api<Brand[]>(PATHS.brands), [api]))
  const categories = useList(useCallback(() => api<Category[]>(PATHS.categories), [api]))

  const rows = page?.content ?? []
  const pastTheEnd = page !== null && rows.length === 0 && query.page > 0

  return (
    <>
      <PageHeader
        title="Produits"
        description="Tout le catalogue, brouillons et produits archivés compris, avec le stock et le prix HT de chaque fiche."
      />

      <Stack spacing={2}>
        <StatusChips query={query} onChange={(status) => change({ status })} />

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <SearchField value={query.search} onChange={(search) => change({ search }, true)} />
          <TextField
            select
            size="small"
            label="Marque"
            value={query.brandId ?? ''}
            onChange={(event) => change({ brandId: event.target.value === '' ? null : Number(event.target.value) })}
            sx={{ minWidth: 200 }}
            slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
          >
            <MenuItem value="">Toutes</MenuItem>
            {(brands.items ?? []).map((brand) => <MenuItem key={brand.id} value={brand.id}>{brand.name}</MenuItem>)}
          </TextField>
          <TextField
            select
            size="small"
            label="Catégorie"
            value={query.categoryId ?? ''}
            onChange={(event) => change({ categoryId: event.target.value === '' ? null : Number(event.target.value) })}
            helperText="Sous-catégories comprises."
            sx={{ minWidth: 260 }}
            slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
          >
            <MenuItem value="">Toutes</MenuItem>
            {categoryTree(categories.items ?? []).map((row) => (
              <MenuItem key={row.category.id} value={row.category.id}>{row.path.join(' › ')}</MenuItem>
            ))}
          </TextField>
          {isFiltered(query) && (
            <Button
              variant="text"
              color="secondary"
              startIcon={<ClearOutlined />}
              onClick={() => setParams(paramsFromQuery({ ...query, search: '', status: null, brandId: null, categoryId: null, page: 0 }))}
              sx={{ alignSelf: { md: 'flex-start' }, mt: { md: 0.5 } }}
            >
              Effacer les filtres
            </Button>
          )}
        </Stack>

        <Typography variant="body2" color="text.secondary" role="status">
          {page === null ? '' : page.totalElements > 1 ? `${page.totalElements} produits` : `${page.totalElements} produit`}
        </Typography>

        <Box>
          <TableFrame
            label="Produits"
            minWidth={980}
            columns={COLUMNS}
            loading={loading}
            error={error ? errorMessage(error) : null}
            onRetry={() => void reload()}
            isEmpty={rows.length === 0}
            empty={pastTheEnd
              ? <>Cette page n’existe plus. <Button size="small" onClick={() => change({})}>Revenir à la première page</Button></>
              : isFiltered(query) ? 'Aucun produit ne correspond à ces filtres.' : 'Aucun produit pour l’instant.'}
            head={<Head sort={query.sort} onSort={(sort) => change({ sort })} />}
          >
            {rows.map((product) => <ProductRow key={product.id} product={product} />)}
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
      </Stack>
    </>
  )
}

/**
 * The status facets, as filter chips (chip-filter of the design system), each
 * with its count under the other filters. The API has no counts, so they come
 * from one-line pages, one per status.
 */
function StatusChips({ query, onChange }: { query: ProductQuery; onChange: (status: ProductStatus | null) => void }) {
  const api = useApi()
  // Seuls ces filtres changent les compteurs : changer de page ou de tri ne les recharge pas.
  const { search, brandId, categoryId } = query
  const loadCounts = useCallback(async () => {
    const pages = await Promise.all(STATUSES.map(({ status }) => api<Page<ProductSummary>>(
      productsPath({ search, status, brandId, categoryId, sort: 'updated', page: 0, size: 1 }))))
    return pages.map((page) => page.totalElements)
  }, [api, search, brandId, categoryId])
  const { data: counts } = useLoad(loadCounts)

  const chips = [
    { status: null, label: 'Tous', count: counts?.reduce((sum, count) => sum + count, 0) },
    ...STATUSES.map((entry, index) => ({ ...entry, count: counts?.[index] })),
  ]
  return (
    <Stack direction="row" spacing={1} useFlexGap role="group" aria-label="Statut" sx={{ flexWrap: 'wrap' }}>
      {chips.map((chip) => {
        const selected = query.status === chip.status
        return (
          <Chip
            key={chip.label}
            clickable
            aria-pressed={selected}
            color={selected ? 'primary' : 'default'}
            variant={selected ? 'filled' : 'outlined'}
            onClick={() => onChange(chip.status)}
            label={(
              <>
                {chip.label}
                {/* L'espace compte : sans lui, un lecteur d'ecran lirait « Tous19 ». */}
                {chip.count !== undefined && <>{' '}<Box component="span" sx={{ fontFamily: monoFont, fontSize: 12, ml: 0.5 }}>{chip.count}</Box></>}
              </>
            )}
          />
        )
      })}
    </Stack>
  )
}

/** Searches as the user types, once they pause: one request per word, not per letter. */
function SearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [text, setText] = useState(value)
  // Le bouton retour change la recherche de l'adresse : le champ la suit.
  const [shown, setShown] = useState(value)
  if (value !== shown) {
    setShown(value)
    setText(value)
  }

  useEffect(() => {
    if (text.trim() === value.trim()) return
    const timer = setTimeout(() => onChange(text), 300)
    return () => clearTimeout(timer)
  }, [text, value, onChange])

  return (
    <TextField
      size="small"
      label="Rechercher"
      placeholder="Titre, slug ou SKU"
      value={text}
      onChange={(event) => setText(event.target.value)}
      sx={{ width: { xs: '100%', md: 300 } }}
      slotProps={{
        htmlInput: { maxLength: 150 },
        input: { startAdornment: <InputAdornment position="start"><SearchOutlined fontSize="small" /></InputAdornment> },
      }}
    />
  )
}

function Head({ sort, onSort }: { sort: ProductSort; onSort: (sort: ProductSort) => void }) {
  return (
    <>
      <TableCell sortDirection={sort === 'title' ? 'asc' : false}>
        <TableSortLabel active={sort === 'title'} direction="asc" onClick={() => onSort('title')}>Produit</TableSortLabel>
      </TableCell>
      <TableCell>Marque</TableCell>
      <TableCell>Catégorie</TableCell>
      <TableCell>Statut</TableCell>
      <TableCell align="right">Variantes</TableCell>
      <TableCell align="right">Prix HT dès</TableCell>
      <TableCell align="right">Stock</TableCell>
      <TableCell sortDirection={sort === 'updated' ? 'desc' : false}>
        <TableSortLabel active={sort === 'updated'} direction="desc" onClick={() => onSort('updated')}>Modifié</TableSortLabel>
      </TableCell>
    </>
  )
}

function ProductRow({ product }: { product: ProductSummary }) {
  const outOfStock = product.variantCount > 0 && product.totalStock === 0
  return (
    <TableRow hover>
      <TableCell component="th" scope="row" sx={{ maxWidth: 320 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{product.title}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: monoFont, display: 'block' }} noWrap>
          {product.slug}
        </Typography>
      </TableCell>
      <TableCell>{product.brand.name}</TableCell>
      <TableCell>{product.category.name}</TableCell>
      <TableCell>
        <StatusBadge tone={product.status === 'PUBLIE' ? 'ok' : 'neutral'} label={statusLabel(product.status)} />
      </TableCell>
      <TableCell align="right" sx={mono}>{product.variantCount}</TableCell>
      <TableCell align="right" sx={{ ...mono, whiteSpace: 'nowrap' }}>
        {product.priceFromExclTax === null ? <Typography component="span" color="text.disabled">—</Typography> : formatPrice(product.priceFromExclTax)}
      </TableCell>
      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
          {outOfStock
            ? <StatusBadge tone="danger" label="Rupture" />
            : product.lowStock && <StatusBadge tone="neutral" label="Stock bas" />}
          <Box component="span" sx={{ ...mono, fontWeight: product.lowStock || outOfStock ? 600 : 500 }}>
            {product.totalStock}
          </Box>
        </Stack>
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>{formatDateTime(product.updatedAt)}</TableCell>
    </TableRow>
  )
}
