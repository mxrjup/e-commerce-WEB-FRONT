import { Alert, Snackbar } from '@mui/material'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type Notify = (message: string, severity?: 'success' | 'error') => void

const NotifyContext = createContext<Notify>(() => {})

/**
 * Confirms an action that succeeded, at the bottom of the screen. A failure
 * shows in its dialog or page; here only when the action had neither.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<{ message: string; severity: 'success' | 'error'; key: number } | null>(null)
  const notify = useCallback<Notify>((message, severity = 'success') => setNotice({ message, severity, key: Date.now() }), [])

  return (
    <NotifyContext.Provider value={notify}>
      {children}
      <Snackbar
        key={notice?.key}
        open={notice !== null}
        // Une erreur reste jusqu'a ce qu'on la ferme : elle doit etre lue.
        autoHideDuration={notice?.severity === 'error' ? null : 4000}
        onClose={(_, reason) => reason !== 'clickaway' && setNotice(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={notice?.severity ?? 'success'} variant="filled" onClose={() => setNotice(null)} sx={{ width: '100%' }}>
          {notice?.message}
        </Alert>
      </Snackbar>
    </NotifyContext.Provider>
  )
}

// eslint-disable-next-line react/only-export-components -- le hook va avec son provider
export function useNotify(): Notify {
  return useContext(NotifyContext)
}
