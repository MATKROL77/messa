'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'

export default function SucursalesPage() {
  const { sucursales, sucursalActualId, setSucursalActual, crearSucursal, editarSucursal, eliminarSucursal, mesas, insumos } = useStore()
  const [creando, setCreando] = useState(false)
  const [form, setForm] = useState({ nombre: '', direccion: '', telefono: '' })
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2600) }

  const handleCrear = () => {
    if (!form.nombre.trim()) { showToast('Ingresá un nombre'); return }
    crearSucursal(form.nombre, form.direccion, form.telefono)
    setForm({ nombre: '', direccion: '', telefono: '' })
    setCreando(false)
    showToast('Sucursal creada ✓ — agregale mesas desde el Plano del Salón')
  }

  const handleEliminar = (id: string) => {
    const res = eliminarSucursal(id)
    if (res.ok) showToast('Sucursal eliminada')
    else showToast(res.error || 'No se pudo eliminar')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 40 }}>
      {toast && <div className="fade-in" style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', background: '#1C1C1C', border: '1px solid #383838', borderRadius: 100, padding: '10px 20px', fontSize: 13, color: '#fff', zIndex: 9999, whiteSpace: 'nowrap' }}>{toast}</div>}

      <div style={{ background: 'var(--bg)', borderBottom: '1px solid #1C1C1C', padding: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="font-titulos" style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Sucursales</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707070' }}>{sucursales.length} locales · gestión multi-sucursal</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setCreando(true)} className="btn-gold" style={{ padding: '8px 14px', borderRadius: 10, border: 'none', fontSize: 13, cursor: 'pointer' }}>+ Nueva</button>
            <Link href="/admin" style={{ textDecoration: 'none', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#A0A0A0' }}>← Admin</Link>
          </div>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 12, color: '#707070', lineHeight: 1.6 }}>📍 Cada sucursal tiene su propio plano de mesas, stock y cierre de caja independientes. La carta (menú) se comparte entre todas. Cambiá de sucursal activa con el selector arriba de cada pantalla de administración.</p>
        </div>

        {sucursales.map(suc => {
          const mesasCount = mesas.filter(m => m.sucursal_id === suc.id).length
          const insumosCount = insumos.filter(i => i.sucursal_id === suc.id).length
          const esActual = suc.id === sucursalActualId
          return (
            <div key={suc.id} style={{ background: '#141414', border: esActual ? '1px solid rgba(212,175,55,0.4)' : '1px solid #2A2A2A', borderRadius: 16, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{suc.nombre}</p>
                    {esActual && <span style={{ fontSize: 10, background: 'rgba(212,175,55,0.15)', color: 'var(--gold)', borderRadius: 100, padding: '2px 8px' }}>Activa</span>}
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#707070' }}>{suc.direccion}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707070' }}>{suc.telefono}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 12, color: '#A0A0A0' }}>
                <span>🍽️ {mesasCount} mesas</span>
                <span>📦 {insumosCount} insumos</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {!esActual && <button onClick={() => { setSucursalActual(suc.id); showToast(`Trabajando ahora en ${suc.nombre}`) }} style={{ flex: 1, padding: 9, borderRadius: 10, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', color: '#3B82F6', fontSize: 12, cursor: 'pointer' }}>📍 Cambiar a esta</button>}
                {sucursales.length > 1 && <button onClick={() => handleEliminar(suc.id)} style={{ flex: esActual ? 1 : undefined, padding: '9px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: 'none', color: '#EF4444', fontSize: 12, cursor: 'pointer' }}>🗑 Eliminar</button>}
              </div>
            </div>
          )
        })}
      </div>

      {creando && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setCreando(false) }} style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div className="slide-up" style={{ width: '100%', maxWidth: 480, margin: '0 auto', background: '#141414', borderRadius: '20px 20px 0 0', padding: '20px 20px 40px' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>Nueva sucursal</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><p style={{ margin: '0 0 5px', fontSize: 12, color: '#707070' }}>Nombre *</p><input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Kansas Puerto Madero" className="input-premium" /></div>
              <div><p style={{ margin: '0 0 5px', fontSize: 12, color: '#707070' }}>Dirección</p><input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} placeholder="Ej: Av. Alicia M. de Justo 1200" className="input-premium" /></div>
              <div><p style={{ margin: '0 0 5px', fontSize: 12, color: '#707070' }}>Teléfono</p><input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="11 0000-0000" className="input-premium" /></div>
              <button onClick={handleCrear} className="btn-gold" style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', fontSize: 15, cursor: 'pointer', marginTop: 8 }}>Crear sucursal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
