import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from './App'
import { routes } from './routes'
import { fakeAuth, renderRoutes, renderWithAuth } from './test/renderWithAuth'

describe('the back-office', () => {
  it('greets a collaborator and lists the screens of their menu', async () => {
    renderRoutes(routes(), '/', fakeAuth(['client', 'collaborator']))

    expect(await screen.findByRole('heading', { name: 'Bonjour Marie Martin' })).toBeInTheDocument()
    // jsdom n'a pas de grand ecran : le menu est le tiroir des petits ecrans, qu'on ouvre.
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }))
    const menu = await screen.findByRole('navigation', { name: 'Menu principal' })
    expect(within(menu).getByRole('link', { name: /Produits/ })).toHaveAttribute('href', '/products')
    expect(within(menu).queryByRole('link', { name: /Accès MCP/ })).not.toBeInTheDocument()
    expect(screen.getByText('Collaborateur')).toBeInTheDocument()
  })

  it('shows the task and its owner on a screen not delivered yet', async () => {
    renderRoutes(routes(), '/orders', fakeAuth(['collaborator']))

    expect(await screen.findByRole('heading', { name: 'Commandes' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'O13 (#37)' }))
      .toHaveAttribute('href', 'https://github.com/mxrjup/e-commerce-BACK/issues/37')
    expect(screen.getByText(/YoanBst/)).toBeInTheDocument()
  })

  it('refuses an admin page to a collaborator who types its address', async () => {
    renderRoutes(routes(), '/mcp', fakeAuth(['collaborator']))

    expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument()
    expect(screen.getByText('Cette page est réservée aux administrateurs.')).toBeInTheDocument()
  })

  it('opens the admin pages to an admin', async () => {
    renderRoutes(routes(), '/mcp', fakeAuth(['collaborator', 'admin']))

    expect(await screen.findByRole('heading', { name: 'Accès MCP' })).toBeInTheDocument()
    expect(screen.getByText('Administrateur')).toBeInTheDocument()
  })

  it('answers an unknown address with a page, not a blank screen', async () => {
    renderRoutes(routes(), '/nulle-part', fakeAuth(['collaborator']))

    expect(await screen.findByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument()
  })

  it('signs out from the top bar', async () => {
    const auth = fakeAuth(['collaborator'])
    renderRoutes(routes(), '/', auth)

    await userEvent.click(await screen.findByRole('button', { name: 'Se déconnecter' }))

    expect(auth.logout).toHaveBeenCalledOnce()
  })

  it('stops a customer account at the door, with a way to change account', async () => {
    const auth = fakeAuth(['client'])
    renderWithAuth(<App />, auth)

    expect(screen.getByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }))
    expect(auth.logout).toHaveBeenCalledOnce()
  })
})
