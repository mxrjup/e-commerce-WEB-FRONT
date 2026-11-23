import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithAuth, fakeAuth } from '../../test/renderWithAuth'
import { RevenueChart } from './RevenueChart'

describe('RevenueChart', () => {
  it('switches HT/TTC and exposes exact values by keyboard and tooltip', async () => {
    renderWithAuth(<RevenueChart curve={[
      { date: '2026-11-01', revenueExclTax: 100, revenueInclTax: 120, orderCount: 1 },
      { date: '2026-11-02', revenueExclTax: 200, revenueInclTax: 240, orderCount: 2 },
    ]} />, fakeAuth(['admin']))
    const first = screen.getByRole('button', { name: /1 nov.*120,00/ })
    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowRight' })
    expect(screen.getByRole('button', { name: /2 nov.*240,00/ })).toHaveFocus()
    expect(screen.getByRole('status')).toHaveTextContent('240,00')
    await userEvent.hover(screen.getByRole('button', { name: /2 nov.*240,00/ }))
    expect(await screen.findByRole('tooltip')).toHaveTextContent('240,00')
    await userEvent.click(screen.getByRole('combobox', { name: 'Chiffre d’affaires affiché' }))
    await userEvent.click(await screen.findByRole('option', { name: 'CA HT' }))
    expect(screen.getByRole('group', { name: /Courbe du CA HT/ })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('200,00')
  })

  it('renders known zeros, negative amounts and unavailable points without a false zero', () => {
    renderWithAuth(<RevenueChart curve={[
      { date: '2026-11-01', revenueExclTax: null, revenueInclTax: null, orderCount: 1 },
      { date: '2026-11-02', revenueExclTax: 0, revenueInclTax: 0, orderCount: 0 },
      { date: '2026-11-03', revenueExclTax: -10, revenueInclTax: -12, orderCount: 1 },
    ]} />, fakeAuth(['admin']))
    expect(screen.queryByRole('button', { name: /1 nov/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /2 nov.*0,00/ })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('button', { name: /3 nov.*-12,00/ })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Indisponible')
  })
})
