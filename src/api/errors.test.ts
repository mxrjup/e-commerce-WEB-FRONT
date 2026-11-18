import { describe, expect, it } from 'vitest'
import { ApiError } from './client'
import { errorMessage, type Translation } from './errors'

describe('errorMessage', () => {
  it('tells a network failure apart from an answer', () => {
    expect(errorMessage(new TypeError('Failed to fetch'))).toMatch(/Impossible de joindre le serveur/)
  })

  it('translates a known message first, whatever the status', () => {
    const translations: Translation[] = [[/^A brand named '(.*)' already exists$/, (name) => `« ${name} » existe déjà.`]]
    const error = new ApiError(409, "A brand named 'ASUS' already exists")
    expect(errorMessage(error, translations, 'encore utilisée')).toBe('« ASUS » existe déjà.')
  })

  it('uses what the screen says a conflict means when the message is unknown', () => {
    expect(errorMessage(new ApiError(409, "Brand 'asus' is still used"), [], 'Encore utilisée.')).toBe('Encore utilisée.')
  })

  it('has a French sentence for every status the gateway sends', () => {
    expect(errorMessage(new ApiError(401, 'Unauthorized'))).toMatch(/session a expiré/)
    expect(errorMessage(new ApiError(403, 'Forbidden'))).toMatch(/pas le droit/)
    expect(errorMessage(new ApiError(404, 'Brand 9 not found'))).toMatch(/n’existe plus/)
    expect(errorMessage(new ApiError(503, 'Service Unavailable'))).toMatch(/ne répond pas/)
    expect(errorMessage(new ApiError(400, 'Validation failed', ['name must not be blank'])))
      .toBe('Le serveur a refusé ces valeurs : name must not be blank.')
  })
})
