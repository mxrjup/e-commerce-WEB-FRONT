import { ApiError } from './client'

/**
 * A known message of a service, and how to say it in French. The services
 * answer in English; the back-office speaks French to its users.
 */
export type Translation = [pattern: RegExp, french: (...groups: string[]) => string]

/**
 * What to tell the user when a call fails, in French.
 *
 * @param translations the known messages of the API being called, tried first
 * @param conflict what any other 409 means for this action, when the caller knows better than the service
 */
export function errorMessage(error: unknown, translations: readonly Translation[] = [], conflict?: string): string {
  if (!(error instanceof ApiError)) {
    // fetch rejette sans reponse : serveur arrete, reseau coupe, ou CORS refuse.
    return 'Impossible de joindre le serveur. Vérifiez votre connexion, ou que la gateway est démarrée.'
  }
  for (const [pattern, french] of translations) {
    const match = pattern.exec(error.message)
    if (match) {
      return french(...match.slice(1))
    }
  }
  if (error.status === 409 && conflict) {
    return conflict
  }
  switch (error.status) {
    case 400:
      return error.details.length > 0
        ? `Le serveur a refusé ces valeurs : ${error.details.join(' ; ')}.`
        : `Le serveur a refusé la demande : ${error.message}.`
    case 401:
      return 'Votre session a expiré. Rechargez la page pour vous reconnecter.'
    case 403:
      return 'Votre compte n’a pas le droit de faire cette action.'
    case 404:
      return 'Cet élément n’existe plus : il a sans doute été supprimé entre-temps.'
    case 409:
      return `L’action est impossible dans l’état actuel : ${error.message}.`
    default:
      return error.status >= 500
        ? 'Le service ne répond pas pour le moment. Réessayez dans un instant.'
        : `Erreur inattendue (${error.status}) : ${error.message}.`
  }
}
