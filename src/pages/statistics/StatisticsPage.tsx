import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, CircularProgress, MenuItem, Paper, Stack, TableCell, TableRow, TextField, Typography } from '@mui/material'
import { useApi } from '../../api/useApi'
import { useLoad } from '../../api/useLoad'
import { errorMessage } from '../../api/errors'
import { PageHeader } from '../../components/PageHeader'
import { TableFrame } from '../../components/TableFrame'
import { formatPrice } from '../../lib/format'
import { monoFont } from '../../theme'
import { productPath, type ProductDetail } from '../products/api'
import { statsPath, type Granularity, type OrderStats, type Ranking } from './api'
import { periodQuery, presetPeriod, type Preset } from './period'
import { RevenueChart } from './RevenueChart'

const presets: { value: Preset; label: string }[] = [
  { value: 'today', label: 'Aujourd’hui' }, { value: 'seven', label: '7 derniers jours' },
  { value: 'thirty', label: '30 derniers jours' }, { value: 'month', label: 'Ce mois' },
  { value: 'custom', label: 'Période personnalisée' },
]
const alertLabels: Record<string, string> = {
  PENDING_PAYMENT: 'Commandes en attente de paiement',
  MISSING_ORDER_TOTALS: 'Totaux de commandes manquants',
  MISSING_PURCHASE_PRICE: 'Prix d’achat manquants',
  UNRESOLVED_PRODUCT_VARIANTS: 'Variantes non associées à un produit',
  CATALOG_UNAVAILABLE: 'Catalogue temporairement indisponible',
}
const money = (value: number | null | undefined) => value == null ? 'Indisponible' : formatPrice(value)
const number = (value: number) => value.toLocaleString('fr-FR')

export function StatisticsPage() {
  const [preset, setPreset] = useState<Preset>('thirty')
  const [period, setPeriod] = useState(() => presetPeriod('thirty'))
  const [granularity, setGranularity] = useState<Granularity>('DAY')
  const [ranking, setRanking] = useState<Ranking>('QUANTITY')
  const query = periodQuery(period, granularity)
  const path = query.error === null ? statsPath(query.from, query.to, granularity, ranking) : null
  return <>
    <PageHeader title="Statistiques" description="Les ventes de la période, selon la date de création des commandes." />
    <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {presets.map((item) => <Button key={item.value} variant={preset === item.value ? 'contained' : 'outlined'}
            aria-pressed={preset === item.value} onClick={() => {
              setPreset(item.value)
              if (item.value !== 'custom') setPeriod(presetPeriod(item.value))
            }}>{item.label}</Button>)}
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {preset === 'custom' && <>
            <TextField label="Date de début" type="date" value={period.start} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: '0001-01-01', max: '9999-12-30' } }}
              onChange={(event) => setPeriod({ ...period, start: event.target.value })} />
            <TextField label="Date de fin incluse" type="date" value={period.end} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: period.start, max: '9999-12-30' } }}
              onChange={(event) => setPeriod({ ...period, end: event.target.value })} />
          </>}
          <TextField select label="Granularité" value={granularity} sx={{ minWidth: 160 }} onChange={(event) => setGranularity(event.target.value as Granularity)}>
            <MenuItem value="DAY">Jour</MenuItem><MenuItem value="WEEK">Semaine</MenuItem><MenuItem value="MONTH">Mois</MenuItem>
          </TextField>
          <TextField select label="Classement du top 5" value={ranking} sx={{ minWidth: 220 }} onChange={(event) => setRanking(event.target.value as Ranking)}>
            <MenuItem value="QUANTITY">Quantité vendue</MenuItem><MenuItem value="REVENUE">Chiffre d’affaires HT</MenuItem>
          </TextField>
        </Box>
        <Typography variant="body2" color="text.secondary">Du {period.start} au {period.end} inclus · Dates et regroupements en UTC. Les semaines commencent le lundi.</Typography>
        {query.error && <Alert severity="error">{query.error}</Alert>}
      </Stack>
    </Paper>
    {path && <StatisticsResults key={path} path={path} />}
  </>
}

