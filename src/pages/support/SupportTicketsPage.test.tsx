import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../routes'
import { fakeApi, on } from '../../test/fakeApi'
import { fakeAuth, renderRoutes } from '../../test/renderWithAuth'
import { validateAdminReply } from './api'

const openTicket = {
  id: 42,
  userId: 12,
  userSubject: 'sub-alice',
  subject: 'Colis reçu endommagé',
  category: 'DELIVERY' as const,
  status: 'OPEN' as const,
  orderId: 101,
  orderNumber: 'CMD-2026-000101',
  messageCount: 1,
  createdAt: '2026-11-10T09:00:00Z',
  updatedAt: '2026-11-10T09:00:00Z',
}

const resolvedTicket = {
  id: 43,
  userId: 15,
  userSubject: 'sub-bob',
  subject: 'Facture manquante',
  category: 'ORDER' as const,
  status: 'RESOLVED' as const,
  orderId: 105,
  orderNumber: 'CMD-2026-000105',
  messageCount: 2,
  createdAt: '2026-11-08T14:00:00Z',
  updatedAt: '2026-11-09T16:30:00Z',
}

const openTicketDetail = {
  ...openTicket,
  messages: [
    {
      id: 1,
      authorRole: 'CUSTOMER' as const,
      content: 'Le carton était ouvert à la livraison.',
      createdAt: '2026-11-10T09:00:00Z',
    },
  ],
}

function open(path = '/support') {
  return renderRoutes(routes(), path, fakeAuth(['collaborator']))
}

describe('the SAV support screens (S05)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists tickets and filters by status through the admin support API', async () => {
    fakeApi(
      on('GET', '/api/admin/support/tickets', 200, [openTicket, resolvedTicket]),
      on('GET', '/api/admin/support/tickets?status=OPEN', 200, [openTicket]),
    )
    open()

    expect(await screen.findByText('Colis reçu endommagé')).toBeInTheDocument()
    expect(screen.getByText('Facture manquante')).toBeInTheDocument()
    expect(screen.getByText('2 tickets')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Ouvert' }))

    expect(await screen.findByText('1 ticket')).toBeInTheDocument()
    expect(screen.queryByText('Facture manquante')).not.toBeInTheDocument()
  })

  it('opens a ticket, sends an agent reply, and closes the ticket after confirmation', async () => {
    const repliedDetail = {
      ...openTicketDetail,
      status: 'WAITING_CUSTOMER' as const,
      updatedAt: '2026-11-10T10:15:00Z',
      messages: [
        ...openTicketDetail.messages,
        {
          id: 2,
          authorRole: 'AGENT' as const,
          content: 'Nous venons d’expédier un colis de remplacement.',
          createdAt: '2026-11-10T10:15:00Z',
        },
      ],
    }
    const closedDetail = {
      ...repliedDetail,
      status: 'CLOSED' as const,
    }

    const api = fakeApi(
      on('GET', '/api/admin/support/tickets', 200, [openTicket]),
      on('GET', '/api/admin/support/tickets/42', 200, openTicketDetail),
      on('POST', '/api/admin/support/tickets/42/reply', 201, repliedDetail),
      on('PATCH', '/api/admin/support/tickets/42/status', 200, closedDetail),
    )
    open()

    await userEvent.click(await screen.findByRole('button', { name: 'Ouvrir le ticket #42' }))

    expect(await screen.findByRole('heading', { name: '#42 · Colis reçu endommagé' })).toBeInTheDocument()
    expect(screen.getByText('Le carton était ouvert à la livraison.')).toBeInTheDocument()

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Votre réponse' }),
      'Nous venons d’expédier un colis de remplacement.',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer la réponse' }))

    expect(await screen.findByText('Nous venons d’expédier un colis de remplacement.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Clôturer le ticket' }))
    const dialog = await screen.findByRole('dialog', { name: 'Clôturer ce ticket SAV ?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Clôturer le ticket' }))

    expect(await screen.findByText(/Ce ticket est clôturé : l’envoi de nouvelles réponses est verrouillé/)).toBeInTheDocument()
    expect(api.writes()).toEqual([
      {
        method: 'POST',
        path: '/api/admin/support/tickets/42/reply',
        body: { content: 'Nous venons d’expédier un colis de remplacement.', status: null },
      },
      {
        method: 'PATCH',
        path: '/api/admin/support/tickets/42/status',
        body: { status: 'CLOSED' },
      },
    ])
  })
})

describe('validateAdminReply', () => {
  it('rejects empty or oversized replies', () => {
    expect(validateAdminReply('   ')).toBe('Saisissez une réponse avant d’envoyer.')
    expect(validateAdminReply('a'.repeat(5001))).toMatch(/5 000 caractères/)
    expect(validateAdminReply('Bonjour, voici votre suivi.')).toBeNull()
  })
})