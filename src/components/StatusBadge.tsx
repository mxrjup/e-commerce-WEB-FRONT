import { Chip } from '@mui/material'
import { tokens } from '../theme'

const tones = {
  ok: { color: tokens.ok, bgcolor: tokens.okSoft },
  neutral: { color: tokens.ink2, bgcolor: tokens.canvasWarm },
  danger: { color: tokens.danger, bgcolor: tokens.dangerSoft },
} as const

/**
 * badge-ok, badge-neutral and badge-danger of the design system: three and
 * not four, always with a text label, since red and green are hard to tell
 * apart for many people. Never the accent colour, which means an action.
 */
export function StatusBadge({ tone, label }: { tone: keyof typeof tones; label: string }) {
  return <Chip size="small" label={label} sx={{ ...tones[tone], fontWeight: 600, fontSize: 12, borderRadius: 999 }} />
}
