import { screen, waitFor, within } from '@testing-library/react'
import userEventLib, { PointerEventsCheckLevel } from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { routes } from '../../routes'
import { fakeApi, on } from '../../test/fakeApi'
import { fakeAuth, renderRoutes } from '../../test/renderWithAuth'
import { PRODUCTS, type AdminVariant, type ProductDetail } from './api'
import { combinations, missingCombinations, suggestedSku, validateVariant, variantRequest, emptyVariantForm } from './variantForm'

// Sans delai entre les touches, et sans refuser un clic pendant l'animation d'ouverture ou de fermeture
// d'un dialogue ou d'une liste MUI : selon la charge de la machine, le test tombait pile dedans.
const userEvent = userEventLib.setup({ delay: null, pointerEventsCheck: PointerEventsCheckLevel.Never })

const attributes = [
  { id: 1, name: 'Couleur', values: [{ id: 1, value: 'Noir', position: 0 }, { id: 2, value: 'Blanc', position: 1 }] },
  { id: 2, name: 'Layout clavier', values: [{ id: 5, value: 'AZERTY', position: 0 }, { id: 6, value: 'QWERTY', position: 1 }] },
]

const noirAzerty: AdminVariant = {
  id: 11, sku: 'CLAVIER-K2-NOIR-AZERTY', designation: 'Clavier K2 - Noir, AZERTY',
  purchasePriceExclTax: 50, salePriceExclTax: 89.9, discountPriceExclTax: null, ecoTax: 0.1, weightKg: 0.9,
  stock: 12, alertThreshold: 3, lowStock: false,
  values: [{ attributeId: 1, attribute: 'Couleur', valueId: 1, value: 'Noir' }, { attributeId: 2, attribute: 'Layout clavier', valueId: 5, value: 'AZERTY' }],
  images: [],
}

const draft: ProductDetail = {
  id: 4, title: 'Clavier K2', slug: 'clavier-k2', description: null, status: 'BROUILLON',
  brand: { id: 3, name: 'Logitech' }, category: { id: 7, name: 'Claviers' }, vatRate: { id: 1, label: 'Taux normal', rate: 20 },
  universes: [], specifications: [], variants: [noirAzerty], createdAt: '2026-11-23T08:00:00Z', updatedAt: '2026-11-23T08:00:00Z',
}

const references = [
  on('GET', '/api/admin/catalog/brands', 200, [{ id: 3, name: 'Logitech', slug: 'logitech', description: null, logoUrl: null }]),
  on('GET', '/api/admin/catalog/categories', 200, [{ id: 7, name: 'Claviers', slug: 'claviers', description: null, parentId: null, position: 0 }]),
  on('GET', '/api/admin/catalog/universes', 200, []),
  on('GET', '/api/admin/catalog/vat-rates', 200, [{ id: 1, label: 'Taux normal', rate: 20, defaultRate: true }]),
  on('GET', '/api/admin/catalog/specification-keys?categoryId=7', 200, []),
  on('GET', '/api/admin/catalog/attributes', 200, attributes),
]

/** The catalog as a variant moves in it: each POST adds to the product its next GET returns. */
function catalog(product: ProductDetail) {
  const current = { ...product, variants: [...product.variants] }
  let nextId = 100
  const handler = (call: { method: string; path: string; body: unknown }) => {
    if (call.method === 'GET' && call.path === `${PRODUCTS}/${product.id}`) return { status: 200, body: current }
    if (call.method === 'POST' && call.path === `${PRODUCTS}/${product.id}/variants`) {
      const body = call.body as { sku: string; valueIds: number[] }
      if (body.sku === 'PRIS') return { status: 409, body: { status: 409, message: "A variant with SKU 'PRIS' already exists" } }
      const created = { ...noirAzerty, id: nextId++, sku: body.sku, values: [] }
      current.variants.push(created)
      return { status: 201, body: created }
    }
    return undefined
  }
  return { current, handler }
}

/** A button of the section, once it is enabled: they wait for the list of attributes. */
async function enabled(name: string) {
  const button = await screen.findByRole('button', { name })
  await waitFor(() => expect(button).toBeEnabled())
  return button
}

/** Picks a value in one of the dialog's lists, then waits for the list to close before the next click. */
async function choose(dialog: HTMLElement, label: string, option: string) {
  await userEvent.click(within(dialog).getByRole('combobox', { name: label }))
  await userEvent.click(await screen.findByRole('option', { name: option }))
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
}

function open(id: number) {
  return renderRoutes(routes(), `/products/${id}`, fakeAuth(['collaborator']))
}

