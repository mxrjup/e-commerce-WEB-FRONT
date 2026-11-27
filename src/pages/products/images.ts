import type { Translation } from '../../api/errors'
import { IMAGES } from './api'

/**
 * What can be sent, checked before anything leaves the browser: the format
 * the browser reads from the file, the size, and the room left on the
 * variant. catalog-service checks again, on the content of the file (C06).
 *
 * @param room how many photos the variant can still take
 */
export function sortFiles(files: readonly File[], room: number): { accepted: File[]; refused: string[] } {
  const accepted: File[] = []
  const refused: string[] = []
  for (const file of files) {
    if (!(IMAGES.types as readonly string[]).includes(file.type)) {
      refused.push(`${file.name} : seules les images JPEG, PNG et WebP sont acceptées.`)
    } else if (file.size > IMAGES.maxBytes) {
      refused.push(`${file.name} : ${megabytes(file.size)}, pour 5 Mo au maximum.`)
    } else if (accepted.length >= room) {
      refused.push(`${file.name} : la variante aurait plus de ${IMAGES.maxPerVariant} photos.`)
    } else {
      accepted.push(file)
    }
  }
  return { accepted, refused }
}

function megabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`
}

/**
 * The files of a paste. A browser names a copied image « image.png »: it is
 * renamed « Image collée 1.png », « Image collée 2.png »… so that each one
 * can be told apart in the messages. A file copied from the disk keeps its name.
 *
 * @param numbered how many pasted images were named so far in this window
 * @returns the files, and the new count
 */
export function pastedFiles(clipboard: DataTransfer, numbered: number): { files: File[]; numbered: number } {
  let count = numbered
  const files = [...clipboard.files].map((file) => {
    if (!/^image\.\w+$/i.test(file.name)) return file
    count += 1
    const extension = file.name.slice(file.name.lastIndexOf('.'))
    return new File([file], `Image collée ${count}${extension}`, { type: file.type })
  })
  return { files, numbered: count }
}

/** The list with the item at `from` moved to `to`, the others keeping their order. */
export function moved<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/** The messages of catalog-service for the photos (C06), in French. */
export const imageTranslations: Translation[] = [
  [/^Only JPEG, PNG and WebP images are accepted$/, () => 'Ce fichier n’est pas une image JPEG, PNG ou WebP, quoi qu’en dise son nom.'],
  [/already has \d+ images/, () => `Cette variante a déjà ${IMAGES.maxPerVariant} photos : supprimez-en une avant d’en ajouter.`],
  [/^Payload Too Large$|Maximum upload size/, () => 'La photo dépasse 5 Mo.'],
  [/^Image \d+ not found on variant/, () => 'Cette photo n’existe plus : la liste a été rechargée.'],
  [/^imageIds must list each image/, () => 'Les photos ont changé entre-temps : la liste a été rechargée.'],
]
