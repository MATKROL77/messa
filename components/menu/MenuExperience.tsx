'use client'

import type { ReactNode } from 'react'
import { Check, ChefHat, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import type { Categoria, Plato } from '@/types'
import { formatPrecio } from '@/lib/utils'
import DishEditorialCard from './DishEditorialCard'
import DishMedia from './DishMedia'
import PublicThemeToggle from './PublicThemeToggle'

type MenuMode = 'readonly' | 'table-order'

export default function MenuExperience({
  mode,
  restaurantName,
  contextLabel,
  status,
  dishes,
  featured,
  categories,
  category,
  onCategoryChange,
  query,
  onQueryChange,
  filters,
  filterOptions,
  filtersOpen,
  onFiltersOpenChange,
  onToggleFilter,
  onClearFilters,
  onSelect,
  children,
}: {
  mode: MenuMode
  restaurantName: string
  contextLabel?: string
  status?: ReactNode
  dishes: Plato[]
  featured: Plato[]
  categories: Categoria[]
  category: string
  onCategoryChange: (category: string) => void
  query: string
  onQueryChange: (query: string) => void
  filters: string[]
  filterOptions: string[]
  filtersOpen: boolean
  onFiltersOpenChange: (open: boolean) => void
  onToggleFilter: (filter: string) => void
  onClearFilters: () => void
  onSelect: (dish: Plato) => void
  children?: ReactNode
}) {
  const principal = featured[0]
  const categoryTitle = category === 'todos'
    ? 'La carta'
    : categories.find(item => item.id === category)?.nombre || 'Selección'

  return (
    <main className={`menu-page menu-page--${mode}`}>
      <header className="menu-header glass-surface">
        <div>
          <p className="eyebrow">MESSA · CARTA DIGITAL</p>
          <h1>{restaurantName}</h1>
          {contextLabel && <small>{contextLabel}</small>}
        </div>
        <div className="menu-header__actions">
          <PublicThemeToggle compact />
          {status || (mode === 'readonly' && <span className="read-only-badge"><Check size={14} /> Solo lectura</span>)}
        </div>
      </header>

      <section className="menu-intro">
        <p className="eyebrow">{mode === 'readonly' ? 'EXPLORÁ A TU RITMO' : 'TU MESA, TU EXPERIENCIA'}</p>
        <h2>{mode === 'readonly' ? <>Una carta pensada<br />para disfrutar.</> : <>Elegí, personalizá<br />y disfrutá.</>}</h2>
        <p>{mode === 'readonly'
          ? 'Cuando estés en tu mesa, escaneá su QR para personalizar el pedido y enviarlo a cocina.'
          : 'Cada plato se prepara a tu manera. Revisá sus opciones antes de enviarlo a cocina.'}</p>
      </section>

      {principal && !query && category === 'todos' && (
        <button className="dish-hero" type="button" onClick={() => onSelect(principal)}>
          <DishMedia plato={principal} variant="hero" />
          <div className="dish-hero__copy">
            <span>RECOMENDACIÓN DEL CHEF</span>
            <h2>{principal.nombre}</h2>
            <p>{formatPrecio(principal.precio)}</p>
          </div>
        </button>
      )}

      {featured.length > 0 && !query && category === 'todos' && (
        <section className="chef-recommendations" aria-labelledby={`chef-title-${mode}`}>
          <header>
            <span className="chef-recommendations__icon"><ChefHat size={18} /></span>
            <div><p className="eyebrow">CURADURÍA DE LA CASA</p><h2 id={`chef-title-${mode}`}>Recomendados por el chef</h2></div>
            <span><Sparkles size={14} /> Selección destacada</span>
          </header>
          <div className="chef-recommendations__rail">
            {featured.map(dish => (
              <button type="button" key={dish.id} onClick={() => onSelect(dish)}>
                <DishMedia plato={dish} variant="thumbnail" />
                <span><b>{dish.nombre}</b><small>{formatPrecio(dish.precio)}</small></span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="menu-dock glass-surface" aria-label="Buscar, filtrar y elegir categoría">
        <label className="search-field"><Search size={18} /><input value={query} onChange={event => onQueryChange(event.target.value)} placeholder="Buscar en la carta" /></label>
        <button className="filter-button" type="button" onClick={() => onFiltersOpenChange(true)} aria-label="Abrir filtros">
          <SlidersHorizontal size={18} />{filters.length > 0 && <b>{filters.length}</b>}
        </button>
        <div className="category-scroller">
          <button className={category === 'todos' ? 'category-pill active' : 'category-pill'} type="button" onClick={() => onCategoryChange('todos')}>Todo</button>
          {categories.map(item => <button key={item.id} className={category === item.id ? 'category-pill active' : 'category-pill'} type="button" onClick={() => onCategoryChange(item.id)}>{item.nombre}</button>)}
        </div>
      </section>

      <section className="menu-list" aria-live="polite">
        <div className="section-heading"><div><p className="eyebrow">SELECCIÓN</p><h2>{categoryTitle}</h2></div><span>{dishes.length} platos</span></div>
        <div className={category === 'todos' ? 'dish-grid' : 'dish-category-rail'}>
          {dishes.map(dish => <DishEditorialCard key={dish.id} plato={dish} onSelect={onSelect} presentation={category === 'todos' ? 'portrait' : 'landscape'} />)}
        </div>
        {dishes.length === 0 && <div className="empty-state">No encontramos platos con esos filtros. Probá limpiar la búsqueda.</div>}
      </section>

      {children}

      {filtersOpen && (
        <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onFiltersOpenChange(false) }}>
          <section className="filter-sheet" role="dialog" aria-modal="true" aria-labelledby={`filters-title-${mode}`}>
            <div className="sheet-handle" />
            <div className="sheet-title">
              <div><p className="eyebrow">PREFERENCIAS</p><h2 id={`filters-title-${mode}`}>Filtrar la carta</h2></div>
              <button className="icon-button" type="button" onClick={() => onFiltersOpenChange(false)} aria-label="Cerrar filtros"><X size={18} /></button>
            </div>
            <div className="filter-options">
              {filterOptions.map(filter => <button key={filter} type="button" className={filters.includes(filter) ? 'filter-option selected' : 'filter-option'} onClick={() => onToggleFilter(filter)}><span>{filter}</span>{filters.includes(filter) && <Check size={17} />}</button>)}
            </div>
            <div className="sheet-actions">
              <button className="text-button" type="button" onClick={onClearFilters}>Limpiar</button>
              <button className="primary-button" type="button" onClick={() => onFiltersOpenChange(false)}>Ver {dishes.length} platos</button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
