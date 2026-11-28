import { Stack, TableCell, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { monoFont } from '../../theme'

/** The first cell of a row names it: a row header, as the design system asks. */
export function NameCell({ children, leading }: { children: ReactNode; leading?: ReactNode }) {
  return (
    <TableCell component="th" scope="row">
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        {leading}
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{children}</Typography>
      </Stack>
    </TableCell>
  )
}

export function MonoCell({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
  return <TableCell align={align} sx={{ fontFamily: monoFont, fontSize: 13, fontWeight: 500 }}>{children}</TableCell>
}

/** A long text cut to one line; the whole text shows on hover. */
export function TextCell({ text }: { text: string | null }) {
  return (
    <TableCell sx={{ maxWidth: 320, color: 'text.secondary' }}>
      {text
        ? <Typography variant="body2" noWrap title={text}>{text}</Typography>
        : <Typography variant="body2" color="text.disabled">—</Typography>}
    </TableCell>
  )
}
