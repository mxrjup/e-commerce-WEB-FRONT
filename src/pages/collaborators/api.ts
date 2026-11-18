import type { Translation } from '../../api/errors'
import { json, type Api } from '../../api/useApi'

/**
 * The back-office accounts (U04), kept in Keycloak by user-service:
 * /api/admin/users/collaborators, reserved to admins by the gateway.
 */
export type CollaboratorRole = 'collaborator' | 'admin'

export type Collaborator = {
  /** The Keycloak id, the `sub` of the account's tokens. */
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: CollaboratorRole
  enabled: boolean
  createdAt: string | null
}

export type CreateCollaboratorRequest = {
  email: string
  firstName: string
  lastName: string
  role: CollaboratorRole
  temporaryPassword: string
}

export const ROLES: { value: CollaboratorRole; label: string; help: string }[] = [
  { value: 'collaborator', label: 'Collaborateur', help: 'Le catalogue, les commandes, les clients et le SAV.' },
  { value: 'admin', label: 'Administrateur', help: 'Tout, plus les collaborateurs, les accès MCP et les paramètres de la boutique.' },
]

export const ROLE_LABELS: Record<CollaboratorRole, string> = { collaborator: 'Collaborateur', admin: 'Administrateur' }

const PATH = '/api/admin/users/collaborators'

export function collaboratorsApi(api: Api) {
  return {
    list: () => api<Collaborator[]>(PATH),
    create: (request: CreateCollaboratorRequest) => api<Collaborator>(PATH, json('POST', request)),
    changeRole: (id: string, role: CollaboratorRole) => api<Collaborator>(`${PATH}/${id}/role`, json('PUT', { role })),
    disable: (id: string) => api<Collaborator>(`${PATH}/${id}/disable`, { method: 'POST' }),
    enable: (id: string) => api<Collaborator>(`${PATH}/${id}/enable`, { method: 'POST' }),
  }
}

export function displayName(collaborator: Collaborator): string {
  return [collaborator.firstName, collaborator.lastName].filter(Boolean).join(' ') || collaborator.email
}

/** The messages of user-service, and of Keycloak behind it, in French. */
export const translations: Translation[] = [
  [/^You cannot change your own role$/, () => 'Vous ne pouvez pas changer votre propre rôle : demandez-le à un autre administrateur.'],
  [/^You cannot disable your own account$/, () => 'Vous ne pouvez pas désactiver votre propre compte.'],
  [/^User exists with same (email|username)$|^The account conflicts with an existing one$/,
    () => 'Un compte utilise déjà cette adresse e-mail, peut-être un compte client : choisissez-en une autre.'],
  [/^Invalid password: minimum length (\d+)/, (length) => `Mot de passe refusé : ${length} caractères au minimum.`],
  [/^Invalid password: must not be equal to the (email|username)/,
    () => 'Mot de passe refusé : il ne doit pas reprendre l’adresse e-mail.'],
  [/^Invalid password/, () => 'Mot de passe refusé par la politique de mots de passe de Keycloak.'],
  [/^Collaborator .* not found$/, () => 'Ce compte n’existe plus, ou n’est plus un compte du back-office.'],
]
