'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'dark' | 'light'

export default function AdminThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const saved = window.localStorage.getItem('messa-admin-theme')
    const nextTheme: Theme = saved === 'light' ? 'light' : 'dark'
    document.documentElement.dataset.adminTheme = nextTheme
    const timer = window.setTimeout(() => setTheme(nextTheme), 0)
    return () => window.clearTimeout(timer)
  }, [])

  const toggle = () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    window.localStorage.setItem('messa-admin-theme', nextTheme)
    document.documentElement.dataset.adminTheme = nextTheme
  }

  return <button className="admin-theme-switch" type="button" onClick={toggle} role="switch" aria-checked={theme === 'light'} aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'} data-tooltip={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}><Sun size={15} aria-hidden="true" /><Moon size={15} aria-hidden="true" /><i aria-hidden="true" /></button>
}
