import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined'
import ArrowForwardOutlined from '@mui/icons-material/ArrowForwardOutlined'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined'
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Tooltip, Typography,
} from '@mui/material'
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { errorMessage } from '../../api/errors'
import { json, useApi } from '../../api/useApi'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { StatusBadge } from '../../components/StatusBadge'
import { tokens } from '../../theme'
import { IMAGES, imagePath, imagesOrderPath, imagesPath, type AdminVariant } from './api'
import { imageTranslations, moved, pastedFiles, sortFiles } from './images'

type Image = AdminVariant['images'][number]

/**
 * The photos of a variant (C18), on the image API of catalog-service (C06):
 * drop or pick files, drag a thumbnail to reorder (the first is the main
 * one), remove one. Each change is saved at once; the sheet is reloaded
 * when the window closes, so its thumbnails follow.
 *
 * Dragging is the browser's own (no library for ten thumbnails); the ← and
 * → buttons do the same from the keyboard. An image copied elsewhere (« Copier
 * l'image » on any site) is pasted with Ctrl+V while the window is open.
 */
export function VariantImagesDialog({ variant, title, onClose }: {
  variant: AdminVariant
  /** « Noir, AZERTY », to say which variant this is. */
  title: string
  /** @param changed whether a photo was added, moved or removed: the sheet then reloads */
  onClose: (changed: boolean) => void
}) {
  const api = useApi()
  const [images, setImages] = useState<Image[]>(variant.images)
  const [uploading, setUploading] = useState<string[]>([])
  const [refused, setRefused] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [dragged, setDragged] = useState<number | null>(null)
  const [over, setOver] = useState(false)
  const [removing, setRemoving] = useState<Image | null>(null)
  const changed = useRef(false)
  const pasted = useRef(0)
  const input = useRef<HTMLInputElement>(null)
  const busy = uploading.length > 0

  // Ctrl+V anywhere while the window is open: no field to click first.
  // Subscribed again at each render, so that `add` sees the current photos.
  useEffect(() => {
    function paste(event: ClipboardEvent) {
      if (!event.clipboardData || removing) return
      const { files, numbered } = pastedFiles(event.clipboardData, pasted.current)
      pasted.current = numbered
      if (files.length > 0) {
        event.preventDefault()
        void add(files)
      } else if (event.clipboardData.types.length > 0) {
        setRefused(['Le presse-papiers ne contient pas d’image, seulement du texte ou un lien : faites un clic droit sur l’image, puis « Copier l’image ».'])
      }
    }
    document.addEventListener('paste', paste)
    return () => document.removeEventListener('paste', paste)
  })

  /** Sends the accepted files one by one; each appears as soon as it is saved. */
  async function add(files: readonly File[]) {
    const { accepted, refused: notSent } = sortFiles(files, IMAGES.maxPerVariant - images.length)
    setRefused(notSent)
    setError(null)
    // Added to those still on their way, if a second batch comes before the first is sent.
    setUploading((names) => [...names, ...accepted.map((file) => file.name)])
    const failed: string[] = []
    for (const file of accepted) {
      const form = new FormData()
      form.append('file', file)
      try {
        const updated = await api<AdminVariant>(imagesPath(variant.id), { method: 'POST', body: form })
        setImages(updated.images)
        changed.current = true
      } catch (e) {
        failed.push(`${file.name} : ${errorMessage(e, imageTranslations)}`)
      }
      setUploading((names) => {
        const sent = names.indexOf(file.name)
        return names.filter((_, index) => index !== sent)
      })
    }
    if (failed.length > 0) setRefused((current) => [...current, ...failed])
  }

  /** Shows the new order at once, and puts the old one back if the service refuses it. */
  async function reorder(next: Image[]) {
    const previous = images
    setImages(next)
    setError(null)
    try {
      const updated = await api<AdminVariant>(imagesOrderPath(variant.id), json('PUT', { imageIds: next.map((image) => image.id) }))
      setImages(updated.images)
      changed.current = true
    } catch (e) {
      setImages(previous)
      setError(errorMessage(e, imageTranslations))
    }
  }

  async function remove() {
    if (!removing) return
    try {
      const updated = await api<AdminVariant>(imagePath(variant.id, removing.id), { method: 'DELETE' })
      setImages(updated.images)
      changed.current = true
    } catch (e) {
      setError(errorMessage(e, imageTranslations))
    }
    setRemoving(null)
  }

  function dropOnZone(event: DragEvent) {
    event.preventDefault()
    setOver(false)
    if (dragged === null && event.dataTransfer.files.length > 0) void add([...event.dataTransfer.files])
  }

  function dropOnImage(event: DragEvent, index: number) {
    event.preventDefault()
    event.stopPropagation()
    if (dragged !== null && dragged !== index) void reorder(moved(images, dragged, index))
    setDragged(null)
  }

  const full = images.length >= IMAGES.maxPerVariant

  return (
    <Dialog open onClose={() => !busy && onClose(changed.current)} fullWidth maxWidth="md" aria-labelledby="photos-title">
      <DialogTitle id="photos-title">Photos de {title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5}>
          <Typography variant="body2" color="text.secondary">
            {variant.sku} · la première photo est la miniature principale, dans la liste et en vitrine. Faites glisser une photo pour changer l’ordre.
          </Typography>

          <Box
            role="button"
            tabIndex={0}
            aria-label="Ajouter des photos"
            aria-disabled={full || busy}
            onClick={() => !full && !busy && input.current?.click()}
            onKeyDown={(event) => {
              if ((event.key === 'Enter' || event.key === ' ') && !full && !busy) {
                event.preventDefault()
                input.current?.click()
              }
            }}
            onDragOver={(event) => {
              event.preventDefault()
              if (dragged === null) setOver(true)
            }}
            onDragLeave={() => setOver(false)}
            onDrop={dropOnZone}
            sx={{
              border: `2px dashed ${over ? tokens.accent : tokens.lineStrong}`,
              borderRadius: 2,
              bgcolor: over ? tokens.canvasWarm : 'transparent',
              p: 3,
              textAlign: 'center',
              cursor: full || busy ? 'default' : 'pointer',
              opacity: full ? 0.6 : 1,
            }}
          >
            <CloudUploadOutlined sx={{ color: tokens.ink3, fontSize: 32 }} />
            <Typography sx={{ fontWeight: 600 }}>
              {full ? `${IMAGES.maxPerVariant} photos au maximum : supprimez-en une pour en ajouter.` : 'Glissez vos photos ici, cliquez pour les choisir, ou collez-les avec Ctrl+V'}
            </Typography>
            <Typography variant="body2" color="text.secondary">JPEG, PNG ou WebP, 5 Mo au plus par photo, {IMAGES.maxPerVariant} photos par variante.</Typography>
            <input
              ref={input}
              type="file"
              multiple
              hidden
              accept={IMAGES.types.join(',')}
              data-testid="photos-input"
              onChange={(event) => {
                const files = [...(event.target.files ?? [])]
                event.target.value = ''
                void add(files)
              }}
            />
          </Box>

          {uploading.length > 0 && (
            <Stack direction="row" spacing={1} role="status" sx={{ alignItems: 'center' }}>
              <CircularProgress size={18} />
              <Typography variant="body2">Envoi de {uploading.join(', ')}…</Typography>
            </Stack>
          )}
          {refused.length > 0 && (
            <Alert severity="warning" onClose={() => setRefused([])}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Pas envoyées :</Typography>
              {refused.map((reason) => <Typography key={reason} variant="body2">{reason}</Typography>)}
            </Alert>
          )}
          {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

          {images.length === 0
            ? <Typography variant="body2" color="text.secondary">Aucune photo pour l’instant.</Typography>
            : (
              <Box component="ol" aria-label="Photos, dans l’ordre" sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 2 }}>
                {images.map((image, index) => (
                  <Box
                    component="li"
                    key={image.id}
                    draggable
                    aria-label={`Photo ${index + 1}${index === 0 ? ', principale' : ''}`}
                    onDragStart={() => setDragged(index)}
                    onDragEnd={() => setDragged(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => dropOnImage(event, index)}
                    sx={{
                      border: `1px solid ${index === 0 ? tokens.accent : tokens.line}`,
                      borderRadius: 2,
                      overflow: 'hidden',
                      bgcolor: 'background.paper',
                      opacity: dragged === index ? 0.4 : 1,
                      cursor: 'grab',
                    }}
                  >
                    <Box component="img" src={image.url} alt="" sx={{ display: 'block', width: '100%', aspectRatio: '1 / 1', objectFit: 'contain', bgcolor: tokens.canvasWarm }} />
                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 0.5, py: 0.25 }}>
                      {index === 0 ? <StatusBadge tone="neutral" label="Principale" /> : <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>{index + 1}</Typography>}
                      <Box>
                        <Tooltip title="Avancer">
                          <span>
                            <IconButton size="small" aria-label={`Avancer la photo ${index + 1}`} disabled={index === 0} onClick={() => void reorder(moved(images, index, index - 1))}>
                              <ArrowBackOutlined fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Reculer">
                          <span>
                            <IconButton size="small" aria-label={`Reculer la photo ${index + 1}`} disabled={index === images.length - 1} onClick={() => void reorder(moved(images, index, index + 1))}>
                              <ArrowForwardOutlined fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Supprimer">
                          <IconButton size="small" aria-label={`Supprimer la photo ${index + 1}`} onClick={() => setRemoving(image)}>
                            <CloseOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Stack>
                  </Box>
                ))}
              </Box>
            )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="contained" disabled={busy} onClick={() => onClose(changed.current)}>Fermer</Button>
      </DialogActions>

      <ConfirmDialog
        open={removing !== null}
        title="Supprimer la photo ?"
        confirmLabel="Supprimer"
        onConfirm={remove}
        onClose={() => setRemoving(null)}
      >
        La photo sera supprimée définitivement, pour cette variante.
      </ConfirmDialog>
    </Dialog>
  )
}
