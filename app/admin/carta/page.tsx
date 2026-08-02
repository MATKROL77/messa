'use client'

import { useMemo, useState } from 'react'
import { ArrowUpDown, Check, ChefHat, Clock3, Eye, EyeOff, FolderCog, GripVertical, ImageIcon, Link2, ListChecks, Pencil, Plus, Search, Sparkles, Star, Trash2, UtensilsCrossed } from 'lucide-react'
import { useStore } from '@/lib/store'
import type { Ingrediente, Insumo, Modificador, Plato } from '@/types'
import { formatPrecio, generarId } from '@/lib/utils'
import DishMedia from '@/components/menu/DishMedia'
import { useReordenar } from '@/lib/use-reordenar'
import ImageUploader from '@/components/ImageUploader'
import { AdminButton, AdminMetric, AdminPanel, AdminSegmented, AdminSheet, AdminStatus, AdminToast, AdminWorkspace } from '@/components/admin/admin-ui'

const EMPTY_PLATO: Omit<Plato, 'id' | 'rating' | 'total_reviews'> = {
  nombre: '',
  descripcion: '',
  precio: 0,
  precio_pendiente: false,
  categoria_id: 'entradas',
  ingredientes: [],
  insumos_requeridos: [],
  modificadores: [],
  tags: [],
  imagen_url: '',
  disponible: true,
  destacado: false,
  orden: 99,
  tiempo_preparacion_minutos: 15,
}

