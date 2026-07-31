'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, Clock3, Sparkles, Star, X } from 'lucide-react'
import { useStore } from '@/lib/store'
import type { Plato } from '@/types'
import { formatPrecio, formatPrecioCarta } from '@/lib/utils'
import DishMedia from '@/components/menu/DishMedia'
import MenuExperience from '@/components/menu/MenuExperience'
import Footer from '@/components/Footer'

const FILTERS = ['Sin TACC', 'Vegetariano', 'Vegano']

export default function VistaPage() {
  const { iniciarModoVista, platos, config, categoriasDisponibles } = useStore()
  const [categoria, setCategoria] = useState('todos')
  const [filtros, setFiltros] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [activeDish, setActiveDish] = useState<Plato | null>(null)

  useEffect(() => { iniciarModoVista() }, [iniciarModoVista])

  const visibles = useMemo(() => platos.filter(plato => {
    const text = `${plato.nombre} ${plato.descripcion} ${plato.tags.join(' ')}`.toLowerCase()
    return plato.disponible && (categoria === 'todos' || plato.categoria_id === categoria) &&
      filtros.every(filter => plato.tags.includes(filter)) && (!query || text.includes(query.toLowerCase()))
  }), [categoria, filtros, platos, query])
  const destacados = visibles.filter(plato => plato.destacado && config.chef_recomendaciones_habilitadas)
  const recomendaciones = activeDish?.maridaje
    ?.map(sugerencia => platos.find(plato => plato.id === sugerencia.plato_id))
    .filter((plato): plato is Plato => Boolean(plato)) || []
  const toggle = (filter: string) => setFiltros(current => current.includes(filter) ? current.filter(item => item !== filter) : [...current, filter])

  return (
    <>
      <MenuExperience
        mode="readonly"
        restaurantName={config.nombre}
        dishes={visibles}
        featured={destacados}
        categories={categoriasDisponibles}
        category={categoria}
        onCategoryChange={setCategoria}
        query={query}
        onQueryChange={setQuery}
        filters={filtros}
        filterOptions={FILTERS}
        filtersOpen={filtersOpen}
        onFiltersOpenChange={setFiltersOpen}
        onToggleFilter={toggle}
        onClearFilters={() => setFiltros([])}
        onSelect={setActiveDish}
      >
        <Footer nombre={config.nombre} />
      </MenuExperience>

      {activeDish && <div className="modal-backdrop dish-detail-backdrop" onClick={() => setActiveDish(null)}><article className={`dish-detail dish-detail--${activeDish.categoria_id}${activeDish.presentacion_media?.aspecto ? ` dish-detail--media-${activeDish.presentacion_media.aspecto}` : ''}`} role="dialog" aria-modal="true" aria-label={activeDish.nombre} onClick={event => event.stopPropagation()}>
        <div className="dish-detail__surface">
          <div className="dish-detail__media-region">
            <div className="dish-detail__hero-layer"><span className="dish-detail__hero-shadow" aria-hidden="true" /><DishMedia plato={activeDish} variant="hero" className="dish-detail__hero-media" /></div>
            <button className="icon-button dish-detail__close" onClick={() => setActiveDish(null)} aria-label="Cerrar detalle"><X size={18} /></button>
          </div>
          <div className="dish-detail__content"><div className="dish-detail__heading"><div><p className="eyebrow">{categoriasDisponibles.find(item => item.id === activeDish.categoria_id)?.nombre}</p><h2>{activeDish.nombre}</h2></div><strong className={activeDish.precio_pendiente ? 'menu-price--pending' : undefined}>{formatPrecioCarta(activeDish.precio, activeDish.precio_pendiente)}</strong></div>
          <div className="detail-meta"><span><Star size={15} fill="currentColor" /> {activeDish.total_reviews > 0 ? `${activeDish.rating.toFixed(1)} · ${activeDish.total_reviews} reseñas` : 'Nuevo en la carta'}</span>{activeDish.tiempo_preparacion_minutos && <span><Clock3 size={15} /> {activeDish.tiempo_preparacion_minutos} min</span>}</div>
          <p className="detail-description">{activeDish.descripcion}</p>
          {activeDish.ingredientes.length > 0 && <div><p className="eyebrow">INGREDIENTES</p><div className="ingredient-list">{activeDish.ingredientes.map(item => <span key={item.id}>{item.nombre}</span>)}</div></div>}
          {recomendaciones.length > 0 && <div className="detail-recommendations"><div className="detail-recommendations__heading"><p className="eyebrow"><Sparkles size={13} /> PARA ACOMPAÑAR</p><span>Deslizá</span></div><div className="recommendation-rail">{recomendaciones.map(plato => <button key={plato.id} onClick={() => setActiveDish(plato)}><DishMedia plato={plato} variant="thumbnail" /><span><b>{plato.nombre}</b><small>{formatPrecio(plato.precio)}</small></span><ChevronRight size={16} /></button>)}</div></div>}
          <div className="read-only-note">Disponible al escanear el QR de una mesa.</div>
          </div>
        </div>
      </article></div>}
    </>
  )
}
