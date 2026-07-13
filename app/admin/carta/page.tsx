'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { Plato, Ingrediente, PaneraOpcion } from '@/types'
import { formatPrecio, generarId } from '@/lib/utils'
import PlatoImg from '@/components/PlatoImg'
import ImageUploader from '@/components/ImageUploader'

const EMPTY_PLATO: Omit<Plato, 'id' | 'rating' | 'total_reviews'> = {
  nombre: '', descripcion: '', precio: 0, categoria_id: 'entradas',
  ingredientes: [], insumos_requeridos: [], modificadores: [],
  tags: [], imagen_url: '', disponible: true, destacado: false, orden: 0,
}

const EMOJIS_CATEGORIA = ['🥗', '🍝', '🥩', '🐟', '🍮', '🍷', '🍕', '🍔', '🌮', '🍣', '🥘', '🧀', '🍰', '☕', '🍹']

export default function CartaAdminPage() {
  const { platos, actualizarPlato, agregarPlato, eliminarPlato, toggleDestacado, toggleDisponible, tagsDisponibles, agregarTagDisponible, categoriasDisponibles, agregarCategoria, eliminarCategoria, config, actualizarConfig } = useStore()
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('todos')
  const [editando, setEditando] = useState<Plato | null>(null)
  const [creando, setCreando] = useState(false)
  const [formNuevo, setFormNuevo] = useState({ ...EMPTY_PLATO })
  const [nuevaTag, setNuevaTag] = useState('')
  const [nuevoIng, setNuevoIng] = useState('')
  const [toast, setToast] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [mostrarCategorias, setMostrarCategorias] = useState(false)
  const [mostrarPanera, setMostrarPanera] = useState(false)
  const [nuevaCatNombre, setNuevaCatNombre] = useState('')
  const [nuevaCatEmoji, setNuevaCatEmoji] = useState('🍽️')
  const [paneraForm, setPaneraForm] = useState(config.panera)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2600) }

  const platosFiltrados = platos.filter(p => {
    if (categoriaFiltro !== 'todos' && p.categoria_id !== categoriaFiltro) return false
    if (busqueda && !p.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })

  const handleGuardar = () => {
    if (!editando) return
    if (!editando.nombre || editando.precio <= 0) { showToast('Completá nombre y precio'); return }
    actualizarPlato(editando)
    setEditando(null)
    showToast('Plato actualizado ✓')
  }

  const handleCrear = () => {
    if (!formNuevo.nombre || formNuevo.precio <= 0) { showToast('Completá nombre y precio'); return }
    agregarPlato(formNuevo)
    setFormNuevo({ ...EMPTY_PLATO })
    setCreando(false)
    showToast('Plato creado ✓')
  }

  const handleEliminar = (id: string) => { eliminarPlato(id); setConfirmDelete(null); showToast('Plato eliminado') }

  const handleAgregarCategoria = () => {
    if (!nuevaCatNombre.trim()) { showToast('Ingresá un nombre'); return }
    agregarCategoria(nuevaCatNombre, nuevaCatEmoji)
    setNuevaCatNombre('')
    showToast('Categoría creada ✓')
  }

  const handleEliminarCategoria = (id: string) => {
    const res = eliminarCategoria(id)
    if (res.ok) showToast('Categoría eliminada')
    else showToast(res.error || 'No se pudo eliminar')
  }

  const handleGuardarPanera = () => { actualizarConfig({ panera: paneraForm }); showToast('Configuración de bienvenida guardada ✓') }
  const agregarOpcionPanera = () => setPaneraForm({ ...paneraForm, opciones: [...paneraForm.opciones, { id: generarId(), nombre: '', precio: 0 }] })
  const actualizarOpcionPanera = (id: string, cambios: Partial<PaneraOpcion>) => setPaneraForm({ ...paneraForm, opciones: paneraForm.opciones.map(o => o.id === id ? { ...o, ...cambios } : o) })
  const eliminarOpcionPanera = (id: string) => setPaneraForm({ ...paneraForm, opciones: paneraForm.opciones.filter(o => o.id !== id) })

  const addTag = (form: any, setForm: any, tag: string) => { if (!tag.trim()) return; setForm({ ...form, tags: [...(form.tags || []), tag.trim()] }); setNuevaTag('') }
  const removeTag = (form: any, setForm: any, tag: string) => setForm({ ...form, tags: form.tags.filter((t: string) => t !== tag) })
  const addIng = (form: any, setForm: any, nombre: string) => { if (!nombre.trim()) return; const ing: Ingrediente = { id: generarId(), nombre: nombre.trim(), removible: true }; setForm({ ...form, ingredientes: [...(form.ingredientes || []), ing] }); setNuevoIng('') }
  const removeIng = (form: any, setForm: any, id: string) => setForm({ ...form, ingredientes: form.ingredientes.filter((i: Ingrediente) => i.id !== id) })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 40 }}>
      {toast && <div className="fade-in" style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', background: '#1C1C1C', border: '1px solid #383838', borderRadius: 100, padding: '10px 20px', fontSize: 13, color: '#fff', zIndex: 9999, whiteSpace: 'nowrap' }}>{toast}</div>}

      <div style={{ background: 'var(--bg)', borderBottom: '1px solid #1C1C1C', padding: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h1 className="font-titulos" style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Gestión de Carta</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707070' }}>{platos.length} platos · CMS</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setCreando(true); setEditando(null) }} className="btn-gold" style={{ padding: '8px 14px', borderRadius: 10, border: 'none', fontSize: 13, cursor: 'pointer' }}>+ Nuevo</button>
            <Link href="/admin" style={{ textDecoration: 'none', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#A0A0A0' }}>← Admin</Link>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <button onClick={() => setMostrarCategorias(true)} style={{ flex: 1, padding: 9, borderRadius: 10, background: '#1C1C1C', border: '1px solid #2A2A2A', color: '#A0A0A0', fontSize: 12, cursor: 'pointer' }}>🗂️ Categorías</button>
          <button onClick={() => { setPaneraForm(config.panera); setMostrarPanera(true) }} style={{ flex: 1, padding: 9, borderRadius: 10, background: '#1C1C1C', border: '1px solid #2A2A2A', color: '#A0A0A0', fontSize: 12, cursor: 'pointer' }}>🥖 Bienvenida</button>
        </div>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar plato..." className="input-premium" style={{ marginBottom: 10 }} />
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', whiteSpace: 'nowrap' }}>
          <CatBtn active={categoriaFiltro === 'todos'} onClick={() => setCategoriaFiltro('todos')} label="Todos" />
          {categoriasDisponibles.map(c => <CatBtn key={c.id} active={categoriaFiltro === c.id} onClick={() => setCategoriaFiltro(c.id)} label={`${c.emoji} ${c.nombre}`} />)}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {platosFiltrados.map(plato => (
          <div key={plato.id} style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 12, padding: '12px 14px', alignItems: 'center' }}>
              {plato.imagen_url && <div style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', flexShrink: 0, position: 'relative' }}><PlatoImg src={plato.imagen_url} alt={plato.nombre} /></div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plato.nombre}</p>
                  {plato.destacado && <span style={{ fontSize: 10, background: 'rgba(212,175,55,0.15)', color: 'var(--gold)', borderRadius: 100, padding: '2px 6px', flexShrink: 0 }}>⭐</span>}
                  {!plato.disponible && <span style={{ fontSize: 10, background: 'rgba(239,68,68,0.12)', color: '#EF4444', borderRadius: 100, padding: '2px 6px', flexShrink: 0 }}>Sin stock</span>}
                </div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--gold)', fontWeight: 600 }}>{formatPrecio(plato.precio)}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#707070' }}>{categoriasDisponibles.find(c => c.id === plato.categoria_id)?.nombre}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                <button onClick={() => { setEditando({ ...plato }); setCreando(false) }} style={{ padding: '5px 10px', borderRadius: 8, background: '#2A2A2A', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer' }}>✏️ Editar</button>
                <button onClick={() => toggleDestacado(plato.id)} style={{ padding: '5px 10px', borderRadius: 8, background: plato.destacado ? 'rgba(212,175,55,0.15)' : '#1C1C1C', border: plato.destacado ? '1px solid rgba(212,175,55,0.3)' : '1px solid #2A2A2A', color: plato.destacado ? 'var(--gold)' : '#707070', fontSize: 11, cursor: 'pointer' }}>⭐ Chef</button>
                <button onClick={() => toggleDisponible(plato.id)} style={{ padding: '5px 10px', borderRadius: 8, background: plato.disponible ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: 'none', color: plato.disponible ? '#22C55E' : '#EF4444', fontSize: 11, cursor: 'pointer' }}>{plato.disponible ? '✅ Activo' : '❌ Oculto'}</button>
                <button onClick={() => setConfirmDelete(plato.id)} style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: 'none', color: '#EF4444', fontSize: 11, cursor: 'pointer' }}>🗑 Borrar</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal editar/crear plato */}
      {(editando || creando) && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) { setEditando(null); setCreando(false) } }} style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div className="slide-up" style={{ width: '100%', maxWidth: 480, margin: '0 auto', background: '#141414', borderRadius: '20px 20px 0 0', maxHeight: '92vh', overflowY: 'auto', padding: '20px 20px 40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{creando ? 'Nuevo plato' : 'Editar plato'}</h2>
              <button onClick={() => { setEditando(null); setCreando(false) }} style={{ background: '#2A2A2A', border: 'none', borderRadius: 10, padding: '8px 14px', color: '#fff', cursor: 'pointer' }}>✕</button>
            </div>
            <PlatoForm form={editando || formNuevo} setForm={editando ? setEditando : setFormNuevo} nuevaTag={nuevaTag} setNuevaTag={setNuevaTag} nuevoIng={nuevoIng} setNuevoIng={setNuevoIng} addTag={addTag} removeTag={removeTag} addIng={addIng} removeIng={removeIng} tagsDisponibles={tagsDisponibles} agregarTagDisponible={agregarTagDisponible} categoriasDisponibles={categoriasDisponibles} />
            <button onClick={editando ? handleGuardar : handleCrear} className="btn-gold" style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', fontSize: 15, cursor: 'pointer', marginTop: 16 }}>{creando ? 'Crear plato' : 'Guardar cambios'}</button>
          </div>
        </div>
      )}

      {/* Modal categorías */}
      {mostrarCategorias && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setMostrarCategorias(false) }} style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div className="slide-up" style={{ width: '100%', maxWidth: 480, margin: '0 auto', background: '#141414', borderRadius: '20px 20px 0 0', maxHeight: '85vh', overflowY: 'auto', padding: '20px 20px 40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Categorías del menú</h2>
              <button onClick={() => setMostrarCategorias(false)} style={{ background: '#2A2A2A', border: 'none', borderRadius: 10, padding: '8px 14px', color: '#fff', cursor: 'pointer' }}>✕</button>
            </div>
            {categoriasDisponibles.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#1C1C1C', borderRadius: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 14 }}>{c.emoji} {c.nombre}</span>
                <button onClick={() => handleEliminarCategoria(c.id)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 12 }}>🗑</button>
              </div>
            ))}
            <p style={{ fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '20px 0 10px' }}>Nueva categoría</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {EMOJIS_CATEGORIA.map(e => <button key={e} onClick={() => setNuevaCatEmoji(e)} style={{ width: 38, height: 38, borderRadius: 10, fontSize: 16, cursor: 'pointer', background: nuevaCatEmoji === e ? 'rgba(212,175,55,0.15)' : '#1C1C1C', border: nuevaCatEmoji === e ? '1px solid rgba(212,175,55,0.4)' : '1px solid #2A2A2A' }}>{e}</button>)}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={nuevaCatNombre} onChange={e => setNuevaCatNombre(e.target.value)} placeholder="Nombre (ej: Pizzas)" className="input-premium" style={{ flex: 1 }} />
              <button onClick={handleAgregarCategoria} className="btn-gold" style={{ padding: '0 18px', borderRadius: 12, border: 'none', fontSize: 13, cursor: 'pointer' }}>+ Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal panera / bienvenida */}
      {mostrarPanera && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setMostrarPanera(false) }} style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div className="slide-up" style={{ width: '100%', maxWidth: 480, margin: '0 auto', background: '#141414', borderRadius: '20px 20px 0 0', maxHeight: '88vh', overflowY: 'auto', padding: '20px 20px 40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>🥖 Bienvenida al sentarse</h2>
              <button onClick={() => setMostrarPanera(false)} style={{ background: '#2A2A2A', border: 'none', borderRadius: 10, padding: '8px 14px', color: '#fff', cursor: 'pointer' }}>✕</button>
            </div>
            <p style={{ fontSize: 12, color: '#707070', margin: '0 0 16px', lineHeight: 1.6 }}>Se muestra una sola vez cuando el cliente se sienta por primera vez en una mesa. Podés ofrecer varias opciones (gratis o pagas) o desactivarlo.</p>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer' }}>
              <input type="checkbox" checked={paneraForm.habilitada} onChange={e => setPaneraForm({ ...paneraForm, habilitada: e.target.checked })} style={{ width: 18, height: 18 }} />
              <span style={{ fontSize: 14 }}>Habilitar popup de bienvenida</span>
            </label>
            {paneraForm.habilitada && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 12, color: '#707070' }}>Título del popup</p>
                  <input value={paneraForm.titulo} onChange={e => setPaneraForm({ ...paneraForm, titulo: e.target.value })} className="input-premium" />
                </div>
                <p style={{ fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Opciones (dejá precio en 0 para gratis)</p>
                {paneraForm.opciones.map(op => (
                  <div key={op.id} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input value={op.nombre} onChange={e => actualizarOpcionPanera(op.id, { nombre: e.target.value })} placeholder="Nombre de la opción" className="input-premium" style={{ flex: 1 }} />
                    <input type="number" value={op.precio} onChange={e => actualizarOpcionPanera(op.id, { precio: parseFloat(e.target.value) || 0 })} placeholder="$" className="input-premium" style={{ width: 90 }} />
                    <button onClick={() => eliminarOpcionPanera(op.id)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 10, color: '#EF4444', padding: '0 12px', cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
                <button onClick={agregarOpcionPanera} style={{ width: '100%', padding: 10, borderRadius: 10, background: '#1C1C1C', border: '1px dashed #2A2A2A', color: '#707070', fontSize: 13, cursor: 'pointer', marginBottom: 16 }}>+ Agregar opción</button>
              </>
            )}
            <button onClick={handleGuardarPanera} className="btn-gold" style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', fontSize: 15, cursor: 'pointer' }}>Guardar configuración</button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="overlay" style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="fade-in" style={{ background: '#1C1C1C', border: '1px solid #383838', borderRadius: 20, padding: 28, width: '100%', maxWidth: 320, textAlign: 'center' }}>
            <p style={{ fontSize: 32, margin: '0 0 12px' }}>🗑️</p>
            <h3 style={{ margin: '0 0 8px' }}>¿Eliminar plato?</h3>
            <p style={{ color: '#707070', fontSize: 14, margin: '0 0 24px' }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: 12, borderRadius: 12, background: '#2A2A2A', border: 'none', color: '#fff', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => handleEliminar(confirmDelete)} style={{ flex: 1, padding: 12, borderRadius: 12, background: '#EF4444', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PlatoForm({ form, setForm, nuevaTag, setNuevaTag, nuevoIng, setNuevoIng, addTag, removeTag, addIng, removeIng, tagsDisponibles, agregarTagDisponible, categoriasDisponibles }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Field label="Nombre *" value={form.nombre} onChange={(v: string) => setForm({ ...form, nombre: v })} placeholder="Ej: Ojo de bife 400g" />
      <Field label="Descripción" value={form.descripcion} onChange={(v: string) => setForm({ ...form, descripcion: v })} placeholder="Descripción del plato..." multiline />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div><p style={{ margin: '0 0 6px', fontSize: 12, color: '#707070' }}>Precio *</p><input type="number" value={form.precio || ''} onChange={e => setForm({ ...form, precio: parseFloat(e.target.value) || 0 })} placeholder="5800" className="input-premium" /></div>
        <div>
          <p style={{ margin: '0 0 6px', fontSize: 12, color: '#707070' }}>Categoría</p>
          <select value={form.categoria_id} onChange={e => setForm({ ...form, categoria_id: e.target.value })} className="input-premium" style={{ appearance: 'none' }}>
            {categoriasDisponibles.map((c: any) => <option key={c.id} value={c.id}>{c.emoji} {c.nombre}</option>)}
          </select>
        </div>
      </div>

      <ImageUploader value={form.imagen_url} onChange={(url: string) => setForm({ ...form, imagen_url: url })} />

      <p style={{ fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Información nutricional</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[['calorias', 'Calorías (kcal)'], ['proteinas', 'Proteínas (g)'], ['carbohidratos', 'Carbos (g)'], ['grasas', 'Grasas (g)']].map(([k, l]) => (
          <div key={k}><p style={{ margin: '0 0 4px', fontSize: 11, color: '#707070' }}>{l}</p><input type="number" value={(form as any)[k] || ''} onChange={e => setForm({ ...form, [k]: parseFloat(e.target.value) || undefined })} placeholder="0" className="input-premium" /></div>
        ))}
      </div>

      <div>
        <p style={{ margin: '0 0 8px', fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Etiquetas</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          {tagsDisponibles.map((tag: string) => (
            <button key={tag} onClick={() => form.tags?.includes(tag) ? removeTag(form, setForm, tag) : addTag(form, setForm, tag)} style={{ padding: '5px 10px', borderRadius: 100, fontSize: 12, cursor: 'pointer', background: form.tags?.includes(tag) ? 'rgba(212,175,55,0.15)' : '#1C1C1C', color: form.tags?.includes(tag) ? 'var(--gold)' : '#707070', border: form.tags?.includes(tag) ? '1px solid rgba(212,175,55,0.4)' : '1px solid #2A2A2A' }}>{tag}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={nuevaTag} onChange={e => setNuevaTag(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && nuevaTag.trim()) { agregarTagDisponible(nuevaTag.trim()); addTag(form, setForm, nuevaTag.trim()) } }} placeholder="Crear etiqueta nueva (ej: Sin Lactosa)..." className="input-premium" style={{ flex: 1 }} />
          <button onClick={() => { if (nuevaTag.trim()) { agregarTagDisponible(nuevaTag.trim()); addTag(form, setForm, nuevaTag.trim()); setNuevaTag('') } }} style={{ padding: '8px 14px', borderRadius: 10, background: '#2A2A2A', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13 }}>+ Crear</button>
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 11, color: '#484848' }}>Las etiquetas nuevas quedan disponibles para todos los futuros platos.</p>
      </div>

      <div>
        <p style={{ margin: '0 0 8px', fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ingredientes</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input value={nuevoIng} onChange={e => setNuevoIng(e.target.value)} onKeyDown={e => e.key === 'Enter' && addIng(form, setForm, nuevoIng)} placeholder="Ej: Trufa negra" className="input-premium" style={{ flex: 1 }} />
          <button onClick={() => addIng(form, setForm, nuevoIng)} style={{ padding: '8px 14px', borderRadius: 10, background: '#2A2A2A', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13 }}>+</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {form.ingredientes?.map((ing: any) => (
            <div key={ing.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 100, padding: '4px 10px' }}>
              <span style={{ fontSize: 12, color: '#A0A0A0' }}>{ing.nombre}</span>
              <button onClick={() => setForm({ ...form, ingredientes: form.ingredientes.map((i: any) => i.id === ing.id ? { ...i, removible: !i.removible } : i) })} style={{ fontSize: 9, background: ing.removible ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)', color: ing.removible ? '#22C55E' : '#EF4444', border: 'none', borderRadius: 100, padding: '2px 5px', cursor: 'pointer' }}>{ing.removible ? 'removible' : 'fijo'}</button>
              <button onClick={() => removeIng(form, setForm, ing.id)} style={{ background: 'transparent', border: 'none', color: '#707070', cursor: 'pointer', fontSize: 12, padding: 0 }}>✕</button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        {[['disponible', '✅ Disponible en carta'], ['destacado', '⭐ Recomendación del Chef']].map(([k, l]) => (
          <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
            <input type="checkbox" checked={!!(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.checked })} style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: 13, color: '#A0A0A0' }}>{l}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, multiline }: any) {
  return (
    <div>
      <p style={{ margin: '0 0 6px', fontSize: 12, color: '#707070' }}>{label}</p>
      {multiline ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} className="input-premium" style={{ resize: 'none' }} /> : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="input-premium" />}
    </div>
  )
}

function CatBtn({ active, onClick, label }: any) {
  return <button onClick={onClick} style={{ borderRadius: 100, padding: '5px 12px', fontSize: 12, cursor: 'pointer', flexShrink: 0, background: active ? 'rgba(212,175,55,0.15)' : '#1C1C1C', color: active ? 'var(--gold)' : '#A0A0A0', border: active ? '1px solid rgba(212,175,55,0.4)' : '1px solid #2A2A2A', fontWeight: active ? 600 : 400 }}>{label}</button>
}
