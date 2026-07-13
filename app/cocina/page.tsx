'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { Pedido } from '@/types'
import { formatPrecio, tiempoTranscurrido, tiempoEnMinutos } from '@/lib/utils'

type FiltroKDS = 'todos' | 'en_cocina' | 'listo' | 'entregado'

export default function CocinaPage() {
  const { pedidos, marcarPedidoEntregado, cancelarPedido, actualizarMesa, insumos, sucursalActualId, sucursales } = useStore()
  const [filtro, setFiltro] = useState<FiltroKDS>('en_cocina')
  const [pedidoExpandido, setPedidoExpandido] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const criticos = insumos.filter(i => i.cantidad <= i.cantidad_critica && i.activo && i.sucursal_id === sucursalActualId)
  const nombreSucursal = sucursales.find(s => s.id === sucursalActualId)?.nombre || ''

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 15000)
    return () => clearInterval(interval)
  }, [])

  const pedidosFiltrados = pedidos
    .filter(p => p.sucursal_id === sucursalActualId)
    .filter(p => {
      if (filtro === 'todos') return p.estado !== 'cancelado'
      return p.estado === filtro
    })
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const pedidosSucursal = pedidos.filter(p => p.sucursal_id === sucursalActualId)
  const counts = {
    en_cocina: pedidosSucursal.filter(p => p.estado === 'en_cocina').length,
    listo:     pedidosSucursal.filter(p => p.estado === 'listo').length,
    entregado: pedidosSucursal.filter(p => p.estado === 'entregado').length,
  }

  const urgencia = (p: Pedido) => {
    const mins = tiempoEnMinutos(p.created_at)
    if (mins > 30) return { color: '#EF4444', label: '🔴 Urgente' }
    if (mins > 15) return { color: '#F59E0B', label: '🟡 Atención' }
    return { color: '#22C55E', label: '🟢 Normal' }
  }

  const handleMarcarListo = (pedidoId: string) => {
    const p = pedidos.find(x => x.id === pedidoId)
    if (!p) return
    // update to 'listo'
    actualizarMesa(p.mesa_id, 'pedido')
    marcarPedidoEntregado(pedidoId)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', paddingBottom: 20 }}>
      {/* Header */}
      <div style={{ background: '#0A0A0A', borderBottom: '1px solid #1C1C1C', padding: '16px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Cocina · KDS</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707070' }}>📍 {nombreSucursal} · Kitchen Display System</p>
          </div>
          <Link href="/dashboard" style={{ textDecoration: 'none', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#A0A0A0' }}>
            🚦 Salón
          </Link>
        </div>

        {criticos.length > 0 && (
          <Link href="/encargos" style={{ textDecoration: 'none', display: 'block', marginBottom: 12 }}>
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600 }}>⚠️ {criticos.length} insumo{criticos.length > 1 ? 's' : ''} en nivel crítico — ver Encargos</span>
              <span style={{ color: '#F59E0B' }}>›</span>
            </div>
          </Link>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', whiteSpace: 'nowrap' }}>
          {([
            { val: 'en_cocina', label: `🍳 En cocina (${counts.en_cocina})` },
            { val: 'listo', label: `✅ Listos (${counts.listo})` },
            { val: 'entregado', label: `🚀 Entregados (${counts.entregado})` },
            { val: 'todos', label: '📋 Todos' },
          ] as const).map(tab => (
            <button key={tab.val} onClick={() => setFiltro(tab.val)} style={{
              borderRadius: 100, padding: '6px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0,
              background: filtro === tab.val ? 'rgba(212,175,55,0.15)' : '#1C1C1C',
              color: filtro === tab.val ? '#D4AF37' : '#A0A0A0',
              border: filtro === tab.val ? '1px solid rgba(212,175,55,0.4)' : '1px solid #2A2A2A',
            }}>{tab.label}</button>
          ))}
        </div>
      </div>

      {/* Pedidos */}
      <div style={{ padding: '12px 16px' }}>
        {pedidosFiltrados.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#707070' }}>
            <p style={{ fontSize: 40, margin: '0 0 12px' }}>{filtro === 'en_cocina' ? '🎉' : '🍳'}</p>
            <p style={{ margin: 0, fontSize: 15 }}>
              {filtro === 'en_cocina' ? '¡Todo al día! Sin pedidos pendientes.' : 'Sin pedidos en este estado'}
            </p>
          </div>
        )}

        {pedidosFiltrados.map(pedido => {
          const urg = urgencia(pedido)
          const expandido = pedidoExpandido === pedido.id
          const mins = tiempoEnMinutos(pedido.created_at)

          return (
            <div key={pedido.id} style={{
              background: '#141414', border: `1px solid ${urg.color}30`,
              borderRadius: 16, marginBottom: 12, overflow: 'hidden',
            }}>
              {/* Header tarjeta */}
              <div
                onClick={() => setPedidoExpandido(expandido ? null : pedido.id)}
                style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ background: `${urg.color}15`, border: `1px solid ${urg.color}30`, borderRadius: 12, padding: '8px 14px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: urg.color }}>M{pedido.mesa_numero}</p>
                    <p style={{ margin: 0, fontSize: 9, color: urg.color }}>MESA</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>
                      {pedido.items.length} ítem{pedido.items.length > 1 ? 's' : ''} · {formatPrecio(pedido.total)}
                      {pedido.origen !== 'mesa' && <span style={{ marginLeft: 6, fontSize: 10, background: 'rgba(139,92,246,0.15)', color: '#8B5CF6', borderRadius: 100, padding: '2px 7px' }}>🛵 {pedido.origen}</span>}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707070' }}>
                      Hace {mins} min · {urg.label}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{
                    background: pedido.estado === 'en_cocina' ? 'rgba(245,158,11,0.12)' : pedido.estado === 'entregado' ? 'rgba(34,197,94,0.12)' : 'rgba(59,130,246,0.12)',
                    color: pedido.estado === 'en_cocina' ? '#F59E0B' : pedido.estado === 'entregado' ? '#22C55E' : '#3B82F6',
                    borderRadius: 100, padding: '3px 8px', fontSize: 10, fontWeight: 500,
                  }}>
                    {pedido.estado === 'en_cocina' ? '🍳 Cocina' : pedido.estado === 'entregado' ? '✅ Entregado' : pedido.estado}
                  </span>
                  <span style={{ color: '#707070', fontSize: 18 }}>{expandido ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Items */}
              {expandido && (
                <div style={{ padding: '0 16px 16px' }}>
                  <div style={{ background: '#1C1C1C', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                    {pedido.items.map((item, idx) => (
                      <div key={idx} style={{ padding: '8px 0', borderBottom: idx < pedido.items.length - 1 ? '1px solid #2A2A2A' : 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 15, fontWeight: 600 }}>{item.cantidad}× {item.plato.nombre}</span>
                          <span style={{ fontSize: 13, color: '#707070' }}>{formatPrecio(item.precio_unitario * item.cantidad)}</span>
                        </div>
                        {item.ingredientes_removidos.length > 0 && (
                          <p style={{ margin: 0, fontSize: 12, color: '#EF4444' }}>⚠️ Sin: {item.ingredientes_removidos.join(', ')}</p>
                        )}
                        {item.notas && (
                          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#F59E0B' }}>📝 {item.notas}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Acciones */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    {pedido.estado === 'en_cocina' && (
                      <button
                        onClick={() => handleMarcarListo(pedido.id)}
                        className="btn-gold"
                        style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', fontSize: 13, cursor: 'pointer' }}
                      >
                        ✅ Marcar como entregado
                      </button>
                    )}
                    {pedido.estado === 'en_cocina' && (
                      <button
                        onClick={() => cancelarPedido(pedido.id)}
                        style={{ padding: 12, borderRadius: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: 13, cursor: 'pointer' }}
                      >
                        ✕ Cancelar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