export default function CartaAdminPage() {
  const {
    platos,
    actualizarPlato,
    agregarPlato,
    eliminarPlato,
    toggleDestacado,
    reordenarPlato,
    toggleDisponible,
    categoriasDisponibles,
    agregarCategoria,
    eliminarCategoria,
    tagsDisponibles,
    agregarTagDisponible,
    eliminarTagDisponible,
    insumos,
    sucursalActualId,
  } = useStore()
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('todos')
  const [editando, setEditando] = useState<Plato | null>(null)
  const [nuevo, setNuevo] = useState<Omit<Plato, 'id' | 'rating' | 'total_reviews'> | null>(null)
  const [eliminando, setEliminando] = useState<Plato | null>(null)
  const [categoriasAbiertas, setCategoriasAbiertas] = useState(false)
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState('')
  const [toast, setToast] = useState('')

  const [reordenando, setReordenando] = useState(false)

  const showToast = (mensaje: string) => {
    setToast(mensaje)
    window.setTimeout(() => setToast(''), 2400)
  }

  const filtrados = useMemo(() => platos
    .filter(plato => categoria === 'todos' || plato.categoria_id === categoria)
    .filter(plato => `${plato.nombre} ${plato.descripcion}`.toLowerCase().includes(busqueda.toLowerCase()))
    .sort((a, b) => a.orden - b.orden), [busqueda, categoria, platos])

  const { arrastrandoId, propsContenedor, propsElemento, propsTirador } = useReordenar({
    selector: '.messa-admin-product',
    activo: reordenando,
    onMover: reordenarPlato,
  })

  const pendientesPrecio = platos.filter(plato => plato.precio_pendiente || plato.precio <= 0).length
  const activos = platos.filter(plato => plato.disponible).length

  const guardarEdicion = () => {
    if (!editando?.nombre.trim()) return showToast('El nombre es obligatorio')
    if (editando.precio <= 0 && !editando.precio_pendiente) return showToast('Definí el precio o marcá precio pendiente')
    actualizarPlato(editando)
    setEditando(null)
    showToast('Producto actualizado')
  }

  const crearProducto = () => {
    if (!nuevo?.nombre.trim()) return showToast('El nombre es obligatorio')
    if (nuevo.precio <= 0 && !nuevo.precio_pendiente) return showToast('Definí el precio o marcá precio pendiente')
    agregarPlato(nuevo)
    setNuevo(null)
    showToast('Producto agregado a la carta')
  }

  const confirmarEliminacion = () => {
    if (!eliminando) return
    eliminarPlato(eliminando.id)
    setEliminando(null)
    showToast('Producto retirado de la carta')
  }

  return (
    <AdminWorkspace
      eyebrow="Carta editorial"
      title="La carta"
      description="Los 20 productos aprobados, sus assets transparentes y toda la información operativa viven en un único catálogo."
      actions={(
        <>
          <AdminButton
            tone={reordenando ? 'primary' : 'neutral'}
            icon={reordenando ? Check : ArrowUpDown}
            onClick={() => { setReordenando(valor => !valor); if (!reordenando) showToast('Arrastrá cada plato al lugar que quieras') }}
          >
            {reordenando ? 'Listo' : 'Reordenar'}
          </AdminButton>
          <AdminButton tone="neutral" icon={FolderCog} onClick={() => setCategoriasAbiertas(true)}>Categorías</AdminButton>
          <AdminButton tone="primary" icon={Plus} onClick={() => setNuevo({ ...EMPTY_PLATO })}>Nuevo producto</AdminButton>
        </>
      )}
    >
      <AdminToast>{toast}</AdminToast>

      <div className="messa-metrics">
        <AdminMetric label="Productos" value={`${platos.length}`} detail="Catálogo aprobado" Icon={UtensilsCrossed} tone="gold" progress={100} />
        <AdminMetric label="Visibles" value={`${activos}`} detail={`${platos.length - activos} ocultos temporalmente`} Icon={Eye} tone="green" progress={(activos / Math.max(platos.length, 1)) * 100} />
        <AdminMetric label="Categorías" value={`${categoriasDisponibles.length}`} detail="Navegación pública" Icon={FolderCog} tone="blue" progress={80} />
        <AdminMetric label="Precio pendiente" value={`${pendientesPrecio}`} detail={pendientesPrecio ? 'Requiere definición' : 'Todo completo'} Icon={Sparkles} tone={pendientesPrecio ? 'amber' : 'green'} progress={100 - (pendientesPrecio / Math.max(platos.length, 1)) * 100} />
      </div>

      <AdminPanel className="messa-catalog-panel">
        <div className="messa-catalog-toolbar">
          <label className="messa-search">
            <Search size={16} aria-hidden="true" />
            <input value={busqueda} onChange={event => setBusqueda(event.target.value)} placeholder="Buscar producto o descripción" aria-label="Buscar en la carta" />
          </label>
          <AdminSegmented
            value={categoria}
            onChange={setCategoria}
            label="Filtrar por categoría"
            items={[
              { value: 'todos', label: 'Todo', count: platos.length },
              ...categoriasDisponibles.map(item => ({ value: item.id, label: item.nombre, count: platos.filter(plato => plato.categoria_id === item.id).length })),
            ]}
          />
        </div>

        {reordenando && (
          <p className="messa-reorder-hint">
            <GripVertical size={15} aria-hidden="true" />
            Agarrá cualquier plato y deslizalo hasta donde quieras. El orden es el mismo que ven los comensales en la carta.
          </p>
        )}

        <div
          className={`messa-admin-product-grid${reordenando ? ' is-reordenando' : ''}`}
          {...propsContenedor}
        >
          {filtrados.map((plato, indice) => {
            const categoriaActual = categoriasDisponibles.find(item => item.id === plato.categoria_id)
            const vecinos = { anterior: filtrados[indice - 1]?.id, siguiente: filtrados[indice + 1]?.id }
            return (
              <AdminPanel
                className={`messa-admin-product${arrastrandoId === plato.id ? ' is-arrastrando' : ''}`}
                key={plato.id}
                data-reorder-id={plato.id}
                {...(reordenando ? propsElemento(plato.id) : {})}
              >
                {reordenando && (
                  <button
                    type="button"
                    className="messa-reorder-handle"
                    aria-label={`Mover ${plato.nombre}. Usá las flechas para cambiarlo de lugar.`}
                    {...propsTirador(plato.id, vecinos)}
                  >
                    <GripVertical size={16} aria-hidden="true" />
                    <span>{indice + 1}</span>
                  </button>
                )}
                <div className="messa-admin-product__media"><DishMedia plato={plato} variant="card" /></div>
                <div className="messa-admin-product__body">
                  <div className="messa-admin-product__meta">
                    <AdminStatus tone={plato.disponible ? 'green' : 'rose'}>{plato.disponible ? 'Visible' : 'Oculto'}</AdminStatus>
                    <span className="messa-status messa-status--gold"><Star size={10} fill="currentColor" />{plato.rating || 'Nuevo'}</span>
                  </div>
                  <p className="messa-kicker">{categoriaActual?.nombre || 'Sin categoría'}</p>
                  <h2>{plato.nombre}</h2>
                  <p className="messa-admin-product__description">{plato.descripcion}</p>
                  <div className="messa-admin-product__footer">
                    <strong className="messa-admin-product__price">
                      <small>{plato.tiempo_preparacion_minutos ? `${plato.tiempo_preparacion_minutos} min` : 'Tiempo sin definir'}</small>
                      {plato.precio_pendiente || plato.precio <= 0 ? 'Precio pendiente' : formatPrecio(plato.precio)}
                    </strong>
                    <div className="messa-admin-product__actions">
                      <button type="button" data-no-arrastrar="1" onClick={() => toggleDestacado(plato.id)} aria-label={plato.destacado ? `Quitar ${plato.nombre} de destacados` : `Destacar ${plato.nombre}`} title="Recomendación del chef"><Star size={15} fill={plato.destacado ? 'currentColor' : 'none'} /></button>
                      <button type="button" data-no-arrastrar="1" onClick={() => toggleDisponible(plato.id)} aria-label={plato.disponible ? `Ocultar ${plato.nombre}` : `Mostrar ${plato.nombre}`} title={plato.disponible ? 'Ocultar' : 'Mostrar'}>{plato.disponible ? <Eye size={15} /> : <EyeOff size={15} />}</button>
                      <button type="button" data-no-arrastrar="1" onClick={() => setEditando({ ...plato })} aria-label={`Editar ${plato.nombre}`} title="Editar"><Pencil size={15} /></button>
                      <button type="button" data-no-arrastrar="1" onClick={() => setEliminando(plato)} aria-label={`Eliminar ${plato.nombre}`} title="Eliminar"><Trash2 size={15} /></button>
                    </div>
                  </div>
                </div>
              </AdminPanel>
            )
          })}
        </div>
      </AdminPanel>

      <ProductSheet
        form={editando}
        title={editando ? `Editar ${editando.nombre}` : ''}
        categorias={categoriasDisponibles}
        etiquetas={tagsDisponibles}
        insumos={insumos.filter(item => item.sucursal_id === sucursalActualId)}
        productos={platos}
        onChange={form => setEditando(form as Plato | null)}
        onClose={() => setEditando(null)}
        onSave={guardarEdicion}
      />
      <ProductSheet
        form={nuevo}
        title="Nuevo producto"
        categorias={categoriasDisponibles}
        etiquetas={tagsDisponibles}
        insumos={insumos.filter(item => item.sucursal_id === sucursalActualId)}
        productos={platos}
        onChange={form => setNuevo(form as Omit<Plato, 'id' | 'rating' | 'total_reviews'> | null)}
        onClose={() => setNuevo(null)}
        onSave={crearProducto}
      />

      <AdminSheet open={categoriasAbiertas} onClose={() => setCategoriasAbiertas(false)} eyebrow="Organización" title="Categorías y etiquetas">
        <div className="messa-category-list">
          {categoriasDisponibles.map(item => (
            <div className="messa-category-row" key={item.id}>
              <span><b>{item.nombre}</b><small>{platos.filter(plato => plato.categoria_id === item.id).length} productos</small></span>
              <AdminButton tone="quiet" icon={Trash2} onClick={() => {
                const resultado = eliminarCategoria(item.id)
                showToast(resultado.ok ? 'Categoría eliminada' : resultado.error || 'No se pudo eliminar')
              }}>Eliminar</AdminButton>
            </div>
          ))}
        </div>
        <div className="messa-form-field">
          <label htmlFor="nueva-categoria">Nueva categoría</label>
          <div className="messa-inline-form">
            <input id="nueva-categoria" className="input-premium" value={nuevaCategoria} onChange={event => setNuevaCategoria(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); if (nuevaCategoria.trim()) { agregarCategoria(nuevaCategoria.trim(), '•'); setNuevaCategoria(''); showToast('Categoría creada') } } }} placeholder="Ej. Pizzas" />
            <AdminButton tone="primary" icon={Plus} onClick={() => {
              if (!nuevaCategoria.trim()) return
              agregarCategoria(nuevaCategoria.trim(), '•')
              setNuevaCategoria('')
              showToast('Categoría creada')
            }}>Agregar</AdminButton>
          </div>
        </div>

        {/* Las etiquetas dietarias son las que el comensal usa para filtrar la
            carta. Antes sólo se podían escribir sueltas en cada producto, sin
            un lugar donde ver ni depurar la lista completa. */}
        <div className="messa-form-field messa-form-field--wide">
          <label htmlFor="nueva-etiqueta">Etiquetas dietarias · filtros de la carta pública</label>
          <div className="messa-tag-list">
            {tagsDisponibles.map(tag => {
              const enUso = platos.filter(plato => plato.tags.includes(tag)).length
              return (
                <span key={tag}>
                  <b>{tag}</b><small>{enUso}</small>
                  <button type="button" aria-label={`Eliminar la etiqueta ${tag}`} onClick={() => { eliminarTagDisponible(tag); showToast('Etiqueta eliminada') }}><Trash2 size={13} /></button>
                </span>
              )
            })}
            {tagsDisponibles.length === 0 && <p className="messa-form-hint">Sin etiquetas todavía.</p>}
          </div>
          <div className="messa-inline-form">
            <input id="nueva-etiqueta" className="input-premium" value={nuevaEtiqueta} onChange={event => setNuevaEtiqueta(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); if (nuevaEtiqueta.trim()) { agregarTagDisponible(nuevaEtiqueta); setNuevaEtiqueta(''); showToast('Etiqueta creada') } } }} placeholder="Ej. Sin Lactosa" />
            <AdminButton tone="primary" icon={Plus} onClick={() => {
              if (!nuevaEtiqueta.trim()) return
              agregarTagDisponible(nuevaEtiqueta)
              setNuevaEtiqueta('')
              showToast('Etiqueta creada')
            }}>Agregar</AdminButton>
          </div>
        </div>
      </AdminSheet>

      <AdminSheet
        open={Boolean(eliminando)}
        onClose={() => setEliminando(null)}
        eyebrow="Confirmación"
        title="Retirar producto"
        footer={(
          <>
            <AdminButton tone="neutral" onClick={() => setEliminando(null)}>Cancelar</AdminButton>
            <AdminButton tone="danger" icon={Trash2} onClick={confirmarEliminacion}>Eliminar</AdminButton>
          </>
        )}
      >
        <div className="messa-confirmation">
          <span><Trash2 size={22} /></span>
          <h3>¿Retirar {eliminando?.nombre}?</h3>
          <p>Dejará de aparecer en la carta pública. Esta acción modifica el catálogo persistido.</p>
        </div>
      </AdminSheet>
    </AdminWorkspace>
  )
}

