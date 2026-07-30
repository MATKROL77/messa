'use client'

import { useState } from 'react'
import { AlertTriangle, Boxes, Download, PackageCheck, PackageOpen, Pencil, Plus, Upload } from 'lucide-react'
import { useStore } from '@/lib/store'
import type { Insumo } from '@/types'
import { AdminButton, AdminEmpty, AdminMetric, AdminPanel, AdminSegmented, AdminSheet, AdminStatus, AdminToast, AdminWorkspace } from '@/components/admin/admin-ui'

type Filtro = 'todos' | 'critico' | 'sinstock'

export default function StockAdminPage() {
  const { insumos, actualizarInsumo, agregarInsumo, importarInsumosCSV, exportarInsumosCSV, sucursalActualId, sucursales } = useStore()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [editando, setEditando] = useState<Insumo | null>(null)
  const [cantidad, setCantidad] = useState(0)
  const [creando, setCreando] = useState(false)
  const [toast, setToast] = useState('')
  const [nuevo, setNuevo] = useState({
    nombre: '',
    cantidad: 0,
    unidad: 'kg' as Insumo['unidad'],
    cantidad_critica: 0,
    cantidad_pedido_sugerido: 0,
    proveedor: '',
    costo_unitario: 0,
    activo: true,
    sucursal_id: sucursalActualId,
  })
  const sucursal = sucursales.find(item => item.id === sucursalActualId)
  const actuales = insumos.filter(item => item.sucursal_id === sucursalActualId)
  const criticos = actuales.filter(item => item.cantidad > 0 && item.cantidad <= item.cantidad_critica)
  const sinStock = actuales.filter(item => item.cantidad <= 0)
  const valorInventario = actuales.reduce((total, item) => total + item.cantidad * item.costo_unitario, 0)

  const filtrados = actuales.filter(item => {
    if (filtro === 'critico') return item.cantidad > 0 && item.cantidad <= item.cantidad_critica
    if (filtro === 'sinstock') return item.cantidad <= 0
    return true
  })

  const showToast = (mensaje: string) => {
    setToast(mensaje)
    window.setTimeout(() => setToast(''), 2300)
  }

  const exportar = () => {
    const blob = new Blob([exportarInsumosCSV(sucursalActualId)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `inventario_${sucursal?.nombre || 'messa'}_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    showToast('Inventario exportado')
  }

  const importar = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = result => {
      const resumen = importarInsumosCSV(String(result.target?.result || ''), sucursalActualId)
      showToast(`${resumen.ok} insumos importados · ${resumen.errores} errores`)
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const abrirEdicion = (insumo: Insumo) => {
    setEditando(insumo)
    setCantidad(insumo.cantidad)
  }

  const guardarCantidad = () => {
    if (!editando) return
    actualizarInsumo(editando.id, cantidad)
    setEditando(null)
    showToast('Stock actualizado')
  }

  const crear = () => {
    if (!nuevo.nombre.trim()) return showToast('Ingresá el nombre del insumo')
    agregarInsumo({ ...nuevo, sucursal_id: sucursalActualId })
    setNuevo({ nombre: '', cantidad: 0, unidad: 'kg', cantidad_critica: 0, cantidad_pedido_sugerido: 0, proveedor: '', costo_unitario: 0, activo: true, sucursal_id: sucursalActualId })
    setCreando(false)
    showToast('Insumo creado')
  }

  return (
    <AdminWorkspace
      eyebrow="Operación e inventario"
      title="Inventario"
      description={`Existencias, niveles críticos y sugerencias de reposición para ${sucursal?.nombre || 'la sucursal actual'}.`}
      actions={(
        <>
          <AdminButton tone="neutral" icon={Download} onClick={exportar}>Exportar CSV</AdminButton>
          <label className="messa-button messa-button--neutral"><Upload size={16} />Importar CSV<input type="file" accept=".csv" onChange={importar} hidden /></label>
          <AdminButton tone="primary" icon={Plus} onClick={() => setCreando(true)}>Nuevo insumo</AdminButton>
        </>
      )}
    >
      <AdminToast>{toast}</AdminToast>

      <div className="messa-metrics">
        <AdminMetric label="Insumos activos" value={`${actuales.length}`} detail="En esta sucursal" Icon={Boxes} tone="blue" progress={100} />
        <AdminMetric label="Stock saludable" value={`${actuales.length - criticos.length - sinStock.length}`} detail="Sin alertas de reposición" Icon={PackageCheck} tone="green" progress={((actuales.length - criticos.length - sinStock.length) / Math.max(actuales.length, 1)) * 100} />
        <AdminMetric label="Nivel crítico" value={`${criticos.length}`} detail="Próximos a agotarse" Icon={AlertTriangle} tone={criticos.length ? 'amber' : 'green'} progress={(criticos.length / Math.max(actuales.length, 1)) * 100} />
        <AdminMetric label="Sin stock" value={`${sinStock.length}`} detail={`Valor estimado $ ${Math.round(valorInventario).toLocaleString('es-AR')}`} Icon={PackageOpen} tone={sinStock.length ? 'rose' : 'green'} progress={(sinStock.length / Math.max(actuales.length, 1)) * 100} />
      </div>

      <AdminPanel
        eyebrow="Control de existencias"
        title="Stock por insumo"
        detail="Los platos se ocultan automáticamente si un insumo requerido llega a cero."
        action={<AdminSegmented<Filtro> value={filtro} onChange={setFiltro} label="Filtrar inventario" items={[{ value: 'todos', label: 'Todo', count: actuales.length }, { value: 'critico', label: 'Crítico', count: criticos.length }, { value: 'sinstock', label: 'Sin stock', count: sinStock.length }]} />}
      >
        {filtrados.length ? (
          <div className="messa-inventory-table">
            <div className="messa-data-row messa-data-row--header"><span>Insumo</span><span>Disponible</span><span>Nivel</span><span>Proveedor</span><span /></div>
            {filtrados.map(insumo => {
              const maximo = Math.max(insumo.cantidad_pedido_sugerido * 1.5, insumo.cantidad_critica * 2, 1)
              const nivel = Math.min(100, (insumo.cantidad / maximo) * 100)
              const estado = insumo.cantidad <= 0 ? 'rose' : insumo.cantidad <= insumo.cantidad_critica ? 'amber' : 'green'
              return (
                <div className="messa-data-row" key={insumo.id}>
                  <span><b>{insumo.nombre}</b><small>Crítico en {insumo.cantidad_critica} {insumo.unidad}</small></span>
                  <strong>{Number.isInteger(insumo.cantidad) ? insumo.cantidad : insumo.cantidad.toFixed(2)} <small>{insumo.unidad}</small></strong>
                  <span className="messa-stock-level"><i><b className={`messa-stock-level--${estado}`} style={{ width: `${nivel}%` }} /></i><AdminStatus tone={estado}>{insumo.cantidad <= 0 ? 'Agotado' : insumo.cantidad <= insumo.cantidad_critica ? 'Reponer' : 'Correcto'}</AdminStatus></span>
                  <span><b>{insumo.proveedor || 'Sin proveedor'}</b><small>Sugerido: {insumo.cantidad_pedido_sugerido} {insumo.unidad}</small></span>
                  <button type="button" onClick={() => abrirEdicion(insumo)} aria-label={`Actualizar ${insumo.nombre}`}><Pencil size={15} /></button>
                </div>
              )
            })}
          </div>
        ) : <AdminEmpty Icon={PackageCheck} title="No hay insumos en este estado" description="Probá otro filtro o agregá un insumo nuevo." />}
      </AdminPanel>

      <AdminSheet
        open={Boolean(editando)}
        onClose={() => setEditando(null)}
        eyebrow="Ajuste de stock"
        title={editando?.nombre || 'Actualizar insumo'}
        footer={<><AdminButton tone="neutral" onClick={() => setEditando(null)}>Cancelar</AdminButton><AdminButton tone="primary" onClick={guardarCantidad}>Guardar cantidad</AdminButton></>}
      >
        <div className="messa-adjust-stock">
          <p>Actualizá la cantidad física disponible. La carta se recalcula inmediatamente.</p>
          <label htmlFor="cantidad-stock">Cantidad en {editando?.unidad}</label>
          <input id="cantidad-stock" className="input-premium" type="number" step=".01" min="0" value={cantidad} onChange={event => setCantidad(Number(event.target.value))} autoFocus />
          <div className="messa-quick-values">
            {[0, editando?.cantidad_critica || 0, editando?.cantidad_pedido_sugerido || 0].map(valor => <button type="button" key={valor} onClick={() => setCantidad(valor)}>{valor} {editando?.unidad}</button>)}
          </div>
        </div>
      </AdminSheet>

      <AdminSheet
        open={creando}
        onClose={() => setCreando(false)}
        eyebrow="Nuevo registro"
        title="Agregar insumo"
        footer={<><AdminButton tone="neutral" onClick={() => setCreando(false)}>Cancelar</AdminButton><AdminButton tone="primary" onClick={crear}>Crear insumo</AdminButton></>}
      >
        <div className="messa-product-form">
          <Field label="Nombre" wide><input className="input-premium" value={nuevo.nombre} onChange={event => setNuevo({ ...nuevo, nombre: event.target.value })} /></Field>
          <Field label="Cantidad"><input className="input-premium" type="number" min="0" step=".01" value={nuevo.cantidad} onChange={event => setNuevo({ ...nuevo, cantidad: Number(event.target.value) })} /></Field>
          <Field label="Unidad"><select className="input-premium" value={nuevo.unidad} onChange={event => setNuevo({ ...nuevo, unidad: event.target.value as Insumo['unidad'] })}>{['kg', 'g', 'l', 'ml', 'unidad', 'porcion'].map(unidad => <option key={unidad}>{unidad}</option>)}</select></Field>
          <Field label="Nivel crítico"><input className="input-premium" type="number" min="0" step=".01" value={nuevo.cantidad_critica} onChange={event => setNuevo({ ...nuevo, cantidad_critica: Number(event.target.value) })} /></Field>
          <Field label="Pedido sugerido"><input className="input-premium" type="number" min="0" step=".01" value={nuevo.cantidad_pedido_sugerido} onChange={event => setNuevo({ ...nuevo, cantidad_pedido_sugerido: Number(event.target.value) })} /></Field>
          <Field label="Proveedor" wide><input className="input-premium" value={nuevo.proveedor} onChange={event => setNuevo({ ...nuevo, proveedor: event.target.value })} /></Field>
          <Field label="Costo unitario" wide><input className="input-premium" type="number" min="0" value={nuevo.costo_unitario} onChange={event => setNuevo({ ...nuevo, costo_unitario: Number(event.target.value) })} /></Field>
        </div>
      </AdminSheet>
    </AdminWorkspace>
  )
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <div className={`messa-form-field${wide ? ' messa-form-field--wide' : ''}`}><label>{label}</label>{children}</div>
}
