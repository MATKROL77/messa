'use client'

import { Clock3, Plus, Star } from 'lucide-react'
import type { Plato } from '@/types'
import { formatPrecioCarta } from '@/lib/utils'
import DishMedia from './DishMedia'

export default function DishEditorialCard({ plato, onSelect, presentation = 'portrait' }: {
  plato: Plato
  onSelect: (plato: Plato) => void
  presentation?: 'portrait' | 'landscape'
}) {
  return (
    <article
      className={`dish-editorial-card dish-editorial-card--${presentation} dish-editorial-card--${plato.categoria_id}${plato.presentacion_media?.aspecto ? ` dish-editorial-card--media-${plato.presentacion_media.aspecto}` : ''}${plato.categoria_id === 'bebidas' ? ' dish-editorial-card--beverage' : ''}`}
    >
      <button type="button" className="dish-editorial-card__tap-target" aria-label={`Ver ${plato.nombre}`} onClick={() => onSelect(plato)} />
      <div className="dish-editorial-card__media-layer">
        <span className="dish-editorial-card__media-shadow" aria-hidden="true" />
        <DishMedia plato={plato} className="dish-editorial-card__media" />
      </div>
      <div className="dish-editorial-card__surface">
        <div className="dish-editorial-card__meta">
          {plato.tags.slice(0, 1).map(tag => <span className="soft-badge" key={tag}>{tag}</span>)}
          <span className="rating"><Star size={13} fill="currentColor" /> {plato.total_reviews > 0 ? plato.rating.toFixed(1) : 'Nuevo'}</span>
        </div>
        <div className="dish-editorial-card__title-row">
          <h3>{plato.nombre}</h3>
          <span className="icon-button" aria-hidden="true"><Plus size={18} /></span>
        </div>
        <p>{plato.descripcion}</p>
        <div className="dish-editorial-card__footer">
          <strong className={plato.precio_pendiente ? 'menu-price--pending' : undefined}>{formatPrecioCarta(plato.precio, plato.precio_pendiente)}</strong>
          {plato.tiempo_preparacion_minutos && <span><Clock3 size={14} /> {plato.tiempo_preparacion_minutos} min</span>}
        </div>
      </div>
    </article>
  )
}