describe('the variants of a product (C17)', () => {
  // La fiche est chargee a part, avec son editeur : la charger une fois ici, hors du temps du premier test.
  beforeAll(async () => {
    await import('./ProductFormPage')
  }, 60_000)

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('adds a variant: French amounts, one value per attribute, its starting stock', async () => {
    const { handler } = catalog({ ...draft, variants: [] })
    const api = fakeApi(handler, ...references)
    open(4)

    expect(await screen.findByRole('button', { name: 'Publier' })).toBeDisabled()
    await userEvent.click(await enabled('Ajouter une variante'))
    const dialog = await screen.findByRole('dialog', { name: 'Nouvelle variante' })
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'SKU' }), ' K2-NOIR ')
    await choose(dialog, 'Couleur', 'Noir')
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Prix d’achat HT' }), '50')
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Prix de vente HT' }), '89,90')
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Poids' }), '0,9')
    await userEvent.clear(within(dialog).getByRole('textbox', { name: 'Stock de départ' }))
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Stock de départ' }), '12')
    expect(within(dialog).getByRole('status')).toHaveTextContent(/Le client paiera 107,88\s€ TTC · marge 39,90\s€ HT par unité/)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Ajouter' }))

    expect(await screen.findByText('Variante ajoutée.')).toBeInTheDocument()
    expect(api.writes()).toEqual([{
      method: 'POST', path: `${PRODUCTS}/4/variants`, body: {
        sku: 'K2-NOIR', purchasePriceExclTax: 50, salePriceExclTax: 89.9, discountPriceExclTax: null, ecoTax: null,
        weightKg: 0.9, valueIds: [1], initialStock: 12, alertThreshold: 0,
      },
    }])
    // La fiche se recharge : avec une variante, le brouillon devient publiable.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Publier' })).toBeEnabled())
  })

  it('refuses a variant the product already has, and a discount above the price', async () => {
    const api = fakeApi(catalog(draft).handler, ...references)
    open(4)

    await userEvent.click(await enabled('Ajouter une variante'))
    const dialog = await screen.findByRole('dialog', { name: 'Nouvelle variante' })
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'SKU' }), 'K2-COPIE')
    await choose(dialog, 'Couleur', 'Noir')
    await choose(dialog, 'Layout clavier', 'AZERTY')
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Prix d’achat HT' }), '50')
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Prix de vente HT' }), '89,90')
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Prix remisé HT' }), '99')
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Poids' }), '0,9')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Ajouter' }))

    expect(within(dialog).getByText('La variante CLAVIER-K2-NOIR-AZERTY a déjà exactement ces valeurs.')).toBeInTheDocument()
    expect(within(dialog).getByText('Le prix remisé doit rester sous le prix de vente.')).toBeInTheDocument()
    expect(api.writes()).toEqual([])
  })

  it('edits a variant without ever sending its stock', async () => {
    const api = fakeApi(on('PUT', '/api/admin/catalog/variants/11', 200, noirAzerty), catalog(draft).handler, ...references)
    open(4)

    await userEvent.click(await screen.findByRole('button', { name: 'Modifier Noir, AZERTY' }))
    const dialog = await screen.findByRole('dialog', { name: 'Modifier CLAVIER-K2-NOIR-AZERTY' })
    expect(within(dialog).getByRole('link', { name: 'l’inventaire' })).toHaveAttribute('href', '/inventory?q=CLAVIER-K2-NOIR-AZERTY')
    expect(within(dialog).queryByRole('textbox', { name: 'Stock de départ' })).not.toBeInTheDocument()
    const sale = within(dialog).getByRole('textbox', { name: 'Prix de vente HT' })
    expect(sale).toHaveValue('89,9')
    await userEvent.clear(sale)
    await userEvent.type(sale, '84,90')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByText('Variante enregistrée.')).toBeInTheDocument()
    expect(api.writes()).toEqual([{
      method: 'PUT', path: '/api/admin/catalog/variants/11', body: {
        sku: 'CLAVIER-K2-NOIR-AZERTY', purchasePriceExclTax: 50, salePriceExclTax: 84.9, discountPriceExclTax: null,
        ecoTax: 0.1, weightKg: 0.9, valueIds: [1, 5],
      },
    }])
  })

  it('keeps the variants of a product that has been on sale', async () => {
    fakeApi(on('GET', `${PRODUCTS}/5`, 200, { ...draft, id: 5, status: 'PUBLIE' }), ...references)
    open(5)

    expect(await screen.findByRole('button', { name: 'Supprimer Noir, AZERTY' })).toBeDisabled()
    expect(screen.getByText(/Le stock se modifie depuis l’inventaire/)).toBeInTheDocument()
  })

  it('deletes a variant of a draft, after confirmation', async () => {
    const api = fakeApi(on('DELETE', '/api/admin/catalog/variants/11', 204), catalog(draft).handler, ...references)
    open(4)

    await userEvent.click(await screen.findByRole('button', { name: 'Supprimer Noir, AZERTY' }))
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Supprimer la variante ?' })).getByRole('button', { name: 'Supprimer' }))

    expect(await screen.findByText('Variante supprimée.')).toBeInTheDocument()
    expect(api.writes()).toEqual([{ method: 'DELETE', path: '/api/admin/catalog/variants/11', body: undefined }])
  })

  it('generates the missing combinations, then closes', async () => {
    const { handler } = catalog({ ...draft, variants: [] })
    const api = fakeApi(handler, ...references)
    open(4)

    await userEvent.click(await enabled('Générer les combinaisons'))
    const dialog = await screen.findByRole('dialog', { name: 'Générer les combinaisons' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Noir' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Blanc' }))
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Prix d’achat HT' }), '50')
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Prix de vente HT' }), '89,90')
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Poids' }), '0,9')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Créer 2 variantes' }))

    expect(await screen.findByText('2 variantes créées.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.writes()).toHaveLength(2)
  })

  it('generates the missing combinations, and lists the ones the service refused', async () => {
    const { handler } = catalog(draft)
    const api = fakeApi(handler, ...references)
    open(4)

    await userEvent.click(await enabled('Générer les combinaisons'))
    const dialog = await screen.findByRole('dialog', { name: 'Générer les combinaisons' })
    for (const value of ['Noir', 'Blanc', 'AZERTY', 'QWERTY']) {
      await userEvent.click(within(dialog).getByRole('button', { name: value }))
    }
    // Noir + AZERTY existe deja : il reste trois combinaisons.
    const table = within(dialog).getByRole('table', { name: 'Variantes à créer' })
    expect(within(table).getAllByRole('rowheader').map((cell) => cell.textContent)).toEqual(['Noir, QWERTY', 'Blanc, AZERTY', 'Blanc, QWERTY'])
    expect(within(table).getByRole('textbox', { name: 'SKU de Blanc, QWERTY' })).toHaveValue('CLAVIER-K2-BLANC-QWERTY')
    const taken = within(table).getByRole('textbox', { name: 'SKU de Blanc, AZERTY' })
    await userEvent.clear(taken)
    await userEvent.type(taken, 'PRIS')
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Prix d’achat HT' }), '50')
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Prix de vente HT' }), '89,90')
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Poids' }), '0,9')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Créer 3 variantes' }))

    expect(await within(dialog).findByText(/2 variantes créées\. Refusées : PRIS : Le SKU « PRIS » est déjà pris/)).toBeInTheDocument()
    expect(api.writes().map((call) => [(call.body as { sku: string }).sku, (call.body as { valueIds: number[] }).valueIds])).toEqual([
      ['CLAVIER-K2-NOIR-QWERTY', [1, 6]], ['PRIS', [2, 5]], ['CLAVIER-K2-BLANC-QWERTY', [2, 6]],
    ])
  }, 30_000)
})

