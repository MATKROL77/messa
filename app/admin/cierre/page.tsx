'use client'

import { useState } from 'react'
import { Banknote, CircleDollarSign, Download, LockKeyhole, Printer, ReceiptText, TrendingUp, UsersRound } from 'lucide-react'
import { AdminButton, AdminEmpty, AdminMetric, AdminPanel, AdminSheet, AdminStatus, AdminToast, AdminWorkspace } from '@/components/admin/admin-ui'
import { useStore } from '@/lib/store'
import { formatPrecio, tiempoTranscurrido } from '@/lib/utils'
import type { CierreDiario } from '@/types'

export default function CierrePage() {
  const { config, pedidos, abrirCaja, cerrarCaja, cierres, sucursalActualId, sucursales, categoriasDisponibles } = useStore()
  const [cierreActual, setCierreActual] = useState<CierreDiario | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [toast, setToast] = useState('')
  const nombreSucursal = sucursales.find(sucursal => sucursal.id === sucursalActualId)?.nombre ?? 'Sucursal'
  const hoy = new Date().toISOString().split('T')[0]
  const pedidosHoy = pedidos.filter(pedido => pedido.created_at.startsWith(hoy) && pedido.estado === 'pagado' && pedido.sucursal_id === sucursalActualId)
  const totalHoy = pedidosHoy.reduce((total, pedido) => total + pedido.total + (pedido.propina || 0), 0)
  const ticketPromedio = pedidosHoy.length ? totalHoy / pedidosHoy.length : 0
  const mesasAtendidas = new Set(pedidosHoy.map(pedido => pedido.mesa_id)).size

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2500)
  }

  const handleCerrarCaja = () => {
    const cierre = cerrarCaja(sucursalActualId)
    setCierreActual(cierre)
    setConfirmando(false)
    showToast('Caja cerrada correctamente')
  }

  const handleImprimir = (cierre: CierreDiario) => {
    const ventana = window.open('', '_blank')
    if (!ventana) return
    ventana.document.write(generarTicketHTML(cierre))
    ventana.document.close()
    ventana.print()
  }

  const exportarCSV = (cierre: CierreDiario) => {
    const csv = `fecha,total,pedidos,mesas,ticket_promedio\n${cierre.fecha},${cierre.total_ventas},${cierre.total_pedidos},${cierre.total_mesas_atendidas},${cierre.ticket_promedio}`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `cierre_${cierre.fecha}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    showToast('CSV exportado')
  }

  const generarTicketHTML = (cierre: CierreDiario) => `
<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cierre ${cierre.fecha}</title>
<style>body{font-family:"Courier New",monospace;font-size:12px;max-width:300px;margin:0 auto;padding:10px;color:#000}.centro{text-align:center}.linea{border-top:1px dashed #000;margin:8px 0}.fila{display:flex;justify-content:space-between;margin:3px 0}.titulo{font-size:16px;font-weight:bold}.sub{font-size:10px;color:#555}.total{font-size:14px;font-weight:bold}</style>
</head><body><div class="centro"><div class="titulo">${config.nombre}</div><div class="sub">CIERRE DE CAJA</div><div class="sub">${new Date(cierre.created_at).toLocaleDateString('es-AR')} — ${new Date(cierre.hora_cierre).toLocaleTimeString('es-AR')}</div></div>
<div class="linea"></div><div class="fila"><span>Apertura:</span><span>${new Date(cierre.hora_apertura).toLocaleTimeString('es-AR')}</span></div><div class="fila"><span>Cierre:</span><span>${new Date(cierre.hora_cierre).toLocaleTimeString('es-AR')}</span></div>
<div class="linea"></div><div class="fila"><span>Total pedidos:</span><span>${cierre.total_pedidos}</span></div><div class="fila"><span>Mesas atendidas:</span><span>${cierre.total_mesas_atendidas}</span></div><div class="fila"><span>Ticket promedio:</span><span>${formatPrecio(cierre.ticket_promedio)}</span></div>
<div class="linea"></div><div style="font-weight:bold;margin-bottom:4px">Por método de pago:</div>${Object.entries(cierre.ventas_por_metodo).map(([key, value]) => `<div class="fila"><span>${key}:</span><span>${formatPrecio(value)}</span></div>`).join('')}
<div class="linea"></div><div style="font-weight:bold;margin-bottom:4px">Por categoría:</div>${Object.entries(cierre.ventas_por_categoria).map(([key, value]) => `<div class="fila"><span>${categoriasDisponibles.find(categoria => categoria.id === key)?.nombre ?? key}:</span><span>${formatPrecio(value)}</span></div>`).join('')}
<div class="linea"></div><div class="fila total"><span>TOTAL VENTAS:</span><span>${formatPrecio(cierre.total_ventas)}</span></div><div class="linea"></div><div class="centro sub">MESSA · Comprobante interno</div></body></html>`

  return (
    <AdminWorkspace
      eyebrow="Control financiero"
      title="Cierre de caja"
      description={`${nombreSucursal} · ${new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}`}
      actions={(
        <>
          <AdminStatus tone={config.caja_abierta ? 'green' : 'rose'}>{config.caja_abierta ? 'Caja abierta' : 'Caja cerrada'}</AdminStatus>
          {config.caja_abierta
            ? <AdminButton tone="danger" icon={LockKeyhole} onClick={() => setConfirmando(true)}>Cerrar caja</AdminButton>
            : <AdminButton tone="primary" icon={Banknote} onClick={() => { abrirCaja(); showToast('Caja abierta') }}>Abrir caja</AdminButton>}
        </>
      )}
    >
      <AdminToast>{toast}</AdminToast>

      <section className="messa-metrics">
        <AdminMetric label="Ventas cobradas" value={formatPrecio(totalHoy)} detail={`${pedidosHoy.length} pedidos pagos`} Icon={CircleDollarSign} tone="green" progress={Math.min(100, totalHoy / 2500)} />
        <AdminMetric label="Pedidos cerrados" value={`${pedidosHoy.length}`} detail="Durante el turno" Icon={ReceiptText} tone="gold" progress={Math.min(100, pedidosHoy.length * 8)} />
        <AdminMetric label="Ticket promedio" value={formatPrecio(ticketPromedio)} detail="Por cuenta pagada" Icon={TrendingUp} tone="blue" progress={Math.min(100, ticketPromedio / 150)} />
        <AdminMetric label="Mesas atendidas" value={`${mesasAtendidas}`} detail="Cuentas únicas" Icon={UsersRound} tone="amber" progress={Math.min(100, mesasAtendidas * 9)} />
      </section>

      <div className="messa-two-column messa-cash-layout">
        <AdminPanel eyebrow="Turno actual" title="Pedidos cobrados" detail="Detalle de las cuentas que componen el cierre.">
          {pedidosHoy.length ? (
            <div className="messa-cash-list">
              {[...pedidosHoy].reverse().map(pedido => (
                <article key={pedido.id}>
                  <span><ReceiptText size={17} /></span>
                  <div><b>Mesa {pedido.mesa_numero}</b><small>{pedido.items.length} ítems · {tiempoTranscurrido(pedido.created_at)} · {pedido.metodo_pago ?? 'efectivo'}</small></div>
                  <strong>{formatPrecio(pedido.total + (pedido.propina || 0))}</strong>
                </article>
              ))}
            </div>
          ) : <AdminEmpty Icon={ReceiptText} title="Todavía no hay cobros" description="Las cuentas pagadas durante el turno aparecerán en este resumen." />}
        </AdminPanel>

        <AdminPanel eyebrow="Historial" title="Cierres anteriores" detail="Comprobantes y exportaciones del local.">
          {cierres.length ? (
            <div className="messa-close-history">
              {[...cierres].reverse().map(cierre => (
                <article key={cierre.id}>
                  <div><b>{new Date(cierre.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}</b><small>{cierre.total_pedidos} pedidos · {cierre.total_mesas_atendidas} mesas</small></div>
                  <strong>{formatPrecio(cierre.total_ventas)}</strong>
                  <footer>
                    <AdminButton tone="neutral" icon={Printer} onClick={() => handleImprimir(cierre)}>Imprimir</AdminButton>
                    <AdminButton tone="quiet" icon={Download} onClick={() => exportarCSV(cierre)}>CSV</AdminButton>
                  </footer>
                </article>
              ))}
            </div>
          ) : <AdminEmpty Icon={LockKeyhole} title="Sin cierres anteriores" description="El primer comprobante quedará guardado cuando cierres la caja." />}
        </AdminPanel>
      </div>

      {cierreActual && (
        <AdminPanel eyebrow="Último cierre" title="ECO-ticket generado" detail={new Date(cierreActual.created_at).toLocaleString('es-AR')} action={<AdminButton tone="primary" icon={Printer} onClick={() => handleImprimir(cierreActual)}>Imprimir</AdminButton>}>
          <div className="messa-ticket-summary"><span>Total del cierre</span><strong>{formatPrecio(cierreActual.total_ventas)}</strong><small>{cierreActual.total_pedidos} pedidos · {cierreActual.total_mesas_atendidas} mesas · ticket {formatPrecio(cierreActual.ticket_promedio)}</small></div>
        </AdminPanel>
      )}

      <AdminSheet
        open={confirmando}
        onClose={() => setConfirmando(false)}
        title="Cerrar caja"
        eyebrow="Confirmación del turno"
        footer={(
          <>
            <AdminButton tone="quiet" onClick={() => setConfirmando(false)}>Cancelar</AdminButton>
            <AdminButton tone="primary" icon={LockKeyhole} onClick={handleCerrarCaja}>Confirmar cierre</AdminButton>
          </>
        )}
      >
        <div className="messa-confirm-summary">
          <span><LockKeyhole size={22} /></span>
          <h3>Se generará el ECO-ticket del día</h3>
          <p>El cierre consolida {pedidosHoy.length} pedidos cobrados y {mesasAtendidas} mesas atendidas.</p>
          <strong>{formatPrecio(totalHoy)}</strong>
        </div>
      </AdminSheet>
    </AdminWorkspace>
  )
}
