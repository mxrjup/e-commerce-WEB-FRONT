import { describe, expect, it } from 'vitest'
import type { Category } from './api'
import { branchOf, categoryTree } from './categoryTree'
import { validateNamed } from './namedForm'

const category = (id: number, name: string, parentId: number | null): Category =>
  ({ id, name, slug: name.toLowerCase(), description: null, parentId, position: 0 })

// L'ordre de l'API : position puis nom, a plat.
const categories = [
  category(1, 'Composants', null),
  category(2, 'Cartes', 1),
  category(3, 'Peripheriques', null),
  category(4, 'Claviers', 3),
  category(5, 'Mecaniques', 4),
  category(6, 'Orpheline', 99),
]

describe('categoryTree', () => {
  it('puts each category right after its parent, with its depth and its path', () => {
    const rows = categoryTree(categories)
    expect(rows.map((row) => `${'-'.repeat(row.depth)}${row.category.name}`))
      .toEqual(['Composants', '-Cartes', 'Peripheriques', '-Claviers', '--Mecaniques', 'Orpheline'])
    expect(rows.find((row) => row.category.id === 5)?.path).toEqual(['Peripheriques', 'Claviers', 'Mecaniques'])
    expect(rows.find((row) => row.category.id === 3)?.children).toBe(1)
  })

  it('keeps a category whose parent is gone, and survives a cycle', () => {
    const cycle = [category(1, 'A', 2), category(2, 'B', 1)]
    expect(categoryTree(cycle).map((row) => row.category.name)).toEqual(['A', 'B'])
  })

  it('finds a whole branch, which may not become its own parent', () => {
    expect([...branchOf(3, categories)].sort()).toEqual([3, 4, 5])
    expect([...branchOf(2, categories)]).toEqual([2])
  })
})

describe('validateNamed', () => {
  const brands = [{ id: 1, name: 'ASUS', slug: 'asus', description: null }]
  const form = (name: string, slug = '', description = '') => ({ name, slug, description })

  it('accepts a new entry whose slug will be derived', () => {
    expect(Object.values(validateNamed(form('Corsair'), null, brands, true)).filter(Boolean)).toEqual([])
  })

  it('refuses a taken name or slug, ignoring case for the name', () => {
    expect(validateNamed(form('asus'), null, brands, true).name).toBe('Ce nom est déjà pris.')
    expect(validateNamed(form('Asus Pro', 'asus'), null, brands, true).slug).toBe('Le slug « asus » est déjà pris.')
    // Une entree ne se gene pas elle-meme quand on la modifie.
    expect(validateNamed(form('ASUS', 'asus'), brands[0], brands, true).name).toBeUndefined()
  })

  it('lets two categories share a name, not a slug', () => {
    expect(validateNamed(form('ASUS', 'asus-2'), null, brands, false).name).toBeUndefined()
  })

  it('explains a slug the API would refuse', () => {
    expect(validateNamed(form('Écrans', 'Écrans'), null, [], true).slug).toMatch(/Minuscules sans accent/)
    expect(validateNamed(form('日本'), null, [], true).slug).toMatch(/ne donne aucun slug/)
    expect(validateNamed(form('Écrans', ''), brands[0], brands, true).slug).toMatch(/obligatoire/)
    expect(validateNamed(form('x'.repeat(101)), null, [], true).name).toMatch(/100 caractères au maximum/)
  })
})
