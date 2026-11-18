import { Box } from '@mui/material'
import { useState } from 'react'
import { tokens } from '../../theme'

/**
 * A logo or an image of the catalog, small, next to its name. Without an
 * address, or when the address does not load, the initial takes its place
 * instead of the browser's broken image.
 */
export function Thumbnail({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState<string | null>(null)
  const box = {
    width: 36, height: 36, flexShrink: 0, borderRadius: 1.5, border: `1px solid ${tokens.line}`,
    bgcolor: tokens.canvasWarm, display: 'grid', placeItems: 'center', overflow: 'hidden',
  }

  if (!src || failed === src) {
    return <Box aria-hidden sx={{ ...box, color: tokens.ink3, fontWeight: 600, fontSize: 14 }}>{name.charAt(0).toUpperCase()}</Box>
  }
  return (
    <Box sx={box}>
      <Box component="img" src={src} alt="" onError={() => setFailed(src)} sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </Box>
  )
}
