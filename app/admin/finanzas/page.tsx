'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { formatPrecio } from '@/lib/utils'

const CATEGORIAS_GASTO = ['Alquiler', 'Sueldos', 'Servicios (luz/gas/agua)', 'Insumos extra', 'Marketing', 'Mantenimiento', 'Impuestos', 'Otro']

export default function FinanzasPage() {
  const { pedidos, gastos, agregarGasto, eliminarGasto, costoInsumosConsumidoHistorico, sucursalActualId, sucursales, cierres } = useStore()
  const [tab, setTab] = useState<'resumen' | 'gastos'>('resumen')
  const [creandoGasto, setCreandoGasto] = useState(false)
  const [form, setForm] = useState({ categoria: CATEGORIAS_GASTO[0], descripcion: '', monto: 0 })
  const [toast, setToast] = useState('')
  const nombreSucursal = sucursales.find(s => s.id === sucursalActualId)?.nombre || ''

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2600) }

  const ventasTotales = pedidos.filter(p => p.estado === 'pagado' && p.sucursal_id === sucursalActualId).reduce((acc, p) => acc + p.total + (p.propina || 0), 0)
  const propinasTotales = pedidos.filter(p => p.estado === 'pagado' && p.sucursal_id === sucursalActualId).reduce((acc, p) => acc + (p.propina || 0), 0)
  const gastosSucursal = gastos.filter(g => !g.sucursal_id || g.sucursal_id === sucursalActualId)
  const gastosTotales = gastosSucursal.reduce((acc, g) => acc + g.monto, 0)
  const margenBruto = ventasTotales - costoInsumosConsumidoHistorico
  const margenNeto = margenBruto - gastosTotales
  const margenPct = ventasTotales > 0 ? Math.round((margenNeto / ventasTotales) * 100) : 0

  const handleCrear = () => {
    if (!form.descripcion.trim() || form.monto <= 0) { showToast('Completá descripción y monto'); return }
    agregarGasto({ ...form, fecha: new Date().toISOString().split('T')[0], sucursal_id: sucursalActualId })
    setForm({ categoria: CATEGORIAS_GASTO[0], descripcion: '', monto: 0 })
    setCreandoGasto(false)
    showToast('Gasto registrado ✓')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 40 }}>
      {toast && <div className="fade-in" style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', background: '#1C1C1C', border: '1px solid #383838', borderRadius: 100, padding: '10px 20px', fontSize: 13, color: '#fff', zIndex: 9999, whiteSpace: 'nowrap' }}>{toast}</div>}

      <div style={{ background: 'var(--bg)', borderBottom: '1px solid #1C1C1C', padding: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h1 className="font-titulos" style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Finanzas</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707070' }}>📍 {nombreSucursal}</p>
          </div>
          <Link href="/admin" style={{ textDecoration: 'none', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#A0A0A0' }}>← Admin</Link>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setTab('resumen')} style={{ flex: 1, padding: 9, borderRadius: 10, fontSize: 12, cursor: 'pointer', background: tab === 'resumen' ? 'rgba(212,175,55,0.15)' : '#1C1C1C', color: tab === 'resumen' ? 'var(--gold)' : '#707070', border: tab === 'resumen' ? '1px solid rgba(212,175,55,0.4)' : '1px solid #2A2A2A' }}>📊 Resumen</button>
          <button onClick={() => setTab('gastos')} style={{ flex: 1, padding: 9, borderRadius: 10, fontSize: 12, cursor: 'pointer', background: tab === 'gastos' ? 'rgba(212,175,55,0.15)' : '#1C1C1C', color: tab === 'gastos' ? 'var(--gold)' : '#707070', border: tab === 'gastos' ? '1px solid rgba(212,175,55,0.4)' : '1px solid #2A2A2A' }}>💸 Gastos ({gastosSucursal.length})</button>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {tab === 'resumen' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Ventas totales', val: formatPrecio(ventasTotales), color: '#22C55E', emoji: '💰' },
                { label: 'Propinas', val: formatPrecio(propinasTotales), color: 'var(--gold)', emoji: '💛' },
                { label: 'Costo insumos (COGS)', val: formatPrecio(costoInsumosConsumidoHistorico), color: '#F59E0B', emoji: '📦' },
                { label: 'Gastos operativos', val: formatPrecio(gastosTotales), color: '#EF4444', emoji: '💸' },
              ].map(s => (
                <div key={s.label} style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 14, padding: 14 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 20 }}>{s.emoji}</p>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: s.color }}>{s.val}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#707070' }}>{s.label}</p>
                </div>
              ))}
            </div>

            <div style={{ background: margenNeto >= 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: margenNeto >= 0 ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(239,68,68,0.25)', borderRadius: 16, padding: 20, marginBottom: 16, textAlign: 'center' }}>
              <p style={{ margin: '0 0 6px', fontSize: 12, color: '#707070', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Margen neto estimado</p>
              <p style={{ margin: 0, fontSize: 32, fontWeight: 700, color: margenNeto >= 0 ? '#22C55E' : '#EF4444' }}>{formatPrecio(margenNeto)}</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#707070' }}>{margenPct}% sobre ventas</p>
            </div>

            <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 14, padding: 16, marginBottom: 12 }}>
              <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600 }}>Desglose</p>
              {[
                ['Ventas totales', ventasTotales, '#22C55E'],
                ['− Costo de insumos (COGS)', -costoInsumosConsumidoHistorico, '#F59E0B'],
                ['= Margen bruto', margenBruto, '#3B82F6'],
                ['− Gastos operativos', -gastosTotales, '#EF4444'],
                ['= Margen neto', margenNeto, margenNeto >= 0 ? '#22C55E' : '#EF4444'],
              ].map(([l, v, c]) => (
                <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1C1C1C', fontSize: 13 }}>
                  <span style={{ color: '#A0A0A0', fontWeight: (l as string).startsWith('=') ? 700 : 400 }}>{l}</span>
                  <span style={{ color: c as string, fontWeight: 600 }}>{formatPrecio(v as number)}</span>
                </div>
              ))}
            </div>

            <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 12, padding: 12 }}>
              <p style={{ margin: 0, fontSize: 12, color: '#A0A0A0', lineHeight: 1.6 }}>💡 El costo de insumos (COGS) se calcula automáticamente según el costo unitario cargado en Inventario, cada vez que se confirma un pedido. Cargá los costos reales en <Link href="/admin/stock" style={{ color: '#3B82F6' }}>Inventario</Link> para que este número sea preciso.</p>
            </div>
          </>
        )}

        {tab === 'gastos' && (
          <>
            <button onClick={() => setCreandoGasto(true)} className="btn-gold" style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', fontSize: 14, cursor: 'pointer', marginBottom: 16 }}>+ Registrar gasto</button>
            {gastosSucursal.length === 0 && <div style={{ textAlign: 'center', padding: '60px 20px', color: '#707070' }}><p style={{ fontSize: 40 }}>💸</p><p>Sin gastos registrados</p></div>}
            {[...gastosSucursal].reverse().map(g => (
              <div key={g.id} style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 14, padding: '12px 16px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{g.descripcion}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#707070' }}>{g.categoria} · {new Date(g.fecha).toLocaleDateString('es-AR')}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#EF4444' }}>{formatPrecio(g.monto)}</span>
                  <button onClick={() => eliminarGasto(g.id)} style={{ background: 'transparent', border: 'none', color: '#707070', cursor: 'pointer' }}>🗑</button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {creandoGasto && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setCreandoGasto(false) }} style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div className="slide-up" style={{ width: '100%', maxWidth: 480, margin: '0 auto', background: '#141414', borderRadius: '20px 20px 0 0', padding: '20px 20px 40px' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>Nuevo gasto</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <p style={{ margin: '0 0 6px', fontSize: 12, color: '#707070' }}>Categoría</p>
                <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} className="input-premium">
                  {CATEGORIAS_GASTO.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><p style={{ margin: '0 0 6px', fontSize: 12, color: '#707070' }}>Descripción</p><input value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Ej: Alquiler julio 2026" className="input-premium" /></div>
              <div><p style={{ margin: '0 0 6px', fontSize: 12, color: '#707070' }}>Monto</p><input type="number" value={form.monto || ''} onChange={e => setForm({ ...form, monto: parseFloat(e.target.value) || 0 })} placeholder="0" className="input-premium" /></div>
              <button onClick={handleCrear} className="btn-gold" style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', fontSize: 15, cursor: 'pointer', marginTop: 8 }}>Registrar gasto</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
