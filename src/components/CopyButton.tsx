import CheckOutlined from '@mui/icons-material/CheckOutlined'
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined'
import { Button } from '@mui/material'
import { useEffect, useState } from 'react'

/**
 * Copies a text to the clipboard and says so on the button itself. When the
 * browser refuses (no permission, insecure page), the button says that
 * instead of pretending: the text then has to be selected by hand.
 */
export function CopyButton({ text, label = 'Copier' }: { text: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')

  useEffect(() => {
    if (state === 'idle') return
    const reset = setTimeout(() => setState('idle'), 2500)
    return () => clearTimeout(reset)
  }, [state])

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setState('copied')
    } catch {
      setState('failed')
    }
  }

  return (
    <Button
      variant="outlined"
      color="secondary"
      onClick={copy}
      startIcon={state === 'copied' ? <CheckOutlined /> : <ContentCopyOutlined />}
      sx={{ flexShrink: 0 }}
    >
      {state === 'copied' ? 'Copié' : state === 'failed' ? 'Copie refusée : sélectionnez le texte' : label}
    </Button>
  )
}
