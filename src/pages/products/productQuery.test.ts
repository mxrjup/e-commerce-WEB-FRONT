import { describe, expect, it } from 'vitest'
import { productsPath, type ProductQuery } from './api'
import { isFiltered, paramsFromQuery, queryFromParams } from './productQuery'

const defaults: ProductQuery = { search: '', status: null, brandId: null, categoryId: null, sort: 'updated', page: 0, size: 20 }

describe('the product list address', () => {
  it('keeps the address short when nothing is chosen', () => {
    expect(paramsFromQuery(defaults).toString()).toBe('')
    expect(queryFromParams(new URLSearchParams())).toEqual(defaults)
  })

  it('goes there and back without losing anything', () => {
    const query: ProductQuery = { search: 'mx keys', status: 'ARCHIVE', brandId: 3, categoryId: 7, sort: 'title', page: 2, size: 50 }
    const params = paramsFromQuery(query)
    expect(params.toString()).toBe('q=mx+keys&statut=archive&marque=3&categorie=7&tri=titre&page=3&taille=50')
    expect(queryFromParams(params)).toEqual(query)
  })

  it('falls back to the defaults on anything it cannot read', () => {
    const params = new URLSearchParams('statut=EN_LIGNE&marque=abc&categorie=-1&tri=prix&page=0&taille=1000')
    expect(queryFromParams(params)).toEqual(defaults)
    expect(queryFromParams(new URLSearchParams('page=2.5'))).toEqual(defaults)
  })

  it('knows when the list is filtered', () => {
    expect(isFiltered(defaults)).toBe(false)
    expect(isFiltered({ ...defaults, search: '   ' })).toBe(false)
    expect(isFiltered({ ...defaults, page: 3, sort: 'title' })).toBe(false)
    expect(isFiltered({ ...defaults, brandId: 1 })).toBe(true)
  })

  it('asks the API with its own names, the page counted from 0', () => {
    expect(productsPath({ ...defaults, search: ' g915 ', status: 'PUBLIE', page: 1 }))
      .toBe('/api/admin/catalog/products?search=g915&status=PUBLIE&page=1&size=20')
  })
})
