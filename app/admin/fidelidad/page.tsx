'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { formatPrecio } from '@/lib/utils'

export default function FidelidadPage() {
  const { fidelidadConfig, actualizarFidelidadConfig, recompensasFidelidad, agregarRecompensa, eliminarRecompensa, puntosClientes } = useStore()
  const [form, setForm] = useState(fidelidadConfig)
  const [creandoRecompensa, setCreandoRecompensa] = useState(false)
  const [nuevaRecompensa, setNuevaRecompensa] = useState({ nombre: '', descripcion: '', puntos_requeridos: 100, activa: true })
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2600) }
  const handleGuardar = () => { actualizarFidelidadConfig(form); showToast('Configuración de fidelidad guardada ✓') }
  const handleCrearRecompensa = () => {
    if (!nuevaRecompensa.nombre.trim()) { showToast('Ingresá un nombre'); return }
    agregarRecompensa(nuevaRecompensa)
    setNuevaRecompensa({ nombre: '', descripcion: '', puntos_requeridos: 100, activa: true })
    setCreandoRecompensa(false)
    showToast('Recompensa creada ✓')
  }

  const clientesTop = Object.entries(puntosClientes).sort((a, b) => b[1] - a[1]).slice(0, 10)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 40 }}>
      {toast && <div className="fade-in" style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', background: '#1C1C1C', border: '1px solid #383838', borderRadius: 100, padding: '10px 20px', fontSize: 13, color: '#fff', zIndex: 9999, whiteSpace: 'nowrap' }}>{toast}</div>}

      <div style={{ background: 'var(--bg)', borderBottom: '1px solid #1C1C1C', padding: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="font-titulos" style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Programa de Fidelidad</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707070' }}>👑 Exclusivo del creador</p>
          </div>
          <Link href="/admin" style={{ textDecoration: 'none', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#A0A0A0' }}>← Admin</Link>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: form.habilitado ? 'rgba(34,197,94,0.08)' : '#141414', border: form.habilitado ? '1px solid rgba(34,197,94,0.25)' : '1px solid #2A2A2A', borderRadius: 14, marginBottom: 20, cursor: 'pointer' }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: form.habilitado ? '#22C55E' : '#fff' }}>{form.habilitado ? '🟢 Programa activo' : '⚪ Programa desactivado'}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707070' }}>Activalo o desactivalo cuando quieras</p>
          </div>
          <input type="checkbox" checked={form.habilitado} onChange={e => setForm({ ...form, habilitado: e.target.checked })} style={{ width: 20, height: 20 }} />
        </label>

        {form.habilitado && (
          <>
            <p style={{ fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Cómo se ganan puntos</p>
            <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 14, padding: 16, marginBottom: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <p style={{ margin: '0 0 6px', fontSize: 13 }}>⭐ Puntos por dejar una reseña</p>
                <input type="number" value={form.puntos_por_resena} onChange={e => setForm({ ...form, puntos_por_resena: parseInt(e.target.value) || 0 })} className="input-premium" />
              </div>
              <div>
                <p style={{ margin: '0 0 6px', fontSize: 13 }}>💰 Puntos por cada $1.000 gastados</p>
                <input type="number" value={form.puntos_por_1000_gastado} onChange={e => setForm({ ...form, puntos_por_1000_gastado: parseInt(e.target.value) || 0 })} className="input-premium" />
                <p style={{ margin: '6px 0 0', fontSize: 11, color: '#484848' }}>Ej: con {form.puntos_por_1000_gastado} pts, gastar $10.000 da {form.puntos_por_1000_gastado * 10} puntos</p>
              </div>
            </div>
            <button onClick={handleGuardar} className="btn-gold" style={{ width: '100%', padding: 13, borderRadius: 14, border: 'none', fontSize: 14, cursor: 'pointer', marginBottom: 24 }}>Guardar reglas de puntos</button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 10px' }}>
              <p style={{ fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Recompensas canjeables</p>
              <button onClick={() => setCreandoRecompensa(true)} style={{ padding: '5px 12px', borderRadius: 100, background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)', color: 'var(--gold)', fontSize: 12, cursor: 'pointer' }}>+ Nueva</button>
            </div>
            {recompensasFidelidad.map(r => (
              <div key={r.id} style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 14, padding: '12px 16px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{r.nombre}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707070' }}>{r.descripcion}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 700 }}>{r.puntos_requeridos} pts</span>
                  <button onClick={() => eliminarRecompensa(r.id)} style={{ background: 'transparent', border: 'none', color: '#707070', cursor: 'pointer' }}>🗑</button>
                </div>
              </div>
            ))}

            {clientesTop.length > 0 && (
              <>
                <p style={{ fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '24px 0 10px' }}>🏆 Clientes con más puntos</p>
                {clientesTop.map(([email, pts]) => (
                  <div key={email} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1C1C1C', fontSize: 13 }}>
                    <span style={{ color: '#A0A0A0' }}>{email}</span>
                    <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{pts} pts</span>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {creandoRecompensa && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setCreandoRecompensa(false) }} style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div className="slide-up" style={{ width: '100%', maxWidth: 480, margin: '0 auto', background: '#141414', borderRadius: '20px 20px 0 0', padding: '20px 20px 40px' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>Nueva recompensa</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><p style={{ margin: '0 0 6px', fontSize: 12, color: '#707070' }}>Nombre</p><input value={nuevaRecompensa.nombre} onChange={e => setNuevaRecompensa({ ...nuevaRecompensa, nombre: e.target.value })} placeholder="Ej: Postre gratis" className="input-premium" /></div>
              <div><p style={{ margin: '0 0 6px', fontSize: 12, color: '#707070' }}>Descripción</p><input value={nuevaRecompensa.descripcion} onChange={e => setNuevaRecompensa({ ...nuevaRecompensa, descripcion: e.target.value })} placeholder="Detalle de la recompensa" className="input-premium" /></div>
              <div><p style={{ margin: '0 0 6px', fontSize: 12, color: '#707070' }}>Puntos requeridos</p><input type="number" value={nuevaRecompensa.puntos_requeridos} onChange={e => setNuevaRecompensa({ ...nuevaRecompensa, puntos_requeridos: parseInt(e.target.value) || 0 })} className="input-premium" /></div>
              <button onClick={handleCrearRecompensa} className="btn-gold" style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', fontSize: 15, cursor: 'pointer', marginTop: 8 }}>Crear recompensa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
