'use client'
import { useEffect } from 'react'
import { useStore } from '@/lib/store'

// Aplica el tema configurado por el Creador (color de marca, fondo, tipografía
// de títulos) como variables CSS globales en tiempo real.
export default function ThemeApplier() {
  const tema = useStore(s => s.tema)
  useEffect(() => {
    document.documentElement.style.setProperty('--gold', tema.color_primario)
    document.documentElement.style.setProperty('--gold-dark', tema.color_primario)
    document.documentElement.style.setProperty('--bg', tema.color_fondo)
    document.documentElement.style.setProperty('--font-titulos', tema.fuente_titulos)
    document.title = tema.nombre_marca + ' — Menú Digital Premium'
  }, [tema])
  return null
}
