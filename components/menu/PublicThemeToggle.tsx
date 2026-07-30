'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

type MenuTheme = 'light' | 'dark'

const STORAGE_KEY = 'messa-menu-theme'

export default function PublicThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<MenuTheme>('light')

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as MenuTheme | null
    const initial = saved === 'dark' || saved === 'light'
      ? saved
      : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    document.documentElement.dataset.menuTheme = initial
    const timer = window.setTimeout(() => setTheme(initial), 0)
    return () => window.clearTimeout(timer)
  }, [])

  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.dataset.menuTheme = next
    window.localStorage.setItem(STORAGE_KEY, next)
  }

  return (
    <button
      type="button"
      className={`messa-public-theme-toggle${compact ? ' is-compact' : ''}`}
      onClick={toggle}
      aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
      title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
    >
      {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
      {!compact && <span>{theme === 'light' ? 'Oscuro' : 'Claro'}</span>}
    </button>
  )
}
