import { useEffect } from 'react'
import { useSettings } from '../store/settings'

// Pone data-theme="light" o "dark" y el color principal (data-accent) en <html>
export function useApplyTheme() {
  const theme = useSettings((s) => s.theme)
  const accent = useSettings((s) => s.accent)

  useEffect(() => {
    document.documentElement.dataset.accent = accent
  }, [accent])

  useEffect(() => {
    document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'dark'
  }, [theme])
}
