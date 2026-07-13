'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { formatPrecio, tiempoTranscurrido } from '@/lib/utils'
import { CierreDiario } from '@/types'

export default function CierrePage() {
  const { config, pedidos, abrirCaja, cerrarCaja, cierres, sucursalActualId, sucursales, categoriasDisponibles } = useStore()
  const [cierreActual, setCierreActual] = useState<CierreDiario | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [toast, setToast] = useState('')
  const nombreSucursal = sucursales.find(s => s.id === sucursalActualId)?.nombre || ''

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const hoy = new Date().toISOString().split('T')[0]
  const pedidosHoy = pedidos.filter(p => p.created_at.startsWith(hoy) && p.estado === 'pagado' && p.sucursal_id === sucursalActualId)
  const totalHoy = pedidosHoy.reduce((acc, p) => acc + p.total + (p.propina || 0), 0)
  const ticketProm = pedidosHoy.length > 0 ? totalHoy / pedidosHoy.length : 0

  const handleCerrarCaja = () => {
    const cierre = cerrarCaja(sucursalActualId)
    setCierreActual(cierre)
    setConfirmando(false)
    showToast('Caja cerrada correctamente ✓')
  }

  const handleImprimir = (cierre: CierreDiario) => {
    const ventana = window.open('', '_blank')
    if (!ventana) return
    ventana.document.write(generarTicketHTML(cierre))
    ventana.document.close()
    ventana.print()
  }

  const generarTicketHTML = (cierre: CierreDiario) => `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body { font-family: 'Courier New', monospace; font-size: 12px; max-width: 300px; margin: 0 auto; padding: 10px; color: #000; }
  .centro { text-align: center; } .linea { border-top: 1px dashed #000; margin: 8px 0; }
  .fila { display: flex; justify-content: space-between; margin: 3px 0; }
  .titulo { font-size: 16px; font-weight: bold; } .sub { font-size: 10px; color: #555; }
  .total { font-size: 14px; font-weight: bold; }
</style></head><body>
<div class="centro"><div class="titulo">${config.nombre}</div><div class="sub">CIERRE DE CAJA</div><div class="sub">${new Date(cierre.created_at).toLocaleDateString('es-AR')} — ${new Date(cierre.hora_cierre).toLocaleTimeString('es-AR')}</div></div>
<div class="linea"></div>
<div class="fila"><span>Apertura:</span><span>${new Date(cierre.hora_apertura).toLocaleTimeString('es-AR')}</span></div>
<div class="fila"><span>Cierre:</span><span>${new Date(cierre.hora_cierre).toLocaleTimeString('es-AR')}</span></div>
<div class="linea"></div>
<div class="fila"><span>Total pedidos:</span><span>${cierre.total_pedidos}</span></div>
<div class="fila"><span>Mesas atendidas:</span><span>${cierre.total_mesas_atendidas}</span></div>
<div class="fila"><span>Ticket promedio:</span><span>${formatPrecio(cierre.ticket_promedio)}</span></div>
<div class="linea"></div>
<div style="font-weight:bold;margin-bottom:4px">Por método de pago:</div>
${Object.entries(cierre.ventas_por_metodo).map(([k, v]) => `<div class="fila"><span>${k}:</span><span>${formatPrecio(v as number)}</span></div>`).join('')}
<div class="linea"></div>
<div style="font-weight:bold;margin-bottom:4px">Por categoría:</div>
${Object.entries(cierre.ventas_por_categoria).map(([k, v]) => { const cat = categoriasDisponibles.find(c => c.id === k); return `<div class="fila"><span>${cat?.nombre || k}:</span><span>${formatPrecio(v as number)}</span></div>` }).join('')}
<div class="linea"></div>
<div class="fila total"><span>TOTAL VENTAS:</span><span>${formatPrecio(cierre.total_ventas)}</span></div>
<div class="linea"></div>
<div class="centro sub">MenuFlow · Sistema de Gestión</div>
<div class="centro sub">Este documento es un comprobante interno</div>
</body></html>`

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', paddingBottom: 40 }}>
      {toast && <div className="fade-in" style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', background: '#1C1C1C', border: '1px solid #383838', borderRadius: 100, padding: '10px 20px', fontSize: 13, color: '#fff', zIndex: 9999, whiteSpace: 'nowrap' }}>{toast}</div>}

      <div style={{ background: 'var(--bg)', borderBottom: '1px solid #1C1C1C', padding: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="font-titulos" style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Cierre de Caja</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707070' }}>📍 {nombreSucursal} · {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <Link href="/admin" style={{ textDecoration: 'none', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#A0A0A0' }}>← Admin</Link>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {/* Estado caja */}
        <div style={{ background: config.caja_abierta ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${config.caja_abierta ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: 14, padding: 16, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: config.caja_abierta ? '#22C55E' : '#EF4444' }}>
              {config.caja_abierta ? '🟢 Caja abierta' : '🔴 Caja cerrada'}
            </p>
            {config.caja_abierta && config.fecha_apertura_caja && (
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#707070' }}>Abierta a las {new Date(config.fecha_apertura_caja).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
            )}
          </div>
          {!config.caja_abierta
            ? <button onClick={() => { abrirCaja(); showToast('Caja abierta ✓') }} className="btn-gold" style={{ padding: '10px 18px', borderRadius: 12, border: 'none', fontSize: 13, cursor: 'pointer' }}>Abrir caja</button>
            : <button onClick={() => setConfirmando(true)} style={{ padding: '10px 18px', borderRadius: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cerrar caja</button>
          }
        </div>

        {/* Resumen del día */}
        <p style={{ fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Resumen del día</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Total ventas', val: formatPrecio(totalHoy), color: '#22C55E', emoji: '💰' },
            { label: 'Pedidos cerrados', val: pedidosHoy.length, color: '#D4AF37', emoji: '🧾' },
            { label: 'Ticket promedio', val: formatPrecio(ticketProm), color: '#3B82F6', emoji: '📊' },
            { label: 'Mesas atendidas', val: [...new Set(pedidosHoy.map(p => p.mesa_id))].length, color: '#F59E0B', emoji: '🍽️' },
          ].map(s => (
            <div key={s.label} style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 14, padding: 14 }}>
              <p style={{ margin: '0 0 6px', fontSize: 20 }}>{s.emoji}</p>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#707070' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Pedidos del día */}
        {pedidosHoy.length > 0 && (
          <>
            <p style={{ fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Pedidos del día</p>
            {pedidosHoy.slice().reverse().map(p => (
              <div key={p.id} style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 12, padding: '10px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>Mesa {p.mesa_numero} · {p.items.length} ítem{p.items.length > 1 ? 's' : ''}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#707070' }}>{tiempoTranscurrido(p.created_at)} · {p.metodo_pago || 'efectivo'}</p>
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#D4AF37' }}>{formatPrecio(p.total)}</span>
              </div>
            ))}
          </>
        )}

        {/* Cierres anteriores */}
        {cierres.length > 0 && (
          <>
            <p style={{ fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '20px 0 10px' }}>Cierres anteriores</p>
            {[...cierres].reverse().map(c => (
              <div key={c.id} style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{new Date(c.fecha).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707070' }}>{c.total_pedidos} pedidos · {c.total_mesas_atendidas} mesas</p>
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#22C55E' }}>{formatPrecio(c.total_ventas)}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleImprimir(c)} style={{ flex: 1, padding: '8px', borderRadius: 10, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', color: '#D4AF37', fontSize: 12, cursor: 'pointer' }}>🖨️ Imprimir ECO-ticket</button>
                  <button onClick={() => { const csv = `fecha,total,pedidos,mesas,ticket_promedio\n${c.fecha},${c.total_ventas},${c.total_pedidos},${c.total_mesas_atendidas},${c.ticket_promedio}`; const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `cierre_${c.fecha}.csv`; a.click(); showToast('CSV exportado ✓') }} style={{ padding: '8px 12px', borderRadius: 10, background: '#1C1C1C', border: '1px solid #2A2A2A', color: '#A0A0A0', fontSize: 12, cursor: 'pointer' }}>📥 CSV</button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Eco-ticket preview del cierre actual */}
        {cierreActual && (
          <div style={{ background: '#141414', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 16, padding: 20, marginTop: 16 }}>
            <div style={{ textAlign: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '1px dashed #383838' }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{config.nombre}</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#707070' }}>ECO-TICKET — CIERRE DE CAJA</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#707070' }}>{new Date(cierreActual.created_at).toLocaleString('es-AR')}</p>
            </div>
            {[
              ['Total pedidos', cierreActual.total_pedidos],
              ['Mesas atendidas', cierreActual.total_mesas_atendidas],
              ['Ticket promedio', formatPrecio(cierreActual.ticket_promedio)],
            ].map(([l, v]) => (
              <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1C1C1C', fontSize: 13 }}>
                <span style={{ color: '#A0A0A0' }}>{l}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontSize: 16, fontWeight: 700 }}>
              <span>TOTAL</span>
              <span style={{ color: '#22C55E' }}>{formatPrecio(cierreActual.total_ventas)}</span>
            </div>
            <button onClick={() => handleImprimir(cierreActual)} className="btn-gold" style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', fontSize: 14, cursor: 'pointer', marginTop: 16 }}>🖨️ Imprimir ECO-ticket</button>
          </div>
        )}
      </div>

      {/* Confirm cierre */}
      {confirmando && (
        <div className="overlay" style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="fade-in" style={{ background: '#1C1C1C', border: '1px solid #383838', borderRadius: 20, padding: 28, width: '100%', maxWidth: 320, textAlign: 'center' }}>
            <p style={{ fontSize: 36, margin: '0 0 12px' }}>🔐</p>
            <h3 style={{ margin: '0 0 8px' }}>¿Cerrar caja?</h3>
            <p style={{ color: '#707070', fontSize: 14, margin: '0 0 8px', lineHeight: 1.5 }}>Se generará el ECO-ticket con el resumen del día.</p>
            <p style={{ color: '#D4AF37', fontSize: 18, fontWeight: 700, margin: '0 0 24px' }}>{formatPrecio(totalHoy)}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmando(false)} style={{ flex: 1, padding: 12, borderRadius: 12, background: '#2A2A2A', border: 'none', color: '#fff', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleCerrarCaja} style={{ flex: 1, padding: 12, borderRadius: 12, background: '#22C55E', border: 'none', color: '#000', fontWeight: 700, cursor: 'pointer' }}>Cerrar caja</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
