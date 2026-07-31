'use client'
import { useEffect } from 'react'
import { useStore } from '@/lib/store'

/**
 * Aplica la identidad que configuró el dueño (color de marca, fondo,
 * tipografía) como variables CSS globales.
 *
 * Antes sólo escribía `--gold` y `--bg`, que viven en el panel: la carta usa
 * su propio token `--messa-accent`, así que cambiar la paleta en
 * Administración no se veía en la carta ni en la mesa. Ahora se escriben los
 * dos, más un tono derivado (`--messa-accent-ink`) que usan los textos y las
 * píldoras, para que el contraste siga siendo legible con cualquier color de
 * marca — incluidos los dorados claros, que sobre blanco quedan ilegibles.
 */

/** Convierte `#rrggbb` en sus componentes; devuelve null si no es un hex válido. */
function hexARgb(hex: string): [number, number, number] | null {
  const limpio = hex.trim().replace('#', '')
  const completo = limpio.length === 3 ? limpio.split('').map(caracter => caracter + caracter).join('') : limpio
  if (!/^[0-9a-fA-F]{6}$/.test(completo)) return null
  return [
    parseInt(completo.slice(0, 2), 16),
    parseInt(completo.slice(2, 4), 16),
    parseInt(completo.slice(4, 6), 16),
  ]
}

/** Luminancia relativa (WCAG) para saber cuánto hay que oscurecer. */
function luminancia([r, g, b]: [number, number, number]): number {
  const canal = (valor: number) => {
    const normalizado = valor / 255
    return normalizado <= 0.04045 ? normalizado / 12.92 : ((normalizado + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
}

function mezclar([r, g, b]: [number, number, number], hacia: number, cantidad: number): string {
  const canal = (valor: number) => Math.round(valor + (hacia - valor) * cantidad)
  return `#${[canal(r), canal(g), canal(b)].map(valor => valor.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Deriva un tono del color de marca que alcance ~4.5:1 sobre fondo claro. Un
 * dorado puro (#C69A3F) apenas llega a 2.6:1 y sería ilegible en textos chicos;
 * oscurecerlo conserva la marca y hace el texto accesible.
 */
function tonoDeTexto(hex: string): string {
  const rgb = hexARgb(hex)
  if (!rgb) return hex
  let mezcla = 0
  let actual = rgb
  while (mezcla < 0.8) {
    if (1.05 / (luminancia(actual) + 0.05) >= 4.5) break
    mezcla += 0.05
    const siguiente = hexARgb(mezclar(rgb, 0, mezcla))
    if (!siguiente) break
    actual = siguiente
  }
  return mezclar(rgb, 0, mezcla)
}

/** Versión aclarada del color de marca, para textos sobre el modo oscuro. */
function tonoDeTextoClaro(hex: string): string {
  const rgb = hexARgb(hex)
  return rgb ? mezclar(rgb, 255, 0.42) : hex
}

export default function ThemeApplier() {
  const tema = useStore(state => state.tema)

  useEffect(() => {
    const raiz = document.documentElement
    raiz.style.setProperty('--gold', tema.color_primario)
    raiz.style.setProperty('--gold-dark', tonoDeTexto(tema.color_primario))
    raiz.style.setProperty('--bg', tema.color_fondo)
    raiz.style.setProperty('--font-titulos', tema.fuente_titulos)
    // Tokens de la carta pública y de la experiencia de mesa.
    raiz.style.setProperty('--messa-accent', tema.color_primario)
    raiz.style.setProperty('--messa-accent-ink', tonoDeTexto(tema.color_primario))
    raiz.style.setProperty('--messa-accent-ink-dark', tonoDeTextoClaro(tema.color_primario))
    document.title = `${tema.nombre_marca} — Carta digital y operación`
  }, [tema])

  return null
}
