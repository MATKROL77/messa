'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { formatPrecio } from '@/lib/utils'

export default function EncargosPage() {
  const { insumos, actualizarInsumo, exportarInsumosCSV, importarInsumosCSV, sucursalActualId, sucursales } = useStore()
  const [editId, setEditId] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const [toast, setToast] = useState('')

  const insumosSucursal = insumos.filter(i => i.sucursal_id === sucursalActualId)
  const nombreSucursal = sucursales.find(s => s.id === sucursalActualId)?.nombre || ''
  const criticos = insumosSucursal.filter(i => i.cantidad <= i.cantidad_critica && i.activo)
  const sinStock = insumosSucursal.filter(i => i.cantidad <= 0 && i.activo)
  const normales = insumosSucursal.filter(i => i.cantidad > i.cantidad_critica && i.activo)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const handleGuardar = (id: string) => {
    const val = parseFloat(editVal)
    if (isNaN(val) || val < 0) { showToast('Cantidad inválida'); return }
    actualizarInsumo(id, val)
    setEditId(null)
    showToast('Stock actualizado ✓')
  }

  const handleExportar = () => {
    const csv = exportarInsumosCSV(sucursalActualId)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `stock_${nombreSucursal}_${new Date().toISOString().split('T')[0]}.csv`; a.click()
    showToast('CSV exportado ✓')
  }

  const handleImportar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const csv = ev.target?.result as string
      const { ok, errores } = importarInsumosCSV(csv, sucursalActualId)
      showToast(`Importado: ${ok} filas OK, ${errores} errores`)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const pctBarra = (insumo: typeof insumos[0]) => Math.min(100, (insumo.cantidad / (insumo.cantidad_pedido_sugerido * 1.5 || 1)) * 100)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 40 }}>
      {toast && <div className="fade-in" style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', background: '#1C1C1C', border: '1px solid #383838', borderRadius: 100, padding: '10px 20px', fontSize: 13, color: '#fff', zIndex: 9999, whiteSpace: 'nowrap' }}>{toast}</div>}

      <div style={{ background: 'var(--bg)', borderBottom: '1px solid #1C1C1C', padding: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h1 className="font-titulos" style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Encargos & Stock</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707070' }}>📍 {nombreSucursal}</p>
          </div>
          <Link href="/" style={{ textDecoration: 'none', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#A0A0A0' }}>← Inicio</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {[
            { label: '🚨 Sin stock', val: sinStock.length, color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
            { label: '⚠️ Crítico', val: criticos.length, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
            { label: '✅ Normal', val: normales.length, color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</p>
              <p style={{ margin: '2px 0 0', fontSize: 10, color: s.color }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={handleExportar} style={{ flex: 1, padding: '10px', borderRadius: 12, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#22C55E', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>📥 Exportar a Excel/CSV</button>
          <label style={{ flex: 1, padding: '10px', borderRadius: 12, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#3B82F6', fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'center' }}>
            📤 Importar desde CSV
            <input type="file" accept=".csv" onChange={handleImportar} style={{ display: 'none' }} />
          </label>
        </div>

        <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 12, color: '#A0A0A0', lineHeight: 1.6 }}>
          💡 Formato CSV para importar: <code style={{ color: '#3B82F6' }}>nombre,cantidad,unidad,cantidad_critica,proveedor</code>
        </div>

        {sinStock.length > 0 && (
          <>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>🚨 Sin stock — platos ocultos en la carta</p>
            {sinStock.map(ins => <InsumoRow key={ins.id} ins={ins} editId={editId} setEditId={setEditId} editVal={editVal} setEditVal={setEditVal} onGuardar={handleGuardar} color="#EF4444" pct={0} barColor="#EF4444" />)}
          </>
        )}

        {criticos.length > 0 && (
          <>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '16px 0 10px' }}>⚠️ Stock crítico — pedir pronto</p>
            {criticos.map(ins => <InsumoRow key={ins.id} ins={ins} editId={editId} setEditId={setEditId} editVal={editVal} setEditVal={setEditVal} onGuardar={handleGuardar} color="#F59E0B" pct={pctBarra(ins)} barColor="#F59E0B" />)}
          </>
        )}

        <p style={{ fontSize: 12, fontWeight: 600, color: '#707070', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '16px 0 10px' }}>✅ Stock normal</p>
        {normales.map(ins => <InsumoRow key={ins.id} ins={ins} editId={editId} setEditId={setEditId} editVal={editVal} setEditVal={setEditVal} onGuardar={handleGuardar} color="#22C55E" pct={pctBarra(ins)} barColor="#22C55E" />)}
      </div>
    </div>
  )
}

function InsumoRow({ ins, editId, setEditId, editVal, setEditVal, onGuardar, color, pct, barColor }: any) {
  return (
    <div style={{ background: '#141414', border: `1px solid ${color}20`, borderRadius: 14, padding: '12px 14px', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{ins.nombre}</p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#707070' }}>{ins.proveedor || 'Sin proveedor'}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color }}>{ins.cantidad.toFixed(1)} <span style={{ fontSize: 11, color: '#707070' }}>{ins.unidad}</span></p>
          <p style={{ margin: '2px 0 0', fontSize: 10, color: '#707070' }}>Crítico: {ins.cantidad_critica} {ins.unidad}</p>
        </div>
      </div>
      <div style={{ background: '#1C1C1C', borderRadius: 100, height: 6, marginBottom: 10 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 100, transition: 'width 0.3s' }} />
      </div>
      {editId === ins.id ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="number" value={editVal} onChange={e => setEditVal(e.target.value)} placeholder="Nueva cantidad" style={{ flex: 1, background: '#1C1C1C', border: '1px solid #383838', borderRadius: 10, padding: '8px 12px', color: '#fff', fontSize: 14 }} autoFocus />
          <button onClick={() => onGuardar(ins.id)} className="btn-gold" style={{ padding: '8px 16px', borderRadius: 10, border: 'none', fontSize: 13, cursor: 'pointer' }}>✓</button>
          <button onClick={() => setEditId(null)} style={{ padding: '8px 12px', borderRadius: 10, background: '#2A2A2A', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer' }}>✕</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setEditId(ins.id); setEditVal(String(ins.cantidad)) }} style={{ flex: 1, padding: '8px', borderRadius: 10, background: '#1C1C1C', border: '1px solid #2A2A2A', color: '#A0A0A0', fontSize: 12, cursor: 'pointer' }}>✏️ Actualizar cantidad</button>
          {ins.cantidad <= ins.cantidad_critica && <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '6px 12px', fontSize: 11, color: '#F59E0B' }}>📦 Pedir: {ins.cantidad_pedido_sugerido} {ins.unidad}</div>}
        </div>
      )}
    </div>
  )
}
