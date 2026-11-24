import SearchOutlined from '@mui/icons-material/SearchOutlined'
import { InputAdornment, TextField } from '@mui/material'
import { useEffect, useState } from 'react'

/**
 * A search box for a list loaded page by page from the API: the search is
 * sent once the user pauses, not at every letter. `value` comes from the
 * address, so the back button also changes what the box shows.
 */
export function SearchField({ value, onChange, placeholder }: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  const [text, setText] = useState(value)
  // Le bouton retour change la recherche de l'adresse : le champ la suit.
  const [shown, setShown] = useState(value)
  if (value !== shown) {
    setShown(value)
    setText(value)
  }

  useEffect(() => {
    if (text.trim() === value.trim()) return
    const timer = setTimeout(() => onChange(text), 300)
    return () => clearTimeout(timer)
  }, [text, value, onChange])

  return (
    <TextField
      size="small"
      label="Rechercher"
      placeholder={placeholder}
      value={text}
      onChange={(event) => setText(event.target.value)}
      sx={{ width: { xs: '100%', md: 300 } }}
      slotProps={{
        htmlInput: { maxLength: 150 },
        input: { startAdornment: <InputAdornment position="start"><SearchOutlined fontSize="small" /></InputAdornment> },
      }}
    />
  )
}