/** Remount per query: old responses and old totals cannot appear under new filters. */
function StatisticsResults({ path }: { path: string }) {
  const api = useApi()
  const request = useRef<AbortController | null>(null)
  const load = useCallback(() => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    return api<OrderStats>(path, { signal: controller.signal })
  }, [api, path])
  useEffect(() => () => request.current?.abort(), [])
  const { data, loading, error, reload } = useLoad(load)
  if (loading) return <Stack role="status" direction="row" spacing={2} sx={{ py: 5 }}><CircularProgress size={24} /><Typography>Chargement des statistiques…</Typography></Stack>
  if (error) return <Alert severity="error" action={<Button color="inherit" onClick={() => void reload()}>Réessayer</Button>}>{errorMessage(error)}</Alert>
  if (!data) return null
  const cards = [
    { title: 'CA TTC', value: money(data.revenueInclTax), partial: !data.revenueComplete },
    { title: 'CA HT', value: money(data.revenueExclTax), partial: !data.revenueComplete },
    { title: 'Commandes', value: data.orderCount == null ? 'Indisponible' : number(data.orderCount) },
    { title: 'Panier moyen', value: money(data.averageBasket), partial: !data.revenueComplete },
    { title: 'Marge', value: data.marginComplete ? money(data.margin) : 'Indisponible', partial: !data.marginComplete },
  ]
  return <Stack spacing={3}>
    {data.orderCount === 0 && <Alert severity="info">Aucune vente sur cette période.</Alert>}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
      {cards.map((card) => <Paper component="section" aria-label={card.title} variant="outlined" key={card.title} sx={{ p: 3 }}>
        <Typography component="h2" variant="body2" color="text.secondary">{card.title}</Typography>
        <Typography sx={{ fontFamily: monoFont, fontSize: { xs: 24, md: 28 }, mt: 1 }}>{card.value}</Typography>
        {card.partial && <Typography variant="body2">Données incomplètes</Typography>}
      </Paper>)}
    </Box>
    {!data.revenueComplete && <Alert severity="warning">Le chiffre d’affaires, le panier moyen et la courbe peuvent être incomplets : certains totaux de commandes manquent.</Alert>}
    <RevenueChart curve={data.curve} />
    <TopProducts products={data.topProducts} complete={data.topProductsComplete} />
    <Paper component="section" variant="outlined" sx={{ p: 3 }}>
      <Typography component="h2" variant="h4" sx={{ mb: 2 }}>Alertes et données incomplètes</Typography>
      <Stack spacing={1}>
        {!data.marginComplete && <Alert severity="warning">La marge totale est indisponible. Marge connue uniquement sur les lignes calculables : {money(data.knownMargin)}.</Alert>}
        {data.alerts.map((alert) => <Alert severity={alert.code === 'PENDING_PAYMENT' ? 'info' : 'warning'} key={alert.code}>
          {alertLabels[alert.code] ?? `Alerte statistique (${alert.code})`} : {number(alert.count)}
        </Alert>)}
        {data.alerts.length === 0 && data.marginComplete && data.revenueComplete && data.topProductsComplete && <Typography variant="body2" color="text.secondary">Aucune alerte sur cette période.</Typography>}
      </Stack>
    </Paper>
  </Stack>
}

function TopProducts({ products, complete }: { products: OrderStats['topProducts']; complete: boolean }) {
  const api = useApi()
  const [names, setNames] = useState<Record<number, string>>({})
  useEffect(() => {
    const controller = new AbortController()
    for (const product of products) {
      void api<ProductDetail>(productPath(product.productId), { signal: controller.signal })
        .then((detail) => {
          if (!controller.signal.aborted) setNames((previous) => ({ ...previous, [product.productId]: detail.title }))
        }).catch(() => { /* Deleted products or catalog outage retain their explicit ID. */ })
    }
    return () => controller.abort()
  }, [api, products])
  return <Stack component="section" spacing={2}>
    <Typography component="h2" variant="h4">Top 5 des produits</Typography>
    {!complete && <Alert severity="warning">Le classement est potentiellement incomplet : certains produits n’ont pas pu être identifiés.</Alert>}
    <TableFrame label="Top 5 des produits" columns={4} loading={false} error={null} onRetry={() => {}} isEmpty={products.length === 0}
      empty={complete ? 'Aucun produit vendu sur cette période.' : 'Aucun produit identifiable sur cette période.'} minWidth={560}
      head={<><TableCell>Position</TableCell><TableCell>Produit</TableCell><TableCell align="right">Quantité vendue</TableCell><TableCell align="right">CA HT</TableCell></>}>
      {products.map((product, index) => <TableRow key={product.productId}>
        <TableCell>{index + 1}</TableCell><TableCell component="th" scope="row">{names[product.productId] ?? `Produit #${product.productId}`}</TableCell>
        <TableCell align="right" sx={{ fontFamily: monoFont }}>{number(product.quantity)}</TableCell>
        <TableCell align="right" sx={{ fontFamily: monoFont }}>{money(product.revenueExclTax)}</TableCell>
      </TableRow>)}
    </TableFrame>
  </Stack>
}
