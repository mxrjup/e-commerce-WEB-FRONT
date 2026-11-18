import { describe, expect, it } from 'vitest'
import { allNavItems, visibleNavigation } from './navigation'

const titles = (roles: string[]) => visibleNavigation(roles).map((section) => section.title)
const paths = (roles: string[]) => visibleNavigation(roles).flatMap((section) => section.items.map((item) => item.path))

describe('navigation', () => {
  it('hides the administration from collaborators', () => {
    expect(titles(['collaborator'])).toEqual([null, 'Catalogue', 'Ventes'])
    expect(paths(['collaborator'])).not.toContain('/mcp')
  })

  it('shows everything to admins', () => {
    expect(titles(['collaborator', 'admin'])).toEqual([null, 'Catalogue', 'Ventes', 'Administration'])
    expect(paths(['admin'])).toEqual(expect.arrayContaining(['/collaborators', '/mcp']))
  })

  it('gives every entry a unique path, and either a screen or the task that brings it', () => {
    const items = allNavItems()
    expect(new Set(items.map((item) => item.path)).size).toBe(items.length)
    for (const item of items) {
      expect(Boolean(item.element) || Boolean(item.task)).toBe(true)
    }
  })
})
