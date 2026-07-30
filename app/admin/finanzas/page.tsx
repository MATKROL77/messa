'use client'

import { useState } from 'react'
import { ArrowDownRight, ArrowUpRight, CircleDollarSign, Plus, Receipt, Scale, Trash2, TrendingUp, WalletCards } from 'lucide-react'
import { useStore } from '@/lib/store'
import { formatPrecio } from '@/lib/utils'
import { AdminButton, AdminEmpty, AdminMetric, AdminPanel, AdminSegmented, AdminSheet, AdminStatus, AdminToast, AdminWorkspace } from '@/components/admin/admin-ui'

const CATEGORIAS = ['Alquiler', 'Sueldos', 'Servicios', 'Insumos extra', 'Marketing', 'Mantenimiento', 'Impuestos', 'Otro']
type Tab = 'resumen' | 'gastos'

export default function FinanzasPage() {
  const { pedidos, gastos, agregarGasto, eliminarGasto, costoInsumosConsumidoHistorico, sucursalActualId, sucursales } = useStore()
  const [tab, setTab] = useState<Tab>('resumen')
  const [creando, setCreando] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ categoria: CATEGORIAS[0], descripcion: '', monto: 0 })
  const sucursal = sucursales.find(item => item.id === sucursalActualId)
  const pedidosPagados = pedidos.filter(pedido => pedido.sucursal_id === sucursalActualId && pedido.estado === 'pagado')
  const ventas = pedidosPagados.reduce((total, pedido) => total + pedido.total + (pedido.propina || 0), 0)
  const propinas = pedidosPagados.reduce((total, pedido) => total + (pedido.propina || 0), 0)
  const gastosSucursal = gastos.filter(gasto => !gasto.sucursal_id || gasto.sucursal_id === sucursalActualId)
  const gastosTotales = gastosSucursal.reduce((total, gasto) => total + gasto.monto, 0)
  const margenBruto = ventas - costoInsumosConsumidoHistorico
  const resultado = margenBruto - gastosTotales
  const margen = ventas > 0 ? Math.round((resultado / ventas) * 100) : 0
  const ticket = pedidosPagados.length ? ventas / pedidosPagados.length : 0

  const porCategoria = CATEGORIAS.map(categoria => ({
    categoria,
    valor: gastosSucursal.filter(gasto => gasto.categoria === categoria).reduce((total, gasto) => total + gasto.monto, 0),
  })).filter(item => item.valor > 0).sort((a, b) => b.valor - a.valor)
  const maxCategoria = Math.max(...porCategoria.map(item => item.valor), 1)

  const showToast = (mensaje: string) => {
    setToast(mensaje)
    window.setTimeout(() => setToast(''), 2300)
  }

  const crearGasto = () => {
    if (!form.descripcion.trim() || form.monto <= 0) return showToast('Completá descripción y monto')
    agregarGasto({ ...form, fecha: new Date().toISOString().slice(0, 10), sucursal_id: sucursalActualId })
    setForm({ categoria: CATEGORIAS[0], descripcion: '', monto: 0 })
    setCreando(false)
    showToast('Gasto registrado')
  }

  return (
    <AdminWorkspace
      eyebrow="Rendimiento del negocio"
      title="Finanzas"
      description={`Una lectura clara de ingresos, costos y margen operativo de ${sucursal?.nombre || 'la sucursal actual'}.`}
      actions={(
        <>
          <AdminSegmented<Tab> value={tab} onChange={setTab} label="Vista financiera" items={[{ value: 'resumen', label: 'Resumen' }, { value: 'gastos', label: 'Gastos', count: gastosSucursal.length }]} />
          <AdminButton tone="primary" icon={Plus} onClick={() => setCreando(true)}>Registrar gasto</AdminButton>
        </>
      )}
    >
      <AdminToast>{toast}</AdminToast>

      <div className="messa-metrics">
        <AdminMetric label="Ventas cobradas" value={formatPrecio(ventas)} detail={`${pedidosPagados.length} operaciones`} Icon={CircleDollarSign} tone="green" progress={100} />
        <AdminMetric label="Ticket promedio" value={formatPrecio(ticket)} detail={`${formatPrecio(propinas)} en propinas`} Icon={WalletCards} tone="gold" progress={ventas ? Math.min(100, (ticket / Math.max(ventas, 1)) * 500) : 0} />
        <AdminMetric label="Costos + gastos" value={formatPrecio(costoInsumosConsumidoHistorico + gastosTotales)} detail={`${formatPrecio(gastosTotales)} operativos`} Icon={ArrowDownRight} tone={gastosTotales ? 'amber' : 'blue'} progress={ventas ? ((costoInsumosConsumidoHistorico + gastosTotales) / ventas) * 100 : 0} />
        <AdminMetric label="Resultado neto" value={formatPrecio(resultado)} detail={`${margen}% de margen`} Icon={resultado >= 0 ? TrendingUp : Scale} tone={resultado >= 0 ? 'green' : 'rose'} progress={Math.max(0, margen)} />
      </div>

      {tab === 'resumen' ? (
        <div className="messa-finance-grid">
          <AdminPanel eyebrow="Flujo del período" title="Del ingreso al resultado" detail="Composición acumulada con los movimientos registrados.">
            <div className="messa-waterfall">
              {[
                { label: 'Ventas y propinas', value: ventas, tone: 'green', Icon: ArrowUpRight },
                { label: 'Costo de insumos', value: -costoInsumosConsumidoHistorico, tone: 'amber', Icon: ArrowDownRight },
                { label: 'Gastos operativos', value: -gastosTotales, tone: 'rose', Icon: ArrowDownRight },
                { label: 'Resultado neto', value: resultado, tone: resultado >= 0 ? 'gold' : 'rose', Icon: Scale },
              ].map(item => (
                <div key={item.label}>
                  <span className={`messa-waterfall__icon messa-status--${item.tone}`}><item.Icon size={15} /></span>
                  <span><b>{item.label}</b><small>{item.value >= 0 ? 'Suma al resultado' : 'Resta al resultado'}</small></span>
                  <strong>{item.value < 0 ? '− ' : ''}{formatPrecio(Math.abs(item.value))}</strong>
                </div>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel eyebrow="Estructura" title="Gastos por categoría" detail="Distribución para detectar rápidamente dónde se concentra el costo.">
            {porCategoria.length ? <div className="messa-finance-bars">{porCategoria.map(item => <div key={item.categoria}><span><b>{item.categoria}</b><strong>{formatPrecio(item.valor)}</strong></span><i><b style={{ width: `${(item.valor / maxCategoria) * 100}%` }} /></i></div>)}</div> : <AdminEmpty Icon={Receipt} title="Todavía no hay gastos" description="Registrá un gasto para construir el análisis por categoría." action={<AdminButton tone="neutral" icon={Plus} onClick={() => setCreando(true)}>Registrar gasto</AdminButton>} />}
          </AdminPanel>
        </div>
      ) : (
        <AdminPanel eyebrow="Movimientos" title="Gastos registrados" detail="Historial operativo de la sucursal seleccionada.">
          {gastosSucursal.length ? <div className="messa-expense-list">{[...gastosSucursal].reverse().map(gasto => (
            <div key={gasto.id}>
              <span><b>{gasto.descripcion}</b><small>{gasto.categoria} · {new Date(gasto.fecha).toLocaleDateString('es-AR')}</small></span>
              <AdminStatus tone="rose">{formatPrecio(gasto.monto)}</AdminStatus>
              <button type="button" onClick={() => { eliminarGasto(gasto.id); showToast('Gasto eliminado') }} aria-label={`Eliminar ${gasto.descripcion}`}><Trash2 size={15} /></button>
            </div>
          ))}</div> : <AdminEmpty Icon={Receipt} title="Sin movimientos" description="Todavía no hay gastos registrados para esta sucursal." />}
        </AdminPanel>
      )}

      <AdminSheet open={creando} onClose={() => setCreando(false)} eyebrow="Nuevo movimiento" title="Registrar gasto" footer={<><AdminButton tone="neutral" onClick={() => setCreando(false)}>Cancelar</AdminButton><AdminButton tone="primary" onClick={crearGasto}>Guardar gasto</AdminButton></>}>
        <div className="messa-product-form">
          <div className="messa-form-field messa-form-field--wide"><label>Categoría</label><select className="input-premium" value={form.categoria} onChange={event => setForm({ ...form, categoria: event.target.value })}>{CATEGORIAS.map(categoria => <option key={categoria}>{categoria}</option>)}</select></div>
          <div className="messa-form-field messa-form-field--wide"><label>Descripción</label><input className="input-premium" value={form.descripcion} onChange={event => setForm({ ...form, descripcion: event.target.value })} placeholder="Ej. Reparación de horno" /></div>
          <div className="messa-form-field messa-form-field--wide"><label>Monto</label><input className="input-premium" type="number" min="0" value={form.monto || ''} onChange={event => setForm({ ...form, monto: Number(event.target.value) })} placeholder="0" /></div>
        </div>
      </AdminSheet>
    </AdminWorkspace>
  )
}
