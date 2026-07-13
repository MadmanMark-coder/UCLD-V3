import { useState, useEffect, useCallback } from 'react'

interface UseCommandPaletteReturn {
  open: boolean
  openPalette: () => void
  closePalette: () => void
  togglePalette: () => void
}

export function useCommandPalette(): UseCommandPaletteReturn {
  const [open, setOpen] = useState(false)

  const openPalette = useCallback(() => setOpen(true), [])
  const closePalette = useCallback(() => setOpen(false), [])
  const togglePalette = useCallback(() => setOpen(p => !p), [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        togglePalette()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [togglePalette])

  return { open, openPalette, closePalette, togglePalette }
}
