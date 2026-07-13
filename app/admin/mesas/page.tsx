'use client'
import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'

const ESTADO_COLOR: Record<string, string> = { libre: '#22C55E', ocupada: '#EF4444', pedido: '#F59E0B', pagando: '#D4AF37', pagada: '#22C55E' }

export default function MesasLayoutPage() {
  const { mesas, actualizarPosicionMesa, crearMesaLayout, eliminarMesaLayout, actualizarCapacidadMesa, sucursalActualId, sucursales } = useStore()
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null)
  const [arrastrandoId, setArrastrandoId] = useState<string | null>(null)
  const [capacidadInput, setCapacidadInput] = useState('')
  const [toast, setToast] = useState('')
  const canvasRef = useRef<HTMLDivElement>(null)

  const mesasSucursal = mesas.filter(m => m.sucursal_id === sucursalActualId)
  const seleccionada = mesasSucursal.find(m => m.id === seleccionadaId) || null
  const nombreSucursal = sucursales.find(s => s.id === sucursalActualId)?.nombre || ''

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2200) }

  const posDesdeEvento = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 50, y: 50 }
    return { x: ((clientX - rect.left) / rect.width) * 100, y: ((clientY - rect.top) / rect.height) * 100 }
  }, [])

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!arrastrandoId) return
    const { x, y } = posDesdeEvento(clientX, clientY)
    actualizarPosicionMesa(arrastrandoId, x, y)
  }, [arrastrandoId, posDesdeEvento, actualizarPosicionMesa])

  const handleEliminar = (mesaId: string) => {
    const res = eliminarMesaLayout(mesaId)
    if (res.ok) { showToast('Mesa eliminada'); setSeleccionadaId(null) }
    else showToast(res.error || 'No se pudo eliminar')
  }

  const handleCapacidadCustom = () => {
    const val = parseInt(capacidadInput)
    if (!seleccionada || isNaN(val) || val < 1 || val > 30) { showToast('Ingresá un número entre 1 y 30'); return }
    actualizarCapacidadMesa(seleccionada.id, val, seleccionada.forma)
    setCapacidadInput('')
    showToast(`Capacidad actualizada a ${val} ✓`)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 40 }}>
      {toast && <div className="fade-in" style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', background: '#1C1C1C', border: '1px solid #383838', borderRadius: 100, padding: '10px 20px', fontSize: 13, color: '#fff', zIndex: 9999, whiteSpace: 'nowrap' }}>{toast}</div>}

      <div style={{ background: 'var(--bg)', borderBottom: '1px solid #1C1C1C', padding: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <h1 className="font-titulos" style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Plano del Salón</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707070' }}>📍 {nombreSucursal} · arrastrá para ubicar</p>
          </div>
          <Link href="/admin" style={{ textDecoration: 'none', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#A0A0A0' }}>← Admin</Link>
        </div>
        <button onClick={() => { crearMesaLayout('redonda', 4); showToast('Mesa agregada — arrastrala a su lugar') }} className="btn-gold" style={{ width: '100%', padding: 10, borderRadius: 12, border: 'none', fontSize: 13, cursor: 'pointer' }}>+ Agregar mesa nueva</button>
      </div>

      <div style={{ padding: 16 }}>
        <div
          ref={canvasRef}
          onMouseMove={e => handleMove(e.clientX, e.clientY)}
          onMouseUp={() => setArrastrandoId(null)}
          onMouseLeave={() => setArrastrandoId(null)}
          onTouchMove={e => { if (arrastrandoId) { e.preventDefault(); const t = e.touches[0]; handleMove(t.clientX, t.clientY) } }}
          onTouchEnd={() => setArrastrandoId(null)}
          style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1.1', background: 'repeating-linear-gradient(0deg, #141414, #141414 24px, #171717 24px, #171717 25px), repeating-linear-gradient(90deg, #141414, #141414 24px, #171717 24px, #171717 25px)', border: '1px solid #2A2A2A', borderRadius: 16, touchAction: arrastrandoId ? 'none' : 'auto', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', top: 10, left: 10, fontSize: 10, color: '#484848', fontWeight: 600 }}>ENTRADA</div>
          {mesasSucursal.map(mesa => (
            <div
              key={mesa.id}
              onMouseDown={() => setArrastrandoId(mesa.id)}
              onTouchStart={() => setArrastrandoId(mesa.id)}
              onClick={() => { if (!arrastrandoId) setSeleccionadaId(mesa.id) }}
              style={{
                position: 'absolute', left: `${mesa.pos_x}%`, top: `${mesa.pos_y}%`, transform: 'translate(-50%, -50%)',
                width: mesa.forma === 'rectangular' ? 64 : 48, height: 48,
                borderRadius: mesa.forma === 'redonda' ? '50%' : 10,
                background: `${ESTADO_COLOR[mesa.estado]}20`, border: `2px solid ${ESTADO_COLOR[mesa.estado]}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                cursor: arrastrandoId === mesa.id ? 'grabbing' : 'grab', userSelect: 'none',
                boxShadow: seleccionadaId === mesa.id ? `0 0 0 3px ${ESTADO_COLOR[mesa.estado]}50` : 'none',
                zIndex: arrastrandoId === mesa.id ? 10 : 1
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: ESTADO_COLOR[mesa.estado] }}>{mesa.numero}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
          {Object.entries({ libre: 'Libre', ocupada: 'Ocupada', pedido: 'Con pedido', pagada: 'Pagada' }).map(([k, l]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#707070' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: ESTADO_COLOR[k] }} />{l}</div>
          ))}
        </div>

        <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 12, padding: 12, marginTop: 16 }}>
          <p style={{ margin: 0, fontSize: 12, color: '#A0A0A0', lineHeight: 1.6 }}>💡 Tocá una mesa para ver sus detalles, o arrastrala para reubicarla. Este plano también se puede ver desde Control de Salón (vista &ldquo;Plano&rdquo;).</p>
        </div>
      </div>

      {seleccionada && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setSeleccionadaId(null) }} style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div className="slide-up" style={{ width: '100%', maxWidth: 480, margin: '0 auto', background: '#141414', borderRadius: '20px 20px 0 0', padding: '20px 20px 40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Mesa {seleccionada.numero}</h2>
              <button onClick={() => setSeleccionadaId(null)} style={{ background: '#2A2A2A', border: 'none', borderRadius: 10, padding: '8px 14px', color: '#fff', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: '0 0 8px', fontSize: 12, color: '#707070' }}>Forma de la mesa</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['redonda', 'cuadrada', 'rectangular'] as const).map(f => (
                  <button key={f} onClick={() => actualizarCapacidadMesa(seleccionada.id, seleccionada.capacidad, f)} style={{ flex: 1, padding: '9px', borderRadius: 10, fontSize: 12, cursor: 'pointer', textTransform: 'capitalize', background: seleccionada.forma === f ? 'rgba(212,175,55,0.15)' : '#1C1C1C', color: seleccionada.forma === f ? 'var(--gold)' : '#A0A0A0', border: seleccionada.forma === f ? '1px solid rgba(212,175,55,0.4)' : '1px solid #2A2A2A' }}>{f}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: '0 0 8px', fontSize: 12, color: '#707070' }}>Capacidad (personas) — actual: <strong style={{ color: 'var(--gold)' }}>{seleccionada.capacidad}</strong></p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {[2, 4, 6, 8, 10].map(c => (
                  <button key={c} onClick={() => { actualizarCapacidadMesa(seleccionada.id, c, seleccionada.forma); showToast(`Capacidad: ${c}`) }} style={{ flex: 1, padding: '9px', borderRadius: 10, fontSize: 13, cursor: 'pointer', background: seleccionada.capacidad === c ? 'rgba(212,175,55,0.15)' : '#1C1C1C', color: seleccionada.capacidad === c ? 'var(--gold)' : '#A0A0A0', border: seleccionada.capacidad === c ? '1px solid rgba(212,175,55,0.4)' : '1px solid #2A2A2A' }}>{c}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" min={1} max={30} value={capacidadInput} onChange={e => setCapacidadInput(e.target.value)} placeholder="Otra cantidad (ej: 12)" className="input-premium" style={{ flex: 1 }} />
                <button onClick={handleCapacidadCustom} style={{ padding: '10px 16px', borderRadius: 10, background: '#2A2A2A', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13 }}>Aplicar</button>
              </div>
            </div>
            <button onClick={() => handleEliminar(seleccionada.id)} disabled={seleccionada.estado !== 'libre'} style={{ width: '100%', padding: 13, borderRadius: 12, background: seleccionada.estado === 'libre' ? 'rgba(239,68,68,0.12)' : '#1C1C1C', border: seleccionada.estado === 'libre' ? '1px solid rgba(239,68,68,0.3)' : '1px solid #2A2A2A', color: seleccionada.estado === 'libre' ? '#EF4444' : '#484848', fontSize: 13, fontWeight: 600, cursor: seleccionada.estado === 'libre' ? 'pointer' : 'not-allowed' }}>
              {seleccionada.estado === 'libre' ? '🗑 Eliminar mesa' : 'Solo se puede eliminar si está libre'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
