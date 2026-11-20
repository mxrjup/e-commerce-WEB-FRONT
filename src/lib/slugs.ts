/**
 * The slug the catalog service derives from a name when none is sent, so
 * the form can show it before saving. Same rules as Slugs.from in
 * e-commerce-BACK (catalog-service): « Écrans & Moniteurs » → « ecrans-moniteurs ».
 */
export function slugify(name: string): string {
  return name
    // Les ligatures ne se decomposent pas en NFD : « Cœur » donnerait « c-ur ».
    .replace(/œ/g, 'oe').replace(/Œ/g, 'OE').replace(/æ/g, 'ae').replace(/Æ/g, 'AE')
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** What the catalog service accepts as a slug. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const SLUG_MAX_LENGTH = 120
