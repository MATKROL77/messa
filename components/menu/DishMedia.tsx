'use client'

import type { CSSProperties } from 'react'
import type { Plato } from '@/types'

type Variant = 'card' | 'hero' | 'thumbnail'

type CamposMediaCompatibles = {
  imageCard?: string
  imageHero?: string
  imageCutout?: string
  imageTransparent?: string
  imageDetail?: string
}

type FuenteMedia = {
  src?: string
  esRecorte: boolean
}

export function getDishImage(plato: Plato, variant: Variant = 'card'): FuenteMedia {
  // Los assets editoriales versionados se tratan como recortes reales. Mantiene
  // la mejora visual incluso con catálogos ya persistidos en el navegador.
  const recorteBundled = {
    p1: '/images/menu/dishes/burrata-con-tomates-cherry/card-v2.webp',
    p2: '/images/menu/dishes/tagliatelle-al-funghi/card-topdown-v2.webp',
    p3: '/images/menu/dishes/ojo-de-bife-400g/card-topdown-v2.webp',
    p4: '/images/menu/dishes/salmon-a-la-plancha/card-topdown-v2.webp',
    p5: '/images/menu/dishes/risotto-de-mariscos/card-topdown-v2.webp',
    p6: '/images/menu/dishes/volcan-de-chocolate/card-topdown-v2.webp',
    p7: '/images/menu/dishes/tiramisu-della-casa/card-topdown-v2.webp',
    b1: '/images/menu/beverages/chardonnay-reserva/card-pour-v1.webp',
    b2: '/images/menu/beverages/malbec-reserva-2021/card-pour-v1.webp',
    b3: '/images/menu/beverages/cabernet-sauvignon-gran-reserva/card-pour-v1.webp',
    b4: '/images/menu/beverages/sauvignon-blanc/card-pour-v1.webp',
    b5: '/images/menu/beverages/agua-aqa-500ml/card-pour-v1.webp',
    b6: '/images/menu/beverages/limonada-de-la-casa/card-pour-v1.webp',
    b7: '/images/menu/beverages/jugo-de-naranja-exprimido/card-pour-v1.webp',
    c1: '/images/menu/coffees/espresso/card-cutout-v1.webp',
    c2: '/images/menu/coffees/americano/card-cutout-v1.webp',
    c3: '/images/menu/coffees/cortado/card-cutout-v1.webp',
    c4: '/images/menu/coffees/latte/card-cutout-v1.webp',
    p8: '/images/menu/dishes/flan-con-dulce-de-leche-y-crema/card-topdown-v1.webp',
    s1: '/images/menu/dishes/sushi-seleccion-de-piezas/card-topdown-v1.webp',
  }[plato.id]
  const compat = plato as Plato & CamposMediaCompatibles
  const recorte = compat.imagen_recorte_url || compat.imageCutout || compat.imagen_transparente_url || compat.imageTransparent || recorteBundled
  const card = compat.imagen_card_url || compat.imageCard
  const hero = compat.imagen_hero_url || compat.imageHero
  const detalle = compat.imagen_detalle_url || compat.imageDetail

  if (variant === 'hero') return { src: detalle || hero || recorte || card || plato.imagen_url, esRecorte: Boolean(detalle || hero || recorte) }
  if (variant === 'thumbnail') return { src: recorte || card || plato.imagen_url, esRecorte: Boolean(recorte) }
  return { src: recorte || card || plato.imagen_url, esRecorte: Boolean(recorte) }
}

export default function DishMedia({ plato, variant = 'card', className, style }: {
  plato: Plato
  variant?: Variant
  className?: string
  style?: CSSProperties
}) {
  const source = getDishImage(plato, variant)
  const position = `${plato.focal_x ?? 50}% ${plato.focal_y ?? 50}%`
  const aspect = plato.presentacion_media?.aspecto
  const mediaStyle = { ...style, '--dish-media-scale': plato.presentacion_media?.escala || 1 } as CSSProperties
  return (
    <div className={`dish-media dish-media--${variant} ${aspect ? `dish-media--shape-${aspect}` : ''} ${source.esRecorte ? 'dish-media--cutout' : 'dish-media--fallback-asset'} ${className || ''}`} style={{ background: source.esRecorte ? 'transparent' : (plato.color_fondo_media || 'var(--media-fallback)'), ...mediaStyle }}>
      {source.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={source.src} alt={plato.nombre} loading={variant === 'hero' ? 'eager' : 'lazy'} fetchPriority={variant === 'hero' ? 'high' : 'auto'} decoding="async" style={{ objectPosition: position }} />
      ) : <div className="dish-media__fallback" aria-label={`Sin imagen de ${plato.nombre}`}>M</div>}
    </div>
  )
}