function ProductSheet<T extends Plato | Omit<Plato, 'id' | 'rating' | 'total_reviews'>>({ form, title, categorias, etiquetas, insumos, productos, onChange, onClose, onSave }: {
  form: T | null
  title: string
  categorias: { id: string; nombre: string }[]
  etiquetas: string[]
  insumos: Insumo[]
  productos: Plato[]
  onChange: (form: T | null) => void
  onClose: () => void
  onSave: () => void
}) {
  const [ingrediente, setIngrediente] = useState('')
  const [maridajeId, setMaridajeId] = useState('')
  if (!form) return null

  const update = <K extends keyof T>(key: K, value: T[K]) => onChange({ ...form, [key]: value })
  const addIngredient = () => {
    if (!ingrediente.trim()) return
    const item: Ingrediente = { id: generarId(), nombre: ingrediente.trim(), removible: true }
    update('ingredientes', [...form.ingredientes, item] as T['ingredientes'])
    setIngrediente('')
  }
  const updateModificadores = (modificadores: Modificador[]) => update('modificadores', modificadores as T['modificadores'])
  const addModifier = (tipo: Modificador['tipo']) => {
    const esCoccion = tipo === 'coccion'
    updateModificadores([...form.modificadores, {
      id: generarId(),
      nombre: esCoccion ? 'Punto de cocción' : tipo === 'acompanamiento' ? 'Acompañamiento' : 'Opciones',
      tipo,
      obligatorio: esCoccion,
      multiple: false,
      opciones: esCoccion
        ? [
          { id: generarId(), nombre: 'Jugoso', precio_extra: 0 },
          { id: generarId(), nombre: 'A punto', precio_extra: 0 },
          { id: generarId(), nombre: 'Bien cocido', precio_extra: 0 },
        ]
        : [],
    }])
  }
  const addPairing = () => {
    const producto = productos.find(item => item.id === maridajeId)
    if (!producto || producto.id === ('id' in form ? form.id : '')) return
    const actuales = form.maridaje || []
    if (actuales.some(item => item.plato_id === producto.id)) return
    update('maridaje', [...actuales, { plato_id: producto.id, nombre: producto.nombre, precio: producto.precio, emoji: '✦', porcentaje_conversion: 0 }] as T['maridaje'])
    setMaridajeId('')
  }

  return (
    <AdminSheet
      open
      onClose={onClose}
      eyebrow="Editor de carta"
      title={title}
      wide
      footer={(
        <>
          <AdminButton tone="neutral" onClick={onClose}>Cancelar</AdminButton>
          <AdminButton tone="primary" onClick={onSave}>Guardar cambios</AdminButton>
        </>
      )}
    >
      <div className="messa-product-form">
        <div className="messa-form-field messa-form-field--wide">
          <label htmlFor="producto-nombre">Nombre</label>
          <input id="producto-nombre" className="input-premium" value={form.nombre} onChange={event => update('nombre', event.target.value as T['nombre'])} />
        </div>
        <div className="messa-form-field messa-form-field--wide">
          <label htmlFor="producto-descripcion">Descripción</label>
          <textarea id="producto-descripcion" className="input-premium" rows={3} value={form.descripcion} onChange={event => update('descripcion', event.target.value as T['descripcion'])} />
        </div>
        <div className="messa-form-field">
          <label htmlFor="producto-precio">Precio</label>
          <input id="producto-precio" className="input-premium" type="number" min="0" value={form.precio} onChange={event => update('precio', Number(event.target.value) as T['precio'])} />
        </div>
        <div className="messa-form-field">
          <label htmlFor="producto-categoria">Categoría</label>
          <select id="producto-categoria" className="input-premium" value={form.categoria_id} onChange={event => update('categoria_id', event.target.value as T['categoria_id'])}>
            {categorias.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}
          </select>
        </div>
        <div className="messa-form-field">
          <label htmlFor="producto-tiempo">Tiempo de preparación</label>
          <div className="messa-field-with-icon"><Clock3 size={15} /><input id="producto-tiempo" className="input-premium" type="number" min="1" value={form.tiempo_preparacion_minutos || ''} onChange={event => update('tiempo_preparacion_minutos', Number(event.target.value) as T['tiempo_preparacion_minutos'])} /><span>min</span></div>
        </div>
        <div className="messa-form-field messa-form-field--checks">
          <label><input type="checkbox" checked={Boolean(form.disponible)} onChange={event => update('disponible', event.target.checked as T['disponible'])} />Visible en la carta</label>
          <label><input type="checkbox" checked={Boolean(form.destacado)} onChange={event => update('destacado', event.target.checked as T['destacado'])} />Recomendación del chef</label>
          <label><input type="checkbox" checked={Boolean(form.precio_pendiente)} onChange={event => update('precio_pendiente', event.target.checked as T['precio_pendiente'])} />Precio pendiente</label>
        </div>
        <div className="messa-form-field messa-form-field--wide">
          <label><ImageIcon size={14} /> Asset del producto</label>
          <ImageUploader value={form.imagen_url} onChange={url => update('imagen_url', url as T['imagen_url'])} />
        </div>
        <div className="messa-form-field messa-form-field--wide">
          <label>Ingredientes interactivos</label>
          <div className="messa-ingredient-list">
            {form.ingredientes.map(item => (
              <button type="button" key={item.id} onClick={() => update('ingredientes', form.ingredientes.map(ingredienteActual => ingredienteActual.id === item.id ? { ...ingredienteActual, removible: !ingredienteActual.removible } : ingredienteActual) as T['ingredientes'])}>
                {item.nombre}<small>{item.removible ? 'removible' : 'fijo'}</small>
              </button>
            ))}
          </div>
          <div className="messa-inline-form">
            <input className="input-premium" value={ingrediente} onChange={event => setIngrediente(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addIngredient() } }} placeholder="Agregar ingrediente" />
            <AdminButton tone="neutral" icon={Plus} onClick={addIngredient}>Agregar</AdminButton>
          </div>
        </div>

        <div className="messa-form-field messa-form-field--wide messa-form-section">
          <div className="messa-form-section__heading">
            <span><Link2 size={15} /><b>Receta vinculada al inventario</b><small>El consumo se descuenta al confirmar cada pedido.</small></span>
            <AdminButton tone="neutral" icon={Plus} onClick={() => update('insumos_requeridos', [...form.insumos_requeridos, { insumo_id: insumos[0]?.id || '', cantidad_por_porcion: 0 }] as T['insumos_requeridos'])}>Vincular insumo</AdminButton>
          </div>
          <div className="messa-recipe-editor">
            {form.insumos_requeridos.map((requerido, index) => {
              const insumo = insumos.find(item => item.id === requerido.insumo_id)
              return (
                <div className="messa-recipe-row" key={`${requerido.insumo_id}-${index}`}>
                  <select className="input-premium" value={requerido.insumo_id} onChange={event => update('insumos_requeridos', form.insumos_requeridos.map((item, itemIndex) => itemIndex === index ? { ...item, insumo_id: event.target.value } : item) as T['insumos_requeridos'])}>
                    <option value="">Elegir insumo</option>
                    {insumos.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}
                  </select>
                  <label><input className="input-premium" type="number" min="0" step="0.01" value={requerido.cantidad_por_porcion} onChange={event => update('insumos_requeridos', form.insumos_requeridos.map((item, itemIndex) => itemIndex === index ? { ...item, cantidad_por_porcion: Number(event.target.value) } : item) as T['insumos_requeridos'])} /><span>{insumo?.unidad || 'unidad'} / porción</span></label>
                  <button type="button" onClick={() => update('insumos_requeridos', form.insumos_requeridos.filter((_, itemIndex) => itemIndex !== index) as T['insumos_requeridos'])} aria-label="Quitar insumo"><Trash2 size={15} /></button>
                </div>
              )
            })}
            {!form.insumos_requeridos.length && <p className="messa-form-hint">Sin receta vinculada. El producto no modificará stock hasta que agregues un insumo.</p>}
          </div>
        </div>

        <div className="messa-form-field messa-form-field--wide messa-form-section">
          <div className="messa-form-section__heading">
            <span><ListChecks size={15} /><b>Personalización y cocina</b><small>Punto de cocción, acompañamientos y extras con precio o consumo propio.</small></span>
            <div className="messa-form-section__actions">
              <AdminButton tone="neutral" icon={ChefHat} onClick={() => addModifier('coccion')}>Cocción</AdminButton>
              <AdminButton tone="neutral" icon={Plus} onClick={() => addModifier('acompanamiento')}>Acompañamiento</AdminButton>
            </div>
          </div>
          <div className="messa-modifier-editor">
            {form.modificadores.map((modificador, modifierIndex) => (
              <section className="messa-modifier-group" key={modificador.id}>
                <header>
                  <input className="input-premium" value={modificador.nombre} onChange={event => updateModificadores(form.modificadores.map((item, index) => index === modifierIndex ? { ...item, nombre: event.target.value } : item))} aria-label="Nombre del grupo" />
                  <select className="input-premium" value={modificador.tipo || 'otro'} onChange={event => updateModificadores(form.modificadores.map((item, index) => index === modifierIndex ? { ...item, tipo: event.target.value as Modificador['tipo'] } : item))}>
                    <option value="coccion">Cocción</option><option value="acompanamiento">Acompañamiento</option><option value="extra">Extra</option><option value="otro">Otro</option>
                  </select>
                  <label><input type="checkbox" checked={modificador.obligatorio} onChange={event => updateModificadores(form.modificadores.map((item, index) => index === modifierIndex ? { ...item, obligatorio: event.target.checked } : item))} />Obligatorio</label>
                  <label><input type="checkbox" checked={modificador.multiple} onChange={event => updateModificadores(form.modificadores.map((item, index) => index === modifierIndex ? { ...item, multiple: event.target.checked } : item))} />Múltiple</label>
                  <button type="button" onClick={() => updateModificadores(form.modificadores.filter((_, index) => index !== modifierIndex))} aria-label={`Eliminar ${modificador.nombre}`}><Trash2 size={15} /></button>
                </header>
                <div className="messa-modifier-options">
                  {modificador.opciones.map((opcion, optionIndex) => {
                    const consumo = opcion.insumos_requeridos?.[0]
                    return (
                      <div className="messa-modifier-option" key={opcion.id}>
                        <input className="input-premium" value={opcion.nombre} onChange={event => updateModificadores(form.modificadores.map((item, index) => index === modifierIndex ? { ...item, opciones: item.opciones.map((opcionActual, actualIndex) => actualIndex === optionIndex ? { ...opcionActual, nombre: event.target.value } : opcionActual) } : item))} placeholder="Nombre de la opción" />
                        <label><input className="input-premium" type="number" min="0" value={opcion.precio_extra} onChange={event => updateModificadores(form.modificadores.map((item, index) => index === modifierIndex ? { ...item, opciones: item.opciones.map((opcionActual, actualIndex) => actualIndex === optionIndex ? { ...opcionActual, precio_extra: Number(event.target.value) } : opcionActual) } : item))} /><span>$ extra</span></label>
                        <select className="input-premium" value={consumo?.insumo_id || ''} onChange={event => updateModificadores(form.modificadores.map((item, index) => index === modifierIndex ? { ...item, opciones: item.opciones.map((opcionActual, actualIndex) => actualIndex === optionIndex ? { ...opcionActual, insumos_requeridos: event.target.value ? [{ insumo_id: event.target.value, cantidad_por_porcion: consumo?.cantidad_por_porcion || 0 }] : [] } : opcionActual) } : item))}>
                          <option value="">Sin consumo extra</option>{insumos.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}
                        </select>
                        <input className="input-premium" aria-label="Cantidad extra por porción" type="number" min="0" step="0.01" disabled={!consumo?.insumo_id} value={consumo?.cantidad_por_porcion || 0} onChange={event => updateModificadores(form.modificadores.map((item, index) => index === modifierIndex ? { ...item, opciones: item.opciones.map((opcionActual, actualIndex) => actualIndex === optionIndex ? { ...opcionActual, insumos_requeridos: consumo ? [{ ...consumo, cantidad_por_porcion: Number(event.target.value) }] : [] } : opcionActual) } : item))} />
                        <button type="button" onClick={() => updateModificadores(form.modificadores.map((item, index) => index === modifierIndex ? { ...item, opciones: item.opciones.filter((_, actualIndex) => actualIndex !== optionIndex) } : item))} aria-label={`Eliminar ${opcion.nombre}`}><Trash2 size={14} /></button>
                      </div>
                    )
                  })}
                </div>
                <AdminButton tone="quiet" icon={Plus} onClick={() => updateModificadores(form.modificadores.map((item, index) => index === modifierIndex ? { ...item, opciones: [...item.opciones, { id: generarId(), nombre: 'Nueva opción', precio_extra: 0 }] } : item))}>Agregar opción</AdminButton>
              </section>
            ))}
          </div>
        </div>

        <div className="messa-form-field messa-form-field--wide">
          <label htmlFor="producto-nota-cocina">Nota fija para cocina</label>
          <textarea id="producto-nota-cocina" className="input-premium" rows={2} value={form.notas_cocina || ''} onChange={event => update('notas_cocina', event.target.value as T['notas_cocina'])} placeholder="Ej. Emplatar salsa aparte y confirmar alergias." />
        </div>
        <div className="messa-form-field messa-form-field--wide">
          <label>Etiquetas dietarias</label>
          <div className="messa-tag-picker">
            {etiquetas.map(tag => {
              const activo = form.tags.includes(tag)
              return (
                <button
                  type="button"
                  key={tag}
                  className={activo ? 'active' : ''}
                  aria-pressed={activo}
                  onClick={() => update('tags', (activo ? form.tags.filter(item => item !== tag) : [...form.tags, tag]) as T['tags'])}
                >
                  {activo && <Check size={13} />}{tag}
                </button>
              )
            })}
          </div>
          <p className="messa-form-hint">Estas etiquetas son los filtros que ve el comensal. Se administran desde el botón «Categorías».</p>
        </div>

        <div className="messa-form-field messa-form-field--wide messa-form-section">
          <div className="messa-form-section__heading">
            <span><Sparkles size={15} /><b>Maridajes y recomendaciones</b><small>Se muestran al costado del detalle del producto.</small></span>
          </div>
          <div className="messa-pairing-list">
            {(form.maridaje || []).map(item => <span key={item.plato_id}><b>{item.nombre}</b><small>{formatPrecio(item.precio)}</small><button type="button" onClick={() => update('maridaje', (form.maridaje || []).filter(actual => actual.plato_id !== item.plato_id) as T['maridaje'])} aria-label={`Quitar ${item.nombre}`}><Trash2 size={13} /></button></span>)}
          </div>
          <div className="messa-inline-form">
            <select className="input-premium" value={maridajeId} onChange={event => setMaridajeId(event.target.value)}>
              <option value="">Elegir producto recomendado</option>
              {productos.filter(item => item.id !== ('id' in form ? form.id : '')).map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
            <AdminButton tone="neutral" icon={Plus} onClick={addPairing}>Agregar</AdminButton>
          </div>
        </div>
      </div>
    </AdminSheet>
  )
}
