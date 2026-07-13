'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { Insumo } from '@/types'
import { generarId } from '@/lib/utils'

export default function StockAdminPage() {
  const { insumos, actualizarInsumo, agregarInsumo, importarInsumosCSV, exportarInsumosCSV, sucursalActualId, sucursales } = useStore()
  const [editId, setEditId] = useState<string | null>(null)
  const [editCampos, setEditCampos] = useState<Partial<Insumo>>({})
  const [creando, setCreando] = useState(false)
  const [nuevoInsumo, setNuevoInsumo] = useState({ nombre: '', cantidad: 0, unidad: 'kg' as Insumo['unidad'], cantidad_critica: 0, cantidad_pedido_sugerido: 0, proveedor: '', costo_unitario: 0, activo: true, sucursal_id: sucursalActualId })
  const [toast, setToast] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'critico' | 'sinstock'>('todos')
  const insumosSucursal = insumos.filter(i => i.sucursal_id === sucursalActualId)
  const nombreSucursal = sucursales.find(s => s.id === sucursalActualId)?.nombre || ''

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const insumosFiltrados = insumosSucursal.filter(i => {
    if (filtro === 'critico') return i.cantidad <= i.cantidad_critica && i.cantidad > 0
    if (filtro === 'sinstock') return i.cantidad <= 0
    return true
  })

  const handleGuardar = (id: string) => {
    const ins = insumos.find(i => i.id === id)
    if (!ins) return
    actualizarInsumo(id, editCampos.cantidad ?? ins.cantidad)
    setEditId(null)
    showToast('Insumo actualizado ✓')
  }

  const handleCrear = () => {
    if (!nuevoInsumo.nombre) { showToast('Ingresá un nombre'); return }
    agregarInsumo({ ...nuevoInsumo, sucursal_id: sucursalActualId })
    setNuevoInsumo({ nombre: '', cantidad: 0, unidad: 'kg', cantidad_critica: 0, cantidad_pedido_sugerido: 0, proveedor: '', costo_unitario: 0, activo: true, sucursal_id: sucursalActualId })
    setCreando(false)
    showToast('Insumo creado ✓')
  }

  const handleExportar = () => {
    const csv = exportarInsumosCSV(sucursalActualId)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `stock_${nombreSucursal}_${new Date().toISOString().split('T')[0]}.csv`; a.click()
    showToast('CSV exportado — abrilo con Excel ✓')
  }

  const handleImportar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const { ok, errores } = importarInsumosCSV(ev.target?.result as string, sucursalActualId)
      showToast(`Importado: ${ok} OK, ${errores} errores`)
    }
    reader.readAsText(file); e.target.value = ''
  }

  const colorEstado = (ins: Insumo) => ins.cantidad <= 0 ? '#EF4444' : ins.cantidad <= ins.cantidad_critica ? '#F59E0B' : '#22C55E'

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', paddingBottom: 40 }}>
      {toast && <div className="fade-in" style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', background: '#1C1C1C', border: '1px solid #383838', borderRadius: 100, padding: '10px 20px', fontSize: 13, color: '#fff', zIndex: 9999, whiteSpace: 'nowrap' }}>{toast}</div>}

      <div style={{ background: '#0A0A0A', borderBottom: '1px solid #1C1C1C', padding: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Inventario</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707070' }}>{insumos.length} insumos registrados</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setCreando(true)} className="btn-gold" style={{ padding: '8px 14px', borderRadius: 10, border: 'none', fontSize: 13, cursor: 'pointer' }}>+ Nuevo</button>
            <Link href="/admin" style={{ textDecoration: 'none', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#A0A0A0' }}>← Admin</Link>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={handleExportar} style={{ flex: 1, padding: 9, borderRadius: 10, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#22C55E', fontSize: 12, cursor: 'pointer' }}>📥 Exportar Excel</button>
          <label style={{ flex: 1, padding: 9, borderRadius: 10, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#3B82F6', fontSize: 12, cursor: 'pointer', textAlign: 'center' }}>
            📤 Importar CSV <input type="file" accept=".csv" onChange={handleImportar} style={{ display: 'none' }} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {([['todos', 'Todos'], ['critico', '⚠️ Críticos'], ['sinstock', '🚨 Sin stock']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setFiltro(v)} style={{ flex: 1, padding: '7px', borderRadius: 10, fontSize: 12, cursor: 'pointer', background: filtro === v ? 'rgba(212,175,55,0.15)' : '#1C1C1C', color: filtro === v ? '#D4AF37' : '#707070', border: filtro === v ? '1px solid rgba(212,175,55,0.4)' : '1px solid #2A2A2A' }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 12, color: '#A0A0A0', lineHeight: 1.6 }}>
          💡 Formato CSV: <code style={{ color: '#3B82F6' }}>nombre,cantidad,unidad,cantidad_critica,proveedor</code><br />
          Los platos se ocultan automáticamente cuando sus insumos llegan a 0.
        </div>

        {insumosFiltrados.map(ins => {
          const color = colorEstado(ins)
          const pct = Math.min(100, (ins.cantidad / (ins.cantidad_pedido_sugerido * 1.5 || 1)) * 100)
          const isEditing = editId === ins.id
          return (
            <div key={ins.id} style={{ background: '#141414', border: `1px solid ${color}25`, borderRadius: 14, padding: '12px 14px', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{ins.nombre}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#707070' }}>{ins.proveedor || 'Sin proveedor'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color }}>{ins.cantidad % 1 === 0 ? ins.cantidad : ins.cantidad.toFixed(2)} <span style={{ fontSize: 11, color: '#707070' }}>{ins.unidad}</span></p>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: '#707070' }}>Crítico: {ins.cantidad_critica} · Pedir: {ins.cantidad_pedido_sugerido}</p>
                </div>
              </div>
              <div style={{ background: '#1C1C1C', borderRadius: 100, height: 5, marginBottom: 10 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 100 }} />
              </div>
              {isEditing ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="number" step="0.1" value={editCampos.cantidad ?? ins.cantidad} onChange={e => setEditCampos({ ...editCampos, cantidad: parseFloat(e.target.value) || 0 })} style={{ flex: 1, background: '#1C1C1C', border: '1px solid #383838', borderRadius: 10, padding: '8px 12px', color: '#fff', fontSize: 14 }} autoFocus />
                  <button onClick={() => handleGuardar(ins.id)} className="btn-gold" style={{ padding: '8px 16px', borderRadius: 10, border: 'none', fontSize: 13, cursor: 'pointer' }}>✓</button>
                  <button onClick={() => setEditId(null)} style={{ padding: '8px 12px', borderRadius: 10, background: '#2A2A2A', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setEditId(ins.id); setEditCampos({ cantidad: ins.cantidad }) }} style={{ flex: 1, padding: '7px', borderRadius: 10, background: '#1C1C1C', border: '1px solid #2A2A2A', color: '#A0A0A0', fontSize: 12, cursor: 'pointer' }}>✏️ Actualizar</button>
                  {ins.cantidad <= ins.cantidad_critica && <span style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: '#F59E0B', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '6px 10px' }}>📦 Pedir {ins.cantidad_pedido_sugerido} {ins.unidad}</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {creando && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setCreando(false) }} style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div className="slide-up" style={{ width: '100%', maxWidth: 480, margin: '0 auto', background: '#141414', borderRadius: '20px 20px 0 0', padding: '20px 20px 40px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>Nuevo insumo</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[['nombre', 'Nombre *', 'text'], ['proveedor', 'Proveedor', 'text']].map(([k, l, t]) => (
                <div key={k}>
                  <p style={{ margin: '0 0 5px', fontSize: 12, color: '#707070' }}>{l}</p>
                  <input type={t} value={(nuevoInsumo as any)[k]} onChange={e => setNuevoInsumo({ ...nuevoInsumo, [k]: e.target.value })} style={{ width: '100%', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 12, padding: '10px 14px', color: '#fff', fontSize: 14 }} />
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <p style={{ margin: '0 0 5px', fontSize: 12, color: '#707070' }}>Cantidad</p>
                  <input type="number" step="0.1" value={nuevoInsumo.cantidad} onChange={e => setNuevoInsumo({ ...nuevoInsumo, cantidad: parseFloat(e.target.value) || 0 })} style={{ width: '100%', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 12, padding: '10px 14px', color: '#fff', fontSize: 14 }} />
                </div>
                <div>
                  <p style={{ margin: '0 0 5px', fontSize: 12, color: '#707070' }}>Unidad</p>
                  <select value={nuevoInsumo.unidad} onChange={e => setNuevoInsumo({ ...nuevoInsumo, unidad: e.target.value as Insumo['unidad'] })} style={{ width: '100%', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 12, padding: '10px 14px', color: '#fff', fontSize: 14 }}>
                    {['kg', 'g', 'l', 'ml', 'unidad', 'porcion'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <p style={{ margin: '0 0 5px', fontSize: 12, color: '#707070' }}>Nivel crítico</p>
                  <input type="number" step="0.1" value={nuevoInsumo.cantidad_critica} onChange={e => setNuevoInsumo({ ...nuevoInsumo, cantidad_critica: parseFloat(e.target.value) || 0 })} style={{ width: '100%', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 12, padding: '10px 14px', color: '#fff', fontSize: 14 }} />
                </div>
                <div>
                  <p style={{ margin: '0 0 5px', fontSize: 12, color: '#707070' }}>Cant. a pedir</p>
                  <input type="number" step="0.1" value={nuevoInsumo.cantidad_pedido_sugerido} onChange={e => setNuevoInsumo({ ...nuevoInsumo, cantidad_pedido_sugerido: parseFloat(e.target.value) || 0 })} style={{ width: '100%', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 12, padding: '10px 14px', color: '#fff', fontSize: 14 }} />
                </div>
              </div>
              <button onClick={handleCrear} className="btn-gold" style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', fontSize: 15, cursor: 'pointer', marginTop: 8 }}>Crear insumo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
