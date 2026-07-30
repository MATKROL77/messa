'use client'
import type { CSSProperties } from 'react'
import { UtensilsCrossed } from 'lucide-react'
// Renderiza CUALQUIER imagen (URL externa, foto subida en base64, o placeholder)
// sin restricciones de dominio — reemplaza a next/image para fotos de platos
// cargadas dinámicamente por el restaurante.
export default function PlatoImg({ src, alt, style }: { src: string; alt: string; style?: CSSProperties }) {
  if (!src) {
    return (
      <div role="img" aria-label={alt} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1C1C1C', color: '#c9a84f', ...style }}>
        <UtensilsCrossed size={34} strokeWidth={1.35} />
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', ...style }}
      onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }}
      loading="lazy"
    />
  )
}
