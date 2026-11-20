import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../routes'
import { fakeApi, on } from '../../test/fakeApi'
import { fakeAuth, renderRoutes } from '../../test/renderWithAuth'

const PATH = '/api/admin/store-settings'
const settings = {
  storeName: 'log', contactEmail: 'contact@log.test', contactPhone: null, supportHours: null, postalAddress: null,
  companyName: 'log SAS', siret: null, vatNumber: null, legalNotice: null, termsUrl: null, privacyPolicyUrl: null,
  standardShippingFee: 4.99, expressShippingFee: 9.99, freeShippingThreshold: 50, minimumOrderAmount: 10,
  currency: 'EUR', updatedAt: '2026-11-18T10:00:00Z',
}

describe('the shop settings (U08)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows amounts the French way, and saves only what changed, as the API expects it', async () => {
    const api = fakeApi(
      on('PUT', PATH, 200, { ...settings, standardShippingFee: 5.9, siret: '73282932000074' }),
      on('GET', PATH, 200, settings),
    )
    renderRoutes(routes(), '/settings', fakeAuth(['collaborator', 'admin']))

    const fee = await screen.findByRole('textbox', { name: 'Livraison standard' })
    expect(fee).toHaveValue('4,99')
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()

    await userEvent.clear(fee)
    await userEvent.type(fee, '5,9')
    await userEvent.type(screen.getByRole('textbox', { name: 'SIRET' }), '732 829 320 00074')
    expect(screen.getByText('Modifications non enregistrées.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByText('Paramètres enregistrés.')).toBeInTheDocument()
    expect(api.writes()[0].body).toMatchObject({ standardShippingFee: 5.9, siret: '73282932000074', currency: 'EUR', contactPhone: null })
    expect(screen.getByRole('textbox', { name: 'Livraison standard' })).toHaveValue('5,90')
    expect(screen.getByText('Tout est enregistré.')).toBeInTheDocument()
  })

  it('says why the settings did not load, and loads them again on retry', async () => {
    let attempts = 0
    fakeApi((call) => {
      if (call.method !== 'GET' || call.path !== PATH) return undefined
      attempts += 1
      return attempts === 1 ? { status: 503, body: { status: 503, message: 'Service unavailable' } } : { status: 200, body: settings }
    })
    renderRoutes(routes(), '/settings', fakeAuth(['collaborator', 'admin']))

    const retry = await screen.findByRole('button', { name: 'Réessayer' })
    expect(screen.queryByRole('textbox', { name: 'Livraison standard' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()

    await userEvent.click(retry)
    expect(await screen.findByRole('textbox', { name: 'Livraison standard' })).toHaveValue('4,99')
    expect(screen.queryByRole('button', { name: 'Réessayer' })).not.toBeInTheDocument()
    expect(attempts).toBe(2)
  })

  it('refuses what the API would refuse, and puts the cursor on it', async () => {
    const api = fakeApi(on('GET', PATH, 200, settings))
    renderRoutes(routes(), '/settings', fakeAuth(['collaborator', 'admin']))

    const fee = await screen.findByRole('textbox', { name: 'Livraison express' })
    await userEvent.clear(fee)
    await userEvent.type(fee, '9,999')
    const terms = screen.getByRole('textbox', { name: 'Adresse des CGV' })
    await userEvent.type(terms, 'cgv.html')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(screen.getByText('Deux décimales au maximum.')).toBeInTheDocument()
    expect(screen.getByText(/pas une adresse web complète/)).toBeInTheDocument()
    // Le premier champ a corriger dans l'ordre de la page : les CGV viennent avant la livraison.
    await waitFor(() => expect(terms).toHaveFocus())
    expect(api.writes()).toEqual([])
  })

  it('asks before leaving with unsaved changes', async () => {
    fakeApi(on('GET', PATH, 200, settings), () => ({ status: 200, body: [] }))
    renderRoutes(routes(), '/settings', fakeAuth(['collaborator', 'admin']))

    await userEvent.type(await screen.findByRole('textbox', { name: 'Téléphone' }), '01 23 45 67 89')
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }))
    await userEvent.click(screen.getByRole('link', { name: /Référentiels/ }))

    expect(await screen.findByRole('dialog', { name: 'Quitter sans enregistrer ?' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Quitter sans enregistrer' }))
    expect(await screen.findByRole('heading', { name: 'Référentiels' })).toBeInTheDocument()
  })

  it('is for admins only, like the API', async () => {
    renderRoutes(routes(), '/settings', fakeAuth(['collaborator']))
    expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument()
  })
})
