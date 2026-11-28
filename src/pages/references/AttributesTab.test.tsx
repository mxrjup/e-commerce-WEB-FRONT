import { screen, within } from '@testing-library/react'
import userEventLib from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../routes'
import { fakeApi, on } from '../../test/fakeApi'
import { fakeAuth, renderRoutes } from '../../test/renderWithAuth'

const userEvent = userEventLib.setup({ delay: null })
const ATTRIBUTES = '/api/admin/catalog/attributes'
const color = {
  id: 1, name: 'Couleur', values: [
    { id: 1, value: 'Noir', position: 0 }, { id: 2, value: 'Blanc', position: 1 }, { id: 3, value: 'Rouge', position: 2 },
  ],
}

function open() {
  return renderRoutes(routes(), '/references?onglet=attributs', fakeAuth(['collaborator']))
}

describe('the attributes (C17)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists each attribute with its values, in order', async () => {
    fakeApi(on('GET', ATTRIBUTES, 200, [color]))
    open()

    const row = (await screen.findByRole('rowheader', { name: 'Couleur' })).closest('tr')!
    expect(within(row).getAllByText(/Noir|Blanc|Rouge/).map((chip) => chip.textContent)).toEqual(['Noir', 'Blanc', 'Rouge'])
    expect(screen.getByRole('status')).toHaveTextContent('1 attribut')
  })

  it('creates an attribute with its values, trimmed', async () => {
    const api = fakeApi(
      on('POST', ATTRIBUTES, 201, { id: 2, name: 'Layout clavier', values: [] }),
      on('GET', ATTRIBUTES, 200, [color]),
    )
    open()

    await userEvent.click(await screen.findByRole('button', { name: 'Ajouter un attribut' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Nom' }), ' Layout clavier ')
    await userEvent.type(screen.getByRole('textbox', { name: 'Valeur 1' }), 'AZERTY')
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter une valeur' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Valeur 2' }), ' QWERTY ')
    await userEvent.click(screen.getByRole('button', { name: 'Créer' }))

    expect(await screen.findByText('Attribut créé.')).toBeInTheDocument()
    expect(api.writes()).toEqual([{
      method: 'POST', path: ATTRIBUTES,
      body: { name: 'Layout clavier', values: [{ id: null, value: 'AZERTY' }, { id: null, value: 'QWERTY' }] },
    }])
  })

  it('renames, reorders, adds and removes values, keeping the ids of the ones it keeps', async () => {
    const api = fakeApi(on('PUT', `${ATTRIBUTES}/1`, 200, color), on('GET', ATTRIBUTES, 200, [color]))
    open()

    await userEvent.click(await screen.findByRole('button', { name: 'Modifier Couleur' }))
    const noir = screen.getByRole('textbox', { name: 'Valeur 1' })
    await userEvent.clear(noir)
    await userEvent.type(noir, 'Noir mat')
    await userEvent.click(screen.getByRole('button', { name: 'Retirer la valeur 3' }))
    await userEvent.click(screen.getByRole('button', { name: 'Monter la valeur 2' }))
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter une valeur' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Valeur 3' }), 'Argent')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByText('Attribut enregistré.')).toBeInTheDocument()
    expect(api.writes()[0].body).toEqual({
      name: 'Couleur',
      values: [{ id: 2, value: 'Blanc' }, { id: 1, value: 'Noir mat' }, { id: null, value: 'Argent' }],
    })
  })

  it('points at empty and repeated values, without calling the API', async () => {
    const api = fakeApi(on('GET', ATTRIBUTES, 200, [color]))
    open()

    await userEvent.click(await screen.findByRole('button', { name: 'Modifier Couleur' }))
    await userEvent.clear(screen.getByRole('textbox', { name: 'Valeur 3' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Valeur 3' }), 'noir')
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter une valeur' }))
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(screen.getByText('« noir » est déjà dans la liste.')).toBeInTheDocument()
    expect(screen.getByText('Ce champ est obligatoire.')).toBeInTheDocument()
    expect(api.writes()).toEqual([])
  })

  it('explains in French why a value in use cannot be removed', async () => {
    fakeApi(
      on('PUT', `${ATTRIBUTES}/1`, 409, { status: 409, message: "Value 'Blanc' of Couleur is used by variants and cannot be removed" }),
      on('GET', ATTRIBUTES, 200, [color]),
    )
    open()

    await userEvent.click(await screen.findByRole('button', { name: 'Modifier Couleur' }))
    await userEvent.click(screen.getByRole('button', { name: 'Retirer la valeur 2' }))
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByText('La valeur « Blanc » est utilisée par des variantes : elle ne peut pas être retirée.')).toBeInTheDocument()
  })
})
