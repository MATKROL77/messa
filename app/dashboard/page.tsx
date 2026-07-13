'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { MesaEstado, MetodoPago } from '@/types'
import { tiempoTranscurrido, tiempoEnMinutos, formatPrecio } from '@/lib/utils'

const ESTADO_CONFIG: Record<MesaEstado, { color: string; bg: string; border: string; label: string; emoji: string }> = {
  libre:   { color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)',   label: 'Libre',      emoji: '🟢' },
  ocupada: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   label: 'Ocupada',    emoji: '🔴' },
  pedido:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)',  label: 'Pedido',     emoji: '🟡' },
  pagando: { color: '#D4AF37', bg: 'rgba(212,175,55,0.1)',  border: 'rgba(212,175,55,0.25)',  label: 'Pagando',    emoji: '💳' },
  pagada:  { color: '#22C55E', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.2)',    label: '✓ Pagada',   emoji: '✅' },
}

export default function DashboardPage() {
  const { mesas, pedidos, notificaciones, liberarMesa, ocuparMesaManual, insumos, llamadosMozo, atenderLlamado, marcarPagoManualStaff, confirmarTransferenciaStaff, transferirMesa, actualizarNotaMesa, sucursalActualId, sucursales, actualizarPosicionMesa } = useStore()
  const [mesaSeleccionadaId, setMesaSeleccionadaId] = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<MesaEstado | 'todas'>('todas')
  const [tab, setTab] = useState<'mesas' | 'llamados'>('mesas')
  const [vistaLayout, setVistaLayout] = useState<'grid' | 'plano'>('grid')
  const [transfiriendo, setTransfiriendo] = useState(false)
  const [editandoNota, setEditandoNota] = useState(false)
  const [notaTemp, setNotaTemp] = useState('')
  const [toast, setToast] = useState('')
  const [arrastrandoId, setArrastrandoId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [, forceTick] = useState(0)

  const criticos = insumos.filter(i => i.cantidad <= i.cantidad_critica && i.activo && i.sucursal_id === sucursalActualId)
  const llamadosPendientes = llamadosMozo.filter(l => !l.atendido)
  const mesasSucursal = mesas.filter(m => m.sucursal_id === sucursalActualId)
  const mesaSeleccionada = mesasSucursal.find(m => m.id === mesaSeleccionadaId) || null
  const nombreSucursal = sucursales.find(s => s.id === sucursalActualId)?.nombre || ''

  useEffect(() => { const i = setInterval(() => forceTick(t => t + 1), 30000); return () => clearInterval(i) }, [])
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2400) }

  const mesasFiltradas = mesasSucursal.filter(m => filtroEstado === 'todas' || m.estado === filtroEstado)
  const stats = { libres: mesasSucursal.filter(m => m.estado === 'libre').length, ocupadas: mesasSucursal.filter(m => m.estado === 'ocupada').length, pedidos: mesasSucursal.filter(m => m.estado === 'pedido').length, pagadas: mesasSucursal.filter(m => m.estado === 'pagada').length }
  const pedidosDeMesa = (mesaId: string) => pedidos.filter(p => p.mesa_id === mesaId && p.estado !== 'cancelado')
  const pendientesTransferencia = pedidos.filter(p => p.metodo_pago === 'transferencia' && !p.confirmado_staff && p.sucursal_id === sucursalActualId)
  const mesasLibresParaTransferir = mesasSucursal.filter(m => m.estado === 'libre' && m.id !== mesaSeleccionadaId)

  const handleLiberar = (mesaId: string) => { liberarMesa(mesaId); setMesaSeleccionadaId(null) }
  const handleOcupar = (mesaId: string) => ocuparMesaManual(mesaId)
  const handlePagoManual = (mesaId: string, metodo: MetodoPago) => { marcarPagoManualStaff(mesaId, metodo); setMesaSeleccionadaId(null) }
  const handleTransferir = (destinoId: string) => {
    if (!mesaSeleccionadaId) return
    const res = transferirMesa(mesaSeleccionadaId, destinoId)
    if (res.ok) { showToast('Mesa trasladada ✓'); setTransfiriendo(false); setMesaSeleccionadaId(destinoId) }
    else showToast(res.error || 'No se pudo trasladar')
  }
  const handleGuardarNota = () => { if (mesaSeleccionadaId) actualizarNotaMesa(mesaSeleccionadaId, notaTemp); setEditandoNota(false); showToast('Nota guardada ✓') }
  const notiPendientes = notificaciones.filter(n => tiempoEnMinutos(n.timestamp) < 60)

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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 20 }}>
      {toast && <div className="fade-in" style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', background: '#1C1C1C', border: '1px solid #383838', borderRadius: 100, padding: '10px 20px', fontSize: 13, color: '#fff', zIndex: 9999, whiteSpace: 'nowrap' }}>{toast}</div>}

      <div style={{ background: 'var(--bg)', borderBottom: '1px solid #1C1C1C', padding: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h1 className="font-titulos" style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Control de Salón</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707070' }}>📍 {nombreSucursal}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/encargos" style={{ textDecoration: 'none', background: criticos.length > 0 ? 'rgba(245,158,11,0.12)' : '#1C1C1C', border: criticos.length > 0 ? '1px solid rgba(245,158,11,0.3)' : '1px solid #2A2A2A', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: criticos.length > 0 ? '#F59E0B' : '#A0A0A0', fontWeight: criticos.length > 0 ? 600 : 400 }}>📦{criticos.length > 0 ? ` ${criticos.length}` : ''}</Link>
            <Link href="/cocina" style={{ textDecoration: 'none', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#F59E0B' }}>🍳</Link>
            <Link href="/" style={{ textDecoration: 'none', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#A0A0A0' }}>← Inicio</Link>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
          {[{ label: 'Libres', val: stats.libres, color: '#22C55E' }, { label: 'Ocupadas', val: stats.ocupadas, color: '#EF4444' }, { label: 'Pedidos', val: stats.pedidos, color: '#F59E0B' }, { label: 'Pagadas', val: stats.pagadas, color: '#D4AF37' }].map(s => (
            <div key={s.label} style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 10, padding: 8, textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</p>
              <p style={{ margin: 0, fontSize: 10, color: '#707070' }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setTab('mesas')} style={{ flex: 1, padding: 9, borderRadius: 10, fontSize: 12, cursor: 'pointer', background: tab === 'mesas' ? 'rgba(212,175,55,0.15)' : '#1C1C1C', color: tab === 'mesas' ? 'var(--gold)' : '#707070', border: tab === 'mesas' ? '1px solid rgba(212,175,55,0.4)' : '1px solid #2A2A2A' }}>🍽️ Mesas</button>
          <button onClick={() => setTab('llamados')} style={{ flex: 1, padding: 9, borderRadius: 10, fontSize: 12, cursor: 'pointer', background: tab === 'llamados' ? 'rgba(212,175,55,0.15)' : '#1C1C1C', color: tab === 'llamados' ? 'var(--gold)' : '#707070', border: tab === 'llamados' ? '1px solid rgba(212,175,55,0.4)' : '1px solid #2A2A2A' }}>
            🔔 Llamados {llamadosPendientes.length > 0 && <span style={{ background: '#EF4444', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>{llamadosPendientes.length}</span>}
          </button>
        </div>
      </div>

      {tab === 'mesas' && (
        <>
          <div style={{ padding: '12px 16px 0', display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', whiteSpace: 'nowrap' }}>
              {(['todas', 'libre', 'ocupada', 'pedido', 'pagada'] as const).map(e => (
                <button key={e} onClick={() => setFiltroEstado(e)} style={{ borderRadius: 100, padding: '5px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0, background: filtroEstado === e ? 'rgba(212,175,55,0.15)' : '#1C1C1C', color: filtroEstado === e ? 'var(--gold)' : '#A0A0A0', border: filtroEstado === e ? '1px solid rgba(212,175,55,0.4)' : '1px solid #2A2A2A' }}>{e === 'todas' ? '🔢 Todas' : ESTADO_CONFIG[e].emoji + ' ' + ESTADO_CONFIG[e].label}</button>
              ))}
            </div>
            <button onClick={() => setVistaLayout(vistaLayout === 'grid' ? 'plano' : 'grid')} style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 100, fontSize: 12, background: '#1C1C1C', border: '1px solid #2A2A2A', color: '#A0A0A0', cursor: 'pointer' }}>{vistaLayout === 'grid' ? '🗺️ Plano' : '🔢 Grilla'}</button>
          </div>

          {pendientesTransferencia.length > 0 && (
            <div style={{ padding: '12px 16px 0' }}>
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: 12 }}>
                <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: '#F59E0B' }}>🏦 {pendientesTransferencia.length} transferencia(s) sin verificar</p>
                {pendientesTransferencia.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                    <span style={{ fontSize: 12, color: '#A0A0A0' }}>Mesa {p.mesa_numero} · {formatPrecio(p.total + p.propina)}</span>
                    <button onClick={() => confirmarTransferenciaStaff(p.id)} style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(34,197,94,0.15)', border: 'none', color: '#22C55E', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>✓ Verificar</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {vistaLayout === 'grid' ? (
            <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {mesasFiltradas.map(mesa => {
                const cfg = ESTADO_CONFIG[mesa.estado]
                const pedidosMesa = pedidosDeMesa(mesa.id)
                const tiempoOcup = mesa.dispositivos.length > 0 ? tiempoEnMinutos(mesa.updated_at) : 0
                return (
                  <div key={mesa.id} className="card-hover" onClick={() => setMesaSeleccionadaId(mesa.id)} style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 14, padding: '14px 10px', textAlign: 'center', cursor: 'pointer', position: 'relative' }}>
                    {mesa.estado === 'ocupada' && tiempoOcup > 15 && <div style={{ position: 'absolute', top: -4, right: -4, width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} className="pulse-dot" />}
                    {mesa.nota_staff && <div style={{ position: 'absolute', top: -4, left: -4, fontSize: 12 }}>📝</div>}
                    <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: cfg.color }}>M{mesa.numero}</p>
                    <p style={{ margin: '2px 0', fontSize: 10, color: cfg.color, fontWeight: 500 }}>{cfg.label}</p>
                    {mesa.dispositivos.length > 0 && <p style={{ margin: '4px 0 0', fontSize: 10, color: '#707070' }}>👥 {mesa.dispositivos.length}</p>}
                    {pedidosMesa.length > 0 && <p style={{ margin: '2px 0 0', fontSize: 10, color: '#F59E0B' }}>🍳 {pedidosMesa.length}</p>}
                    {tiempoOcup > 0 && <p style={{ margin: '2px 0 0', fontSize: 10, color: '#707070' }}>{tiempoOcup}m</p>}
                  </div>
                )
              })}
            </div>
          ) : (
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
                {mesasSucursal.map(mesa => {
                  const cfg = ESTADO_CONFIG[mesa.estado]
                  return (
                    <div key={mesa.id}
                      onMouseDown={() => setArrastrandoId(mesa.id)} onTouchStart={() => setArrastrandoId(mesa.id)}
                      onClick={() => { if (!arrastrandoId) setMesaSeleccionadaId(mesa.id) }}
                      style={{ position: 'absolute', left: `${mesa.pos_x}%`, top: `${mesa.pos_y}%`, transform: 'translate(-50%, -50%)', width: mesa.forma === 'rectangular' ? 64 : 48, height: 48, borderRadius: mesa.forma === 'redonda' ? '50%' : 10, background: cfg.bg, border: `2px solid ${cfg.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab', userSelect: 'none', zIndex: arrastrandoId === mesa.id ? 10 : 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{mesa.numero}</span>
                    </div>
                  )
                })}
              </div>
              <p style={{ textAlign: 'center', fontSize: 11, color: '#484848', marginTop: 10 }}>Podés reordenar las mesas arrastrándolas — se guarda automáticamente</p>
            </div>
          )}

          <div style={{ padding: '4px 16px 0' }}>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {Object.entries(ESTADO_CONFIG).map(([key, val]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#707070' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: val.color }} />{val.label}</div>
              ))}
            </div>
          </div>

          {notiPendientes.length > 0 && (
            <div style={{ padding: '16px 16px 0' }}>
              <p style={{ fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Alertas recientes</p>
              {notiPendientes.slice(0, 4).map(n => (
                <div key={n.id} style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 12, padding: '10px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: n.tipo === 'warning' ? '#F59E0B' : n.tipo === 'success' ? '#22C55E' : n.tipo === 'error' ? '#EF4444' : '#A0A0A0' }}>{n.mensaje}</span>
                  <span style={{ fontSize: 11, color: '#707070', flexShrink: 0, marginLeft: 8 }}>{tiempoTranscurrido(n.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'llamados' && (
        <div style={{ padding: 16 }}>
          {llamadosMozo.length === 0 && <div style={{ textAlign: 'center', padding: '60px 20px', color: '#707070' }}><p style={{ fontSize: 40 }}>🔔</p><p>Sin llamados por ahora</p></div>}
          {llamadosMozo.map(l => (
            <div key={l.id} style={{ background: l.atendido ? '#141414' : 'rgba(212,175,55,0.06)', border: l.atendido ? '1px solid #2A2A2A' : '1px solid rgba(212,175,55,0.3)', borderRadius: 14, padding: 14, marginBottom: 10, opacity: l.atendido ? 0.6 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: l.atendido ? 0 : 10 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Mesa {l.mesa_numero}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 13, color: '#A0A0A0' }}>{l.motivo}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#707070' }}>{tiempoTranscurrido(l.created_at)}</p>
                </div>
                {!l.atendido && <button onClick={() => atenderLlamado(l.id)} style={{ padding: '7px 12px', borderRadius: 10, background: 'rgba(34,197,94,0.15)', border: 'none', color: '#22C55E', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✓ Atendido</button>}
              </div>
              {!l.atendido && (
                <Link href={`/mesa/${l.mesa_id}?staff=true`} onClick={() => atenderLlamado(l.id)} style={{ textDecoration: 'none', display: 'block', textAlign: 'center', padding: '9px', borderRadius: 10, background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)', color: 'var(--gold)', fontSize: 12, fontWeight: 600 }}>
                  🧑‍💼 Atender esta mesa (hacer pedido)
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {mesaSeleccionada && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) { setMesaSeleccionadaId(null); setTransfiriendo(false); setEditandoNota(false) } }} style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div className="slide-up" style={{ width: '100%', maxWidth: 480, margin: '0 auto', background: '#141414', borderRadius: '20px 20px 0 0', padding: '20px 20px 40px', maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Mesa {mesaSeleccionada.numero}</h2>
              <button onClick={() => { setMesaSeleccionadaId(null); setTransfiriendo(false); setEditandoNota(false) }} style={{ background: '#2A2A2A', border: 'none', borderRadius: 10, padding: '8px 14px', color: '#fff', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ background: '#1C1C1C', borderRadius: 14, padding: 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 13, color: '#707070' }}>Estado</span><span style={{ fontSize: 13, fontWeight: 600, color: ESTADO_CONFIG[mesaSeleccionada.estado].color }}>{ESTADO_CONFIG[mesaSeleccionada.estado].emoji} {ESTADO_CONFIG[mesaSeleccionada.estado].label}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 13, color: '#707070' }}>Comensales</span><span style={{ fontSize: 13 }}>{mesaSeleccionada.dispositivos.length} / cap. {mesaSeleccionada.capacidad}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: '#707070' }}>Pedidos</span><span style={{ fontSize: 13 }}>{pedidosDeMesa(mesaSeleccionada.id).length}</span></div>
            </div>

            {/* Nota de staff */}
            {editandoNota ? (
              <div style={{ marginBottom: 12 }}>
                <textarea value={notaTemp} onChange={e => setNotaTemp(e.target.value)} placeholder="Ej: Cliente pidió cambiar de mesa, alergia al maní, etc." rows={2} className="input-premium" style={{ resize: 'none', marginBottom: 8 }} autoFocus />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleGuardarNota} className="btn-gold" style={{ flex: 1, padding: 9, borderRadius: 10, border: 'none', fontSize: 12, cursor: 'pointer' }}>Guardar nota</button>
                  <button onClick={() => setEditandoNota(false)} style={{ padding: '9px 14px', borderRadius: 10, background: '#2A2A2A', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer' }}>✕</button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setNotaTemp(mesaSeleccionada.nota_staff || ''); setEditandoNota(true) }} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 10, background: '#1C1C1C', border: '1px solid #2A2A2A', color: mesaSeleccionada.nota_staff ? '#fff' : '#707070', fontSize: 12, cursor: 'pointer', marginBottom: 12 }}>
                📝 {mesaSeleccionada.nota_staff || 'Agregar nota de mesa...'}
              </button>
            )}

            {pedidosDeMesa(mesaSeleccionada.id).map(p => (
              <div key={p.id} style={{ background: '#1C1C1C', borderRadius: 12, padding: 12, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 500 }}>Pedido #{p.id.slice(-4)} {p.origen !== 'mesa' && `· ${p.origen}`}</span><span style={{ fontSize: 12, color: '#707070' }}>{tiempoTranscurrido(p.created_at)}</span></div>
                {p.items.slice(0, 3).map(item => <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#A0A0A0', padding: '2px 0' }}><span>{item.cantidad}x {item.plato.nombre}</span></div>)}
              </div>
            ))}

            <Link href={`/mesa/${mesaSeleccionada.id}?staff=true`} style={{ textDecoration: 'none', display: 'block', textAlign: 'center', padding: '12px', borderRadius: 12, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', color: '#3B82F6', fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
              🧑‍💼 Atender esta mesa (hacer pedido por el cliente)
            </Link>

            <p style={{ fontSize: 11, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '4px 0 8px' }}>Control manual de mesa</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <button onClick={() => handleOcupar(mesaSeleccionada.id)} disabled={mesaSeleccionada.estado === 'ocupada'} style={{ padding: 12, borderRadius: 12, background: mesaSeleccionada.estado === 'ocupada' ? '#1C1C1C' : 'rgba(239,68,68,0.12)', border: mesaSeleccionada.estado === 'ocupada' ? '1px solid #2A2A2A' : '1px solid rgba(239,68,68,0.3)', color: mesaSeleccionada.estado === 'ocupada' ? '#484848' : '#EF4444', fontSize: 13, fontWeight: 600, cursor: mesaSeleccionada.estado === 'ocupada' ? 'not-allowed' : 'pointer' }}>🔴 Marcar ocupada</button>
              <button onClick={() => handleLiberar(mesaSeleccionada.id)} disabled={mesaSeleccionada.estado === 'libre'} style={{ padding: 12, borderRadius: 12, background: mesaSeleccionada.estado === 'libre' ? '#1C1C1C' : 'rgba(34,197,94,0.12)', border: mesaSeleccionada.estado === 'libre' ? '1px solid #2A2A2A' : '1px solid rgba(34,197,94,0.3)', color: mesaSeleccionada.estado === 'libre' ? '#484848' : '#22C55E', fontSize: 13, fontWeight: 600, cursor: mesaSeleccionada.estado === 'libre' ? 'not-allowed' : 'pointer' }}>🟢 Liberar mesa</button>
            </div>

            {mesaSeleccionada.estado !== 'libre' && (
              <>
                {transfiriendo ? (
                  <div style={{ marginBottom: 10 }}>
                    <p style={{ fontSize: 12, color: '#707070', margin: '0 0 8px' }}>Elegí la mesa de destino (debe estar libre):</p>
                    {mesasLibresParaTransferir.length === 0 && <p style={{ fontSize: 12, color: '#484848' }}>No hay mesas libres disponibles</p>}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {mesasLibresParaTransferir.map(m => (
                        <button key={m.id} onClick={() => handleTransferir(m.id)} style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22C55E', fontSize: 13, cursor: 'pointer' }}>M{m.numero}</button>
                      ))}
                    </div>
                    <button onClick={() => setTransfiriendo(false)} style={{ marginTop: 8, background: 'transparent', border: 'none', color: '#707070', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                  </div>
                ) : (
                  <button onClick={() => setTransfiriendo(true)} style={{ width: '100%', padding: 12, borderRadius: 12, background: '#1C1C1C', border: '1px solid #2A2A2A', color: '#A0A0A0', fontSize: 13, cursor: 'pointer', marginBottom: 10 }}>🔄 Mudar / trasladar mesa</button>
                )}
              </>
            )}

            {mesaSeleccionada.estado !== 'libre' && mesaSeleccionada.estado !== 'pagada' && pedidosDeMesa(mesaSeleccionada.id).length > 0 && (
              <>
                <p style={{ fontSize: 11, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '12px 0 8px' }}>Confirmar pago recibido</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button onClick={() => handlePagoManual(mesaSeleccionada.id, 'efectivo')} className="btn-gold" style={{ padding: 12, borderRadius: 12, border: 'none', fontSize: 13, cursor: 'pointer' }}>💵 Efectivo</button>
                  <button onClick={() => handlePagoManual(mesaSeleccionada.id, 'tarjeta')} className="btn-gold" style={{ padding: 12, borderRadius: 12, border: 'none', fontSize: 13, cursor: 'pointer' }}>💳 Tarjeta (POS)</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
