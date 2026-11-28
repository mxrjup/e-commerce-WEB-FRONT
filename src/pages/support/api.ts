import type { Translation } from '../../api/errors'
import { json, type Api } from '../../api/useApi'

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED'

export type TicketCategory =
  | 'ORDER'
  | 'DELIVERY'
  | 'RETURN_REFUND'
  | 'PRODUCT'
  | 'ACCOUNT'
  | 'OTHER'

export type MessageAuthorRole = 'CUSTOMER' | 'AGENT'

export type AdminTicketSummary = {
  id: number
  userId: number | null
  userSubject: string
  subject: string
  category: TicketCategory
  status: TicketStatus
  orderId: number | null
  orderNumber: string | null
  messageCount: number
  createdAt: string
  updatedAt: string
}

export type TicketMessage = {
  id: number
  authorRole: MessageAuthorRole
  content: string
  createdAt: string
}

export type AdminTicketDetail = {
  id: number
  userId: number | null
  userSubject: string
  subject: string
  category: TicketCategory
  status: TicketStatus
  orderId: number | null
  orderNumber: string | null
  createdAt: string
  updatedAt: string
  messages: TicketMessage[]
}

export type AdminReplyRequest = {
  content: string
  status?: TicketStatus | null
}

export function adminSupportApi(api: Api) {
  return {
    list: (params: { status?: TicketStatus | null; category?: TicketCategory | null } = {}) => {
      const query = new URLSearchParams()
      if (params.status) query.set('status', params.status)
      if (params.category) query.set('category', params.category)
      const qs = query.toString()
      return api<AdminTicketSummary[]>(`/api/admin/support/tickets${qs ? `?${qs}` : ''}`)
    },
    get: (ticketId: number) => api<AdminTicketDetail>(`/api/admin/support/tickets/${ticketId}`),
    reply: (ticketId: number, request: AdminReplyRequest) =>
      api<AdminTicketDetail>(`/api/admin/support/tickets/${ticketId}/reply`, json('POST', request)),
    updateStatus: (ticketId: number, status: TicketStatus) =>
      api<AdminTicketDetail>(`/api/admin/support/tickets/${ticketId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  }
}

export const TICKET_STATUSES: readonly TicketStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_CUSTOMER',
  'RESOLVED',
  'CLOSED',
]

export const TICKET_CATEGORIES: readonly TicketCategory[] = [
  'ORDER',
  'DELIVERY',
  'RETURN_REFUND',
  'PRODUCT',
  'ACCOUNT',
  'OTHER',
]

const STATUS_PRESENTATION: Record<TicketStatus, { label: string; tone: 'ok' | 'neutral' | 'danger' }> = {
  OPEN: { label: 'Ouvert', tone: 'danger' },
  IN_PROGRESS: { label: 'En cours', tone: 'neutral' },
  WAITING_CUSTOMER: { label: 'En attente client', tone: 'neutral' },
  RESOLVED: { label: 'Résolu', tone: 'ok' },
  CLOSED: { label: 'Clôturé', tone: 'neutral' },
}

export function ticketStatusPresentation(status: TicketStatus): { label: string; tone: 'ok' | 'neutral' | 'danger' } {
  return STATUS_PRESENTATION[status] ?? { label: status, tone: 'neutral' }
}

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  ORDER: 'Commande',
  DELIVERY: 'Livraison',
  RETURN_REFUND: 'Retour & remboursement',
  PRODUCT: 'Produit',
  ACCOUNT: 'Compte client',
  OTHER: 'Autre demande',
}

export function ticketCategoryLabel(category: TicketCategory): string {
  return CATEGORY_LABELS[category] ?? category
}

export function validateAdminReply(content: string): string | null {
  const trimmed = content.trim()
  if (!trimmed) return 'Saisissez une réponse avant d’envoyer.'
  if (trimmed.length > 5000) return 'La réponse ne doit pas dépasser 5 000 caractères.'
  return null
}

export function sortMessagesChronologically(messages: readonly TicketMessage[]): TicketMessage[] {
  return [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

export const translations: Translation[] = [
  [/^Ticket SAV introuvable/, () => 'Ce ticket SAV n’existe plus ou est introuvable.'],
  [/^Impossible de répondre à un ticket clôturé/, () => 'Ce ticket est clôturé : rouvrez-le avant d’envoyer une réponse.'],
]