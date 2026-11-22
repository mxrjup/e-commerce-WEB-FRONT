import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../../App'
import { routes } from '../../routes'
import { fakeApi } from '../../test/fakeApi'
import { fakeAuth, renderRoutes, renderWithAuth } from '../../test/renderWithAuth'
import { formatPrice } from '../../lib/format'
import { StatisticsPage } from './StatisticsPage'
import { presetPeriod, periodQuery } from './period'
import type { OrderStats } from './api'

const stats: OrderStats = {
  from: '2026-11-01T00:00:00Z', to: '2026-12-01T00:00:00Z', granularity: 'DAY', ranking: 'QUANTITY',
  revenueExclTax: 100, revenueInclTax: 125, orderCount: 1, averageBasket: 125,
  margin: 40, knownMargin: 40, marginComplete: true, revenueComplete: true, topProductsComplete: true,
  curve: [{ date: '2026-11-01', revenueExclTax: 100, revenueInclTax: 125, orderCount: 1 }],
  topProducts: [{ productId: 42, quantity: 2, revenueExclTax: 100 }], alerts: [],
}
function gateway(data: OrderStats = stats, productStatus = 200) {
  return fakeApi((call) => call.path.startsWith('/api/admin/orders/stats?') ? { status: 200, body: data }
    : call.path === '/api/admin/catalog/products/42' ? { status: productStatus, body: { title: 'Table en chêne' } } : undefined)
}
const renderPage = () => renderWithAuth(<StatisticsPage />, fakeAuth(['collaborator']))
async function select(label: string, option: string) {
  await userEvent.click(screen.getByRole('combobox', { name: label }))
  await userEvent.click(await screen.findByRole('option', { name: option }))
}
const params = (path: string) => new URL(path, 'http://localhost').searchParams

describe('StatisticsPage', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

  it('loads through the authenticated API, renders backend KPIs and resolves product names', async () => {
    const api = gateway()
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Chargement')
    expect(await screen.findByText('Table en chêne')).toBeInTheDocument()
    for (const [label, value] of [['CA TTC', 125], ['CA HT', 100], ['Panier moyen', 125], ['Marge', 40]] as const) {
      expect(within(screen.getByRole('region', { name: label })).getByText(formatPrice(value), { normalizer: (text) => text })).toBeInTheDocument()
    }
    expect(within(screen.getByRole('region', { name: 'Commandes' })).getByText('1')).toBeInTheDocument()
    const initial = params(api.calls[0].path)
    const period = periodQuery(presetPeriod('thirty'), 'DAY')
    expect(period.error).toBeNull()
    if (period.error === null) {
      expect(initial.get('from')).toBe(period.from)
      expect(initial.get('to')).toBe(period.to)
    }
    expect(initial.get('granularity')).toBe('DAY')
    expect(initial.get('ranking')).toBe('QUANTITY')
    const fetch = vi.mocked(globalThis.fetch)
    expect(new Headers(fetch.mock.calls[0][1]?.headers).get('Authorization')).toBe('Bearer token-123')
  })

  it('reloads for presets, granularity, ranking and inclusive custom dates', async () => {
    const api = gateway()
    renderPage()
    await screen.findByText('Table en chêne')
    await userEvent.click(screen.getByRole('button', { name: '7 derniers jours' }))
    await screen.findByText('Table en chêne')
    await select('Granularité', 'Semaine')
    await screen.findByText('Table en chêne')
    await select('Classement du top 5', 'Chiffre d’affaires HT')
    await screen.findByText('Table en chêne')
    await userEvent.click(screen.getByRole('button', { name: 'Période personnalisée' }))
    fireEvent.change(screen.getByLabelText('Date de début'), { target: { value: '2026-01-01' } })
    fireEvent.change(screen.getByLabelText('Date de fin incluse'), { target: { value: '2026-01-31' } })
    await screen.findByText('Table en chêne')
    const calls = api.calls.filter((call) => call.path.includes('/stats?')).map((call) => params(call.path))
    expect(calls.some((query) => query.get('from')?.startsWith(presetPeriod('seven').start))).toBe(true)
    expect(calls.some((query) => query.get('granularity') === 'WEEK')).toBe(true)
    expect(calls.at(-1)?.get('ranking')).toBe('REVENUE')
    expect(calls.at(-1)?.get('from')).toBe('2026-01-01T00:00:00.000Z')
    expect(calls.at(-1)?.get('to')).toBe('2026-02-01T00:00:00.000Z')
    await select('Granularité', 'Mois')
    await waitFor(() => expect(params(api.calls.filter((c) => c.path.includes('/stats?')).at(-1)!.path).get('granularity')).toBe('MONTH'))
  })

  it('blocks invalid and excessive periods before calling the API', async () => {
    const api = gateway()
    renderPage()
    await screen.findByText('Table en chêne')
    await userEvent.click(screen.getByRole('button', { name: 'Période personnalisée' }))
    const count = api.calls.length
    fireEvent.change(screen.getByLabelText('Date de début'), { target: { value: '9999-01-01' } })
    expect(screen.getByRole('alert')).toHaveTextContent('période valide')
    expect(api.calls).toHaveLength(count)
    fireEvent.change(screen.getByLabelText('Date de début'), { target: { value: '2000-01-01' } })
    expect(screen.getByRole('alert')).toHaveTextContent('1 000 points')
    expect(api.calls).toHaveLength(count)
  })

  it('marks partial values and translates all alerts without inventing a total margin', async () => {
    gateway({ ...stats, margin: null, marginComplete: false, revenueComplete: false, topProductsComplete: false,
      alerts: ['PENDING_PAYMENT', 'MISSING_ORDER_TOTALS', 'MISSING_PURCHASE_PRICE', 'UNRESOLVED_PRODUCT_VARIANTS', 'CATALOG_UNAVAILABLE', 'FUTURE_CODE'].map((code) => ({ code, count: 3 })) })
    renderPage()
    await screen.findByText('Table en chêne')
    expect(within(screen.getByRole('region', { name: 'Marge' })).getByText('Indisponible')).toBeInTheDocument()
    expect(screen.getByText(/Marge connue uniquement/)).toHaveTextContent('40,00')
    expect(screen.getByText(/courbe peuvent être incomplets/)).toBeInTheDocument()
    expect(screen.getByText(/classement est potentiellement incomplet/)).toBeInTheDocument()
    for (const text of ['Commandes en attente de paiement', 'Totaux de commandes manquants', 'Prix d’achat manquants', 'Variantes non associées', 'Catalogue temporairement indisponible', 'FUTURE_CODE']) {
      expect(screen.getByText(new RegExp(text))).toHaveTextContent('3')
    }
  })

  it('shows genuine zero totals and empty lists', async () => {
    gateway({ ...stats, revenueExclTax: 0, revenueInclTax: 0, orderCount: 0, averageBasket: 0, margin: 0, knownMargin: 0, curve: [], topProducts: [] })
    renderPage()
    expect(await screen.findByText('Aucune vente sur cette période.')).toBeInTheDocument()
    expect(screen.getByText('Aucun produit vendu sur cette période.')).toBeInTheDocument()
    expect(screen.getByText('Aucun point disponible sur cette période.')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'CA TTC' })).getByText(formatPrice(0), { normalizer: (text) => text })).toBeInTheDocument()
    expect(screen.getByText('Aucune alerte sur cette période.')).toBeInTheDocument()
  })

  it('retains product identification when the catalogue fails', async () => {
    gateway(stats, 503)
    renderPage()
    expect(await screen.findByText('Produit #42')).toBeInTheDocument()
  })

  it('does not turn unavailable amounts into zeros', async () => {
    gateway({ ...stats, revenueInclTax: null, averageBasket: null, margin: null, topProducts: [] })
    renderPage()
    for (const name of ['CA TTC', 'Panier moyen', 'Marge']) {
      expect(within(await screen.findByRole('region', { name })).getByText('Indisponible')).toBeInTheDocument()
    }
  })

  it('explains a network failure and offers retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de joindre le serveur')
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  })

  it.each([400, 401, 403, 500])('handles HTTP %s and retries', async (status) => {
    let failed = true
    fakeApi(() => failed ? { status, body: { message: 'Request rejected' } } : { status: 200, body: { ...stats, topProducts: [] } })
    renderPage()
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'CA TTC' })).not.toBeInTheDocument()
    failed = false
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(await screen.findByRole('region', { name: 'CA TTC' })).toBeInTheDocument()
  })

  it('ignores a slow obsolete response after filters change', async () => {
    let resolveOld!: (response: Response) => void
    let calls = 0
    vi.stubGlobal('fetch', vi.fn(() => ++calls === 1 ? new Promise<Response>((resolve) => { resolveOld = resolve })
      : Promise.resolve(new Response(JSON.stringify({ ...stats, revenueInclTax: 222, topProducts: [] })))))
    renderPage()
    await waitFor(() => expect(calls).toBe(1))
    const obsoleteSignal = vi.mocked(globalThis.fetch).mock.calls[0][1]?.signal
    await userEvent.click(screen.getByRole('button', { name: 'Aujourd’hui' }))
    expect(obsoleteSignal?.aborted).toBe(true)
    const card = await screen.findByRole('region', { name: 'CA TTC' })
    expect(within(card).getByText(formatPrice(222), { normalizer: (text) => text })).toBeInTheDocument()
    await act(async () => resolveOld(new Response(JSON.stringify(stats))))
    expect(within(card).getByText(formatPrice(222), { normalizer: (text) => text })).toBeInTheDocument()
  })

  it.each(['admin', 'collaborator'])('keeps the statistics route accessible to %s', async (role) => {
    gateway()
    renderRoutes(routes(), '/statistics', fakeAuth([role]))
    expect(await screen.findByText('Table en chêne')).toBeInTheDocument()
  })

  it('denies a customer at the existing back-office guard without requesting statistics', () => {
    const api = gateway()
    window.history.replaceState({}, '', '/statistics')
    renderWithAuth(<App />, fakeAuth(['client']))
    expect(screen.getByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument()
    expect(api.calls).toHaveLength(0)
    window.history.replaceState({}, '', '/')
  })
})
