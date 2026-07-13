'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { Plato } from '@/types'
import { formatPrecio } from '@/lib/utils'
import PlatoImg from '@/components/PlatoImg'

export default function VistaPage() {
  const { iniciarModoVista, platos, config, categoriasDisponibles } = useStore()
  const [categoriaActiva, setCategoriaActiva] = useState('todos')
  const [filtros, setFiltros] = useState<string[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [busquedaOpen, setBusquedaOpen] = useState(false)
  const [platoActivo, setPlatoActivo] = useState<Plato | null>(null)

  useEffect(() => { iniciarModoVista() }, [iniciarModoVista])

  const platosDisponibles = platos.filter(p => p.disponible)
  const platosDestacados = platosDisponibles.filter(p => p.destacado && config.chef_recomendaciones_habilitadas)

  const platosFiltrados = platosDisponibles.filter(p => {
    if (categoriaActiva !== 'todos' && p.categoria_id !== categoriaActiva) return false
    if (filtros.includes('Sin TACC') && !p.tags.includes('Sin TACC')) return false
    if (filtros.includes('Vegetariano') && !p.tags.includes('Vegetariano')) return false
    if (busqueda && !p.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })

  const toggleFiltro = (f: string) => setFiltros(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 60 }}>
      <div style={{ background: 'var(--bg)', borderBottom: '1px solid #1C1C1C', padding: '14px 16px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div>
            <h1 className="font-titulos" style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{config.nombre}</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#707070', marginTop: 2 }}>Explorando la carta</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 100, padding: '4px 10px', fontSize: 11, fontWeight: 500 }}>👁 Solo lectura</span>
            <button onClick={() => setBusquedaOpen(!busquedaOpen)} style={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 10, padding: 8, cursor: 'pointer', fontSize: 16 }}>🔍</button>
          </div>
        </div>
        {busquedaOpen && <input autoFocus value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar platos..." className="input-premium" style={{ marginTop: 8 }} />}
      </div>

      <div style={{ margin: '12px 16px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 14, padding: '14px 16px' }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#3B82F6' }}>👁️ Estás explorando la carta</p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#707070', lineHeight: 1.5 }}>Cuando te sientes, escaneá el QR o acercá tu celular al NFC de tu mesa para empezar a pedir. Cada mesa tiene su propio código — no podés elegir una al azar desde acá.</p>
      </div>

      <div style={{ padding: '8px 16px 0', display: 'flex', gap: 8, overflowX: 'auto', whiteSpace: 'nowrap' }}>
        {['Sin TACC', 'Vegetariano', 'Vegano'].map(f => (
          <button key={f} onClick={() => toggleFiltro(f)} style={{ borderRadius: 100, padding: '5px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0, background: filtros.includes(f) ? 'rgba(212,175,55,0.15)' : '#1C1C1C', color: filtros.includes(f) ? 'var(--gold)' : '#A0A0A0', border: filtros.includes(f) ? '1px solid rgba(212,175,55,0.4)' : '1px solid #2A2A2A' }}>{f}</button>
        ))}
      </div>

      <div style={{ padding: '8px 16px', display: 'flex', gap: 8, overflowX: 'auto', whiteSpace: 'nowrap' }}>
        <CategBtn active={categoriaActiva === 'todos'} onClick={() => setCategoriaActiva('todos')} label="🍴 Todos" />
        {categoriasDisponibles.map(c => <CategBtn key={c.id} active={categoriaActiva === c.id} onClick={() => setCategoriaActiva(c.id)} label={`${c.emoji} ${c.nombre}`} />)}
      </div>

      {platosDestacados.length > 0 && categoriaActiva === 'todos' && !busqueda && (
        <div style={{ padding: '4px 16px 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 14 }}>⭐</span>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>Recomendaciones del Chef</p>
          </div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {platosDestacados.map(plato => (
              <div key={plato.id} className="card-hover" onClick={() => setPlatoActivo(plato)} style={{ flexShrink: 0, width: 150, background: '#141414', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 14, overflow: 'hidden', cursor: 'pointer' }}>
                <div style={{ position: 'relative', height: 95 }}><PlatoImg src={plato.imagen_url} alt={plato.nombre} /></div>
                <div style={{ padding: '8px 10px' }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>{plato.nombre}</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--gold)', fontWeight: 700 }}>{formatPrecio(plato.precio)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: '0 16px' }}>
        {platosFiltrados.map(plato => (
          <div key={plato.id} className="card-hover" onClick={() => setPlatoActivo(plato)} style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 16, marginBottom: 12, overflow: 'hidden', cursor: 'pointer' }}>
            <div style={{ position: 'relative', height: 180 }}>
              <PlatoImg src={plato.imagen_url} alt={plato.nombre} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />
              {plato.tags.map(t => <span key={t} style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: 100, padding: '3px 8px', fontSize: 10, backdropFilter: 'blur(4px)' }}>{t}</span>)}
              <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.6)', borderRadius: 100, padding: '3px 8px', backdropFilter: 'blur(4px)', display: 'flex', gap: 4, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--gold)' }}>★</span><span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>{plato.rating}</span>
              </div>
            </div>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{plato.nombre}</h3>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold)' }}>{formatPrecio(plato.precio)}</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#707070', lineHeight: 1.5 }}>{plato.descripcion}</p>
            </div>
          </div>
        ))}
      </div>

      {platoActivo && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setPlatoActivo(null) }} style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div className="slide-up" style={{ width: '100%', maxWidth: 480, margin: '0 auto', background: '#141414', borderRadius: '20px 20px 0 0', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ position: 'relative', height: 220 }}>
              <PlatoImg src={platoActivo.imagen_url} alt={platoActivo.nombre} style={{ borderRadius: '20px 20px 0 0' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #141414 0%, transparent 60%)', borderRadius: '20px 20px 0 0' }} />
              <button onClick={() => setPlatoActivo(null)} style={{ position: 'absolute', top: 14, left: 14, width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '16px 20px 40px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{platoActivo.nombre}</h2>
                <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)' }}>{formatPrecio(platoActivo.precio)}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--gold)' }}>★ {platoActivo.rating}</span>
                <span style={{ fontSize: 12, color: '#707070' }}>({platoActivo.total_reviews} reseñas)</span>
              </div>
              <p style={{ color: '#A0A0A0', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>{platoActivo.descripcion}</p>
              {platoActivo.ingredientes.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Ingredientes</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {platoActivo.ingredientes.map(ing => <span key={ing.id} style={{ borderRadius: 100, padding: '5px 12px', fontSize: 12, background: '#1C1C1C', color: '#A0A0A0', border: '1px solid #2A2A2A' }}>{ing.nombre}</span>)}
                  </div>
                </div>
              )}
              {config.mostrar_nutricion && platoActivo.calorias && (
                <div style={{ background: '#1C1C1C', borderRadius: 12, padding: 12, marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[['🔥', 'Calorías', `${platoActivo.calorias} kcal`], ['💪', 'Proteínas', `${platoActivo.proteinas}g`], ['🌾', 'Carbos', `${platoActivo.carbohidratos}g`], ['🥑', 'Grasas', `${platoActivo.grasas}g`]].map(([e, l, v]) => (
                    <div key={l as string} style={{ textAlign: 'center' }}><p style={{ margin: 0, fontSize: 10, color: '#707070' }}>{e} {l}</p><p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{v}</p></div>
                  ))}
                </div>
              )}
              <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 14, padding: 16, textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 13, color: '#A0A0A0', lineHeight: 1.5 }}>Sentate en tu mesa y escaneá el QR que está sobre ella para pedir este plato.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CategBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button onClick={onClick} style={{ borderRadius: 100, padding: '6px 14px', fontSize: 13, cursor: 'pointer', flexShrink: 0, background: active ? 'rgba(212,175,55,0.15)' : '#1C1C1C', color: active ? 'var(--gold)' : '#A0A0A0', border: active ? '1px solid rgba(212,175,55,0.4)' : '1px solid #2A2A2A', fontWeight: active ? 600 : 400 }}>{label}</button>
}
