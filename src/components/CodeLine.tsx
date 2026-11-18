import { Box, Stack, Typography } from '@mui/material'
import { monoFont, tokens } from '../theme'
import { CopyButton } from './CopyButton'

/** A value to copy as is, in the technical font. */
export function CodeLine({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="overline" color="text.secondary" component="p">{label}</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
        <Box
          component="code"
          sx={{
            flexGrow: 1, p: 1.5, borderRadius: 1.5, border: `1px solid ${tokens.lineStrong}`, bgcolor: tokens.canvasWarm,
            fontFamily: monoFont, fontSize: 13, wordBreak: 'break-all', userSelect: 'all',
          }}
        >
          {value}
        </Box>
        <CopyButton text={value} />
      </Stack>
    </Stack>
  )
}