describe('the variant rules', () => {
  const choice = (index: number, ids: number[]) => ({ attribute: attributes[index], values: attributes[index].values.filter((value) => ids.includes(value.id)) })

  it('combines one value of each chosen attribute', () => {
    expect(combinations([choice(0, [1, 2]), choice(1, [5, 6])]).map((combo) => combo.map((value) => value.value).join('+')))
      .toEqual(['Noir+AZERTY', 'Noir+QWERTY', 'Blanc+AZERTY', 'Blanc+QWERTY'])
    expect(combinations([choice(0, [1]), choice(1, [])])).toHaveLength(1)
    expect(combinations([choice(0, []), choice(1, [])])).toEqual([])
    expect(missingCombinations([choice(0, [1, 2]), choice(1, [5])], [noirAzerty]).map((combo) => combo[0].value)).toEqual(['Blanc'])
  })

  it('suggests a readable SKU, at most 64 characters', () => {
    expect(suggestedSku('clavier-k2', [{ id: 1, value: 'Gris sidéral', position: 0 }])).toBe('CLAVIER-K2-GRIS-SIDERAL')
    expect(suggestedSku('x'.repeat(80), [])).toHaveLength(64)
  })

  it('checks the amounts as the API will', () => {
    const form = { ...emptyVariantForm(), sku: 'A', purchase: '10,555', sale: '9', discount: '9', weight: '1,2345', initialStock: '-1' }
    expect(validateVariant(form, null, [])).toMatchObject({
      purchase: 'Deux décimales au maximum.', discount: 'Le prix remisé doit rester sous le prix de vente.',
      weight: 'Trois décimales au maximum.', initialStock: 'Un nombre entier, 0 ou plus.',
    })
    expect(variantRequest({ ...form, purchase: '10,5', weight: '1,5', initialStock: '3' }, false)).not.toHaveProperty('initialStock')
  })
})
