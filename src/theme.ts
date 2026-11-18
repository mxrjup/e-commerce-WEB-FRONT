import { createTheme } from '@mui/material/styles'

/**
 * The "log" design system (bois et ambre), as an MUI theme. Values come from
 * DESIGN-log.md, shared with the mobile app: change them there first.
 */
export const tokens = {
  accent: '#9A5518',
  accentSoft: '#FBF0E3',
  ink: '#17150F',
  ink2: '#55504A',
  ink3: '#696257',
  canvas: '#FFFFFF',
  canvasWarm: '#F6F4F0',
  surfaceDark: '#17150F',
  onDark: '#FFFFFF',
  onDark2: '#B5AEA3',
  line: '#E3DFD8',
  lineStrong: '#938B80',
  ok: '#15603A',
  okSoft: '#E7F1EB',
  danger: '#B3261E',
  dangerSoft: '#FBEAE8',
} as const

const font = 'Manrope, system-ui, sans-serif'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: tokens.accent, contrastText: tokens.onDark },
    secondary: { main: tokens.ink, contrastText: tokens.onDark },
    success: { main: tokens.ok, light: tokens.okSoft },
    error: { main: tokens.danger, light: tokens.dangerSoft },
    text: { primary: tokens.ink, secondary: tokens.ink2, disabled: tokens.ink3 },
    background: { default: tokens.canvasWarm, paper: tokens.canvas },
    divider: tokens.line,
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: font,
    h1: { fontSize: 34, fontWeight: 800 },
    h2: { fontSize: 28, fontWeight: 800 },
    h3: { fontSize: 24, fontWeight: 800 },
    h4: { fontSize: 18, fontWeight: 600 },
    body1: { fontSize: 17 },
    body2: { fontSize: 14 },
    button: { fontSize: 14, fontWeight: 600, textTransform: 'none' },
    caption: { fontSize: 12 },
    overline: { fontSize: 11, fontWeight: 600, letterSpacing: 1 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 6, minHeight: 40 } },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'inherit' },
      styleOverrides: { root: { borderBottom: `1px solid ${tokens.line}`, backgroundColor: tokens.canvas } },
    },
    MuiDrawer: {
      styleOverrides: { paper: { backgroundColor: tokens.surfaceDark, color: tokens.onDark, borderRight: 'none' } },
    },
  },
})
