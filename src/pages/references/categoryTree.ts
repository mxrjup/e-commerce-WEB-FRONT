import type { Category } from './api'

export type TreeRow = { category: Category; depth: number; children: number; path: string[] }

/**
 * The flat list of the API as the tree it describes: each category right
 * after its parent, indented by its depth. The API already sorts by
 * position then name, so siblings keep that order.
 *
 * A category whose parent is missing from the list is shown as a root rather
 * than lost; a cycle, which the API refuses to create, cannot hang it.
 */
export function categoryTree(categories: readonly Category[]): TreeRow[] {
  const ids = new Set(categories.map((category) => category.id))
  const children = new Map<number | null, Category[]>()
  for (const category of categories) {
    const parent = category.parentId !== null && ids.has(category.parentId) ? category.parentId : null
    children.set(parent, [...(children.get(parent) ?? []), category])
  }

  const rows: TreeRow[] = []
  const seen = new Set<number>()
  const visit = (category: Category, depth: number, path: string[]) => {
    if (seen.has(category.id)) return
    seen.add(category.id)
    const own = children.get(category.id) ?? []
    rows.push({ category, depth, children: own.length, path: [...path, category.name] })
    for (const child of own) visit(child, depth + 1, [...path, category.name])
  }
  for (const root of children.get(null) ?? []) visit(root, 0, [])
  // Une boucle dans les donnees laisserait des categories sans racine : on les montre quand meme.
  for (const category of categories) visit(category, 0, [])
  return rows
}

/** The ids of a category and of everything below it: none of them may become its parent. */
export function branchOf(id: number, categories: readonly Category[]): Set<number> {
  const branch = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const category of categories) {
      if (category.parentId !== null && branch.has(category.parentId) && !branch.has(category.id)) {
        branch.add(category.id)
        grew = true
      }
    }
  }
  return branch
}
