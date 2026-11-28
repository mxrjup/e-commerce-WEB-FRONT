import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEventLib, { PointerEventsCheckLevel } from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { routes } from '../../routes'
import { fakeApi, on } from '../../test/fakeApi'
import { fakeAuth, renderRoutes } from '../../test/renderWithAuth'
import { PRODUCTS, type AdminVariant, type ProductDetail } from './api'
import { moved, pastedFiles, sortFiles } from './images'

// applyAccept: false, sinon la bibliotheque filtrerait elle-meme ce que l'ecran doit refuser et expliquer.
const userEvent = userEventLib.setup({ delay: null, applyAccept: false, pointerEventsCheck: PointerEventsCheckLevel.Never })
const IMAGES = '/api/admin/catalog/variants/11/images'
const url = (name: string) => `http://localhost:8080/api/catalog/images/${name}`

const front = { id: 1, url: url('a.jpg'), position: 1 }
const back = { id: 2, url: url('b.jpg'), position: 2 }
const variant: AdminVariant = {
  id: 11, sku: 'K2-NOIR', designation: 'Clavier K2 - Noir', purchasePriceExclTax: 50, salePriceExclTax: 89.9,
  discountPriceExclTax: null, ecoTax: null, weightKg: 0.9, stock: 12, alertThreshold: 3, lowStock: false,
  values: [{ attributeId: 1, attribute: 'Couleur', valueId: 1, value: 'Noir' }], images: [front, back],
}
const product: ProductDetail = {
  id: 4, title: 'Clavier K2', slug: 'clavier-k2', description: null, status: 'PUBLIE',
  brand: { id: 3, name: 'Logitech' }, category: { id: 7, name: 'Claviers' }, vatRate: { id: 1, label: 'Taux normal', rate: 20 },
  universes: [], specifications: [], variants: [variant], createdAt: '2026-11-25T08:00:00Z', updatedAt: '2026-11-25T08:00:00Z',
}

const references = [
  on('GET', '/api/admin/catalog/brands', 200, [{ id: 3, name: 'Logitech', slug: 'logitech', description: null, logoUrl: null }]),
  on('GET', '/api/admin/catalog/categories', 200, [{ id: 7, name: 'Claviers', slug: 'claviers', description: null, parentId: null, position: 0 }]),
  on('GET', '/api/admin/catalog/universes', 200, []),
  on('GET', '/api/admin/catalog/vat-rates', 200, [{ id: 1, label: 'Taux normal', rate: 20, defaultRate: true }]),
  on('GET', '/api/admin/catalog/specification-keys?categoryId=7', 200, []),
  on('GET', '/api/admin/catalog/attributes', 200, []),
  on('GET', `${PRODUCTS}/4`, 200, product),
]

/** The image API: each upload adds a photo at the end of the list it answers with. */
function uploads(start = variant.images) {
  const images = [...start]
  return (call: { method: string; path: string }) => {
    if (call.method !== 'POST' || call.path !== IMAGES) return undefined
    images.push({ id: 100 + images.length, url: url(`new${images.length}.jpg`), position: images.length + 1 })
    return { status: 201, body: { ...variant, images: [...images] } }
  }
}

const jpeg = (name = 'photo.jpg', size = 1000) => new File([new Uint8Array(size)], name, { type: 'image/jpeg' })

async function openPhotos() {
  renderRoutes(routes(), '/products/4', fakeAuth(['collaborator']))
  await userEvent.click(await screen.findByRole('button', { name: 'Photos de Noir' }))
  return screen.findByRole('dialog', { name: 'Photos de Noir' })
}

