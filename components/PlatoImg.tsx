'use client'
// Renderiza CUALQUIER imagen (URL externa, foto subida en base64, o placeholder)
// sin restricciones de dominio — reemplaza a next/image para fotos de platos
// cargadas dinámicamente por el restaurante.
export default function PlatoImg({ src, alt, style }: { src: string; alt: string; style?: React.CSSProperties }) {
  if (!src) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1C1C1C', fontSize: 40, ...style }}>
        🍽️
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
