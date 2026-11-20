import '@fontsource/manrope/400.css'
import '@fontsource/manrope/600.css'
import '@fontsource/manrope/800.css'
import '@fontsource/jetbrains-mono/500.css'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { AuthProvider } from './auth/AuthProvider'
import { StartupScreen } from './pages/StartupScreen'
import { theme } from './theme'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider fallback={(state, retry) => <StartupScreen state={state} onRetry={retry} />}>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