describe('the photos of a variant (C18)', () => {
  // La fiche est chargee a part, avec son editeur : la charger une fois ici, hors du temps du premier test.
  beforeAll(async () => {
    await import('./ProductFormPage')
  }, 60_000)

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the photos in order, the first one as the main one', async () => {
    fakeApi(...references)
    const dialog = await openPhotos()

    const photos = within(dialog).getAllByRole('listitem')
    expect(photos.map((photo) => photo.getAttribute('aria-label'))).toEqual(['Photo 1, principale', 'Photo 2'])
    expect(within(photos[0]).getByText('Principale')).toBeInTheDocument()
    expect(photos[0].querySelector('img')).toHaveAttribute('src', front.url)
  })

  it('opens the photos alone, without an empty variant form behind', async () => {
    fakeApi(...references)
    await openPhotos()

    // hidden: true, car MUI masque aux lecteurs d'ecran une fenetre recouverte par une autre.
    expect(screen.getAllByRole('dialog', { hidden: true }).map((dialog) => dialog.getAttribute('aria-labelledby')))
      .toEqual(['photos-title'])
    expect(screen.queryByText('Nouvelle variante')).not.toBeInTheDocument()
  })

  it('sends the photos it accepts, and says why it kept the others', async () => {
    const api = fakeApi(uploads(), ...references)
    const dialog = await openPhotos()

    const text = new File(['bonjour'], 'notes.txt', { type: 'text/plain' })
    const big = jpeg('enorme.jpg', 5 * 1024 * 1024 + 1)
    await userEvent.upload(within(dialog).getByTestId('photos-input'), [jpeg('ok.jpg'), text, big])

    await waitFor(() => expect(within(dialog).getAllByRole('listitem')).toHaveLength(3))
    expect(api.writes()).toEqual([{ method: 'POST', path: IMAGES, body: undefined }])
    expect(within(dialog).getByText('notes.txt : seules les images JPEG, PNG et WebP sont acceptées.')).toBeInTheDocument()
    expect(within(dialog).getByText(/enorme\.jpg : 5 Mo, pour 5 Mo au maximum/)).toBeInTheDocument()
  })

  it('takes photos dropped on the zone', async () => {
    const api = fakeApi(uploads(), ...references)
    const dialog = await openPhotos()

    fireEvent.drop(within(dialog).getByRole('button', { name: 'Ajouter des photos' }), { dataTransfer: { files: [jpeg()] } })

    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(await within(dialog).findAllByRole('listitem')).toHaveLength(3)
  })

  it('sends an image pasted with Ctrl+V, under a name of its own', async () => {
    const api = fakeApi(uploads(), ...references)
    const dialog = await openPhotos()

    fireEvent.paste(dialog, { clipboardData: { files: [new File([new Uint8Array(10)], 'image.png', { type: 'image/png' })], types: ['Files'] } })
    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(await within(dialog).findAllByRole('listitem')).toHaveLength(3)

    // Une image trop lourde dit laquelle : la deuxieme collee.
    fireEvent.paste(dialog, { clipboardData: { files: [new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'image.png', { type: 'image/png' })], types: ['Files'] } })
    expect(await within(dialog).findByText(/^Image collée 2\.png : 5 Mo/)).toBeInTheDocument()
    expect(api.writes()).toHaveLength(1)
  })

  it('explains how to copy an image when only a link was pasted', async () => {
    const api = fakeApi(...references)
    const dialog = await openPhotos()

    fireEvent.paste(dialog, { clipboardData: { files: [], types: ['text/plain'] } })

    expect(await within(dialog).findByText(/faites un clic droit sur l’image, puis « Copier l’image »/)).toBeInTheDocument()
    expect(api.writes()).toEqual([])
  })

  it('reorders by dragging a photo, or with the arrows, and saves the new order', async () => {
    const api = fakeApi(
      on('PUT', `${IMAGES}/order`, 200, { ...variant, images: [{ ...back, position: 1 }, { ...front, position: 2 }] }),
      ...references,
    )
    const dialog = await openPhotos()

    const photos = within(dialog).getAllByRole('listitem')
    fireEvent.dragStart(photos[1])
    fireEvent.drop(photos[0])
    await waitFor(() => expect(api.writes()).toEqual([{ method: 'PUT', path: `${IMAGES}/order`, body: { imageIds: [2, 1] } }]))
    expect(within(dialog).getAllByRole('listitem')[0].querySelector('img')).toHaveAttribute('src', back.url)

    await userEvent.click(within(dialog).getByRole('button', { name: 'Reculer la photo 1' }))
    await waitFor(() => expect(api.writes()).toHaveLength(2))
    expect(api.writes()[1].body).toEqual({ imageIds: [1, 2] })
  })

  it('puts the old order back when the service refuses the new one', async () => {
    fakeApi(
      on('PUT', `${IMAGES}/order`, 400, { status: 400, message: 'imageIds must list each image of variant 11 exactly once: [1, 2, 3]' }),
      ...references,
    )
    const dialog = await openPhotos()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Reculer la photo 1' }))

    expect(await within(dialog).findByText('Les photos ont changé entre-temps : la liste a été rechargée.')).toBeInTheDocument()
    expect(within(dialog).getAllByRole('listitem')[0].querySelector('img')).toHaveAttribute('src', front.url)
  })

  it('removes a photo after confirmation, and reloads the sheet when it closes', async () => {
    const api = fakeApi(on('DELETE', `${IMAGES}/1`, 200, { ...variant, images: [{ ...back, position: 1 }] }), ...references)
    const dialog = await openPhotos()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Supprimer la photo 1' }))
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Supprimer la photo ?' })).getByRole('button', { name: 'Supprimer' }))
    await waitFor(() => expect(within(dialog).getAllByRole('listitem')).toHaveLength(1))

    const loads = () => api.calls.filter((call) => call.method === 'GET' && call.path === `${PRODUCTS}/4`).length
    const before = loads()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Fermer' }))
    await waitFor(() => expect(loads()).toBe(before + 1))
  })

  it('tells in French why the service refused a photo', async () => {
    fakeApi(on('POST', IMAGES, 400, { status: 400, message: 'Only JPEG, PNG and WebP images are accepted' }), ...references)
    const dialog = await openPhotos()

    await userEvent.upload(within(dialog).getByTestId('photos-input'), [jpeg('faux.jpg')])

    expect(await within(dialog).findByText('faux.jpg : Ce fichier n’est pas une image JPEG, PNG ou WebP, quoi qu’en dise son nom.')).toBeInTheDocument()
  })
})

describe('the photo rules', () => {
  it('keeps the room left on the variant', () => {
    const { accepted, refused } = sortFiles([jpeg('a.jpg'), jpeg('b.jpg'), jpeg('c.jpg')], 2)
    expect(accepted.map((file) => file.name)).toEqual(['a.jpg', 'b.jpg'])
    expect(refused).toEqual(['c.jpg : la variante aurait plus de 10 photos.'])
  })

  it('names the pasted images, and keeps the name of a file copied from the disk', () => {
    const clipboard = { files: [jpeg('image.jpg'), jpeg('clavier.jpg')] } as unknown as DataTransfer
    const { files, numbered } = pastedFiles(clipboard, 2)
    expect(files.map((file) => file.name)).toEqual(['Image collée 3.jpg', 'clavier.jpg'])
    expect(files[0].type).toBe('image/jpeg')
    expect(numbered).toBe(3)
  })

  it('moves an item without losing the others', () => {
    expect(moved(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c'])
    expect(moved(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
  })
})
