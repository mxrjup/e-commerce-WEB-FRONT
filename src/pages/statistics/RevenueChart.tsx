import { useState } from 'react'
import { Box, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material'
import { formatPrice } from '../../lib/format'
import { tokens, monoFont } from '../../theme'
import type { RevenuePoint } from './api'

const utcDate = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' })
const dateLabel = (date: string) => utcDate.format(new Date(`${date}T00:00:00Z`))
const amount = (value: number | null) => value === null ? 'Indisponible' : formatPrice(value)

/** A single SVG series; no financial aggregation or gap-filling happens here. */
export function RevenueChart({ curve }: { curve: RevenuePoint[] }) {
  const [metric, setMetric] = useState<'revenueInclTax' | 'revenueExclTax'>('revenueInclTax')
  const [active, setActive] = useState(0)
  const values = curve.map((point) => point[metric]).filter((value): value is number => value !== null)
  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values)
  const span = max - min || 1
  const x = (index: number) => 110 + (curve.length <= 1 ? 330 : index / (curve.length - 1) * 660)
  const y = (value: number) => 235 - (value - min) / span * 200
  const current = curve[Math.min(active, curve.length - 1)]
  const focusIndex = curve[active]?.[metric] != null ? active : curve.findIndex((point) => point[metric] !== null)
  const path = curve.map((point, index) => {
    const value = point[metric]
    if (value === null) return ''
    const command = index > 0 && curve[index - 1][metric] !== null ? 'L' : 'M'
    return `${command}${x(index)},${y(value)}`
  }).join(' ')
  const ticks = [...new Set([0, Math.floor((curve.length - 1) / 2), curve.length - 1])].filter((index) => index >= 0)
  return <Paper component="section" variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', mb: 2 }}>
      <Typography component="h2" variant="h4">Évolution des ventes</Typography>
      <TextField select label="Chiffre d’affaires affiché" value={metric} sx={{ minWidth: 230 }} onChange={(event) => setMetric(event.target.value as typeof metric)}>
        <MenuItem value="revenueInclTax">CA TTC</MenuItem><MenuItem value="revenueExclTax">CA HT</MenuItem>
      </TextField>
    </Stack>
    {curve.length === 0 ? <Typography color="text.secondary">Aucun point disponible sur cette période.</Typography> : <>
      <Box sx={{ overflowX: 'auto' }}>
        <svg viewBox="0 0 820 290" width="100%" style={{ display: 'block', minWidth: 540 }} role="group" aria-label={`Courbe du CA ${metric === 'revenueInclTax' ? 'TTC' : 'HT'} en euros, dates UTC`}>
          {[0, 0.5, 1].map((fraction) => {
            const value = min + fraction * span
            return <g key={fraction}>
              <line x1="110" x2="770" y1={y(value)} y2={y(value)} stroke={tokens.line} />
              <text x="100" y={y(value) + 5} textAnchor="end" fill={tokens.ink2} fontSize="13">{formatPrice(value)}</text>
            </g>
          })}
          <path d={path} fill="none" stroke={tokens.ink} strokeWidth="2" />
          {curve.map((point, index) => point[metric] === null ? null : <Tooltip key={point.date} title={`${dateLabel(point.date)} : ${amount(point[metric])}`} arrow>
            <circle cx={x(index)} cy={y(point[metric])} r={index === active ? 5 : 3} fill={tokens.ink}
              tabIndex={index === focusIndex ? 0 : -1} role="button" aria-label={`${dateLabel(point.date)} : ${amount(point[metric])}`}
              onFocus={() => setActive(index)} onClick={() => setActive(index)}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
                event.preventDefault()
                const direction = event.key === 'ArrowRight' ? 1 : -1
                let next = index + direction
                while (next >= 0 && next < curve.length && curve[next][metric] === null) next += direction
                const target = event.currentTarget.parentElement?.querySelectorAll<SVGCircleElement>('circle')[curve.slice(0, next).filter((p) => p[metric] !== null).length]
                if (next >= 0 && next < curve.length) { setActive(next); target?.focus() }
              }} />
          </Tooltip>)}
          {ticks.map((index) => <text key={index} x={x(index)} y="270" textAnchor={index === 0 ? 'start' : index === curve.length - 1 ? 'end' : 'middle'} fill={tokens.ink2} fontSize="14">{dateLabel(curve[index].date)}</text>)}
        </svg>
      </Box>
      {current && <Typography role="status" variant="body2" sx={{ fontFamily: monoFont, mt: 1 }}>{dateLabel(current.date)} : {amount(current[metric])}</Typography>}
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Dates UTC · Utilisez les flèches du clavier sur la courbe, ou consultez les valeurs ci-dessous.</Typography>
      <Box component="details" sx={{ mt: 2 }}>
        <Box component="summary" sx={{ cursor: 'pointer', py: 1 }}>Consulter les valeurs de la courbe</Box>
        <TableContainer sx={{ maxHeight: 320 }}>
          <Table size="small" stickyHeader aria-label="Valeurs de la courbe" sx={{ minWidth: 500 }}>
            <TableHead><TableRow><TableCell>Date UTC</TableCell><TableCell align="right">CA HT</TableCell><TableCell align="right">CA TTC</TableCell><TableCell align="right">Commandes</TableCell></TableRow></TableHead>
            <TableBody>{curve.map((point) => <TableRow key={point.date}>
              <TableCell component="th" scope="row">{dateLabel(point.date)}</TableCell>
              <TableCell align="right" sx={{ fontFamily: monoFont }}>{amount(point.revenueExclTax)}</TableCell>
              <TableCell align="right" sx={{ fontFamily: monoFont }}>{amount(point.revenueInclTax)}</TableCell>
              <TableCell align="right" sx={{ fontFamily: monoFont }}>{point.orderCount.toLocaleString('fr-FR')}</TableCell>
            </TableRow>)}</TableBody>
          </Table>
        </TableContainer>
      </Box>
    </>}
  </Paper>
}
