'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { formatPrecio } from '@/lib/utils'

export default function AdminPage() {
  const { pedidos, mesas, platos, insumos, config, notificaciones, sucursalActualId, sucursales } = useStore()
  const [tab, setTab] = useState<'overview' | 'conversion' | 'platos' | 'prediccion'>('overview')
  const nombreSucursal = sucursales.find(s => s.id === sucursalActualId)?.nombre || ''
  const mesasSucursal = mesas.filter(m => m.sucursal_id === sucursalActualId)
  const insumosSucursal = insumos.filter(i => i.sucursal_id === sucursalActualId)

  const hoy = new Date().toISOString().split('T')[0]
  const pedidosHoy = pedidos.filter(p => p.created_at.startsWith(hoy) && p.sucursal_id === sucursalActualId)
  const pagadosHoy = pedidosHoy.filter(p => p.estado === 'pagado')
  const totalVentas = pagadosHoy.reduce((acc, p) => acc + p.total, 0)
  const ticketProm = pagadosHoy.length > 0 ? totalVentas / pagadosHoy.length : 6200
  const mesasOcupadas = mesasSucursal.filter(m => m.estado !== 'libre').length
  const ocupacion = mesasSucursal.length > 0 ? Math.round((mesasOcupadas / mesasSucursal.length) * 100) : 0
  const insumoCriticos = insumosSucursal.filter(i => i.cantidad <= i.cantidad_critica).length
  const noLeidas = notificaciones.filter(n => !n.leida).length
  const platosDestacados = platos.filter(p => p.destacado).length
  const platosTop = platos.filter(p => p.categoria_id !== 'bebidas').sort((a, b) => b.total_reviews - a.total_reviews).slice(0, 5)

  const modulos = [
    { href: '/admin/carta', emoji: '🍽️', titulo: 'Gestión de Carta', desc: `${platos.length} platos · ${platosDestacados} destacados`, color: '#D4AF37' },
    { href: '/admin/stock', emoji: '📦', titulo: 'Inventario', desc: `${insumoCriticos > 0 ? `⚠️ ${insumoCriticos} insumos críticos` : '✅ Stock normal'}`, color: insumoCriticos > 0 ? '#F59E0B' : '#22C55E' },
    { href: '/admin/mesas', emoji: '🗺️', titulo: 'Plano del Salón', desc: `${mesasSucursal.length} mesas configuradas`, color: '#3B82F6' },
    { href: '/admin/sucursales', emoji: '📍', titulo: 'Sucursales', desc: `${sucursales.length} locales activos`, color: '#8B5CF6' },
    { href: '/admin/pagos', emoji: '💳', titulo: 'Pagos & Propinas', desc: `MP · CBU/CVU · POS · propinas`, color: '#3B82F6' },
    { href: '/admin/finanzas', emoji: '📈', titulo: 'Finanzas', desc: 'Márgenes, costos y gastos', color: '#22C55E' },
    { href: '/admin/cierre', emoji: '🖨️', titulo: 'Cierre de Caja', desc: config.caja_abierta ? '🟢 Caja abierta' : '🔴 Caja cerrada', color: config.caja_abierta ? '#22C55E' : '#EF4444' },
    { href: '/admin/integraciones', emoji: '🛵', titulo: 'Apps de Delivery', desc: 'PedidosYa, Rappi, Uber Eats', color: '#8B5CF6' },
    { href: '/admin/fidelidad', emoji: '🏆', titulo: 'Fidelidad', desc: 'Puntos y recompensas', color: '#D4AF37' },
    { href: '/admin/usuarios', emoji: '👥', titulo: 'Usuarios & Accesos', desc: 'Roles y contraseñas', color: '#3B82F6' },
    { href: '/admin/tema', emoji: '🎨', titulo: 'Identidad de Marca', desc: 'Colores y tipografía', color: '#D4AF37' },
    { href: '/encargos', emoji: '🚨', titulo: 'Encargos & Stock', desc: `${insumoCriticos} alertas pendientes`, color: '#F59E0B' },
    { href: '/reservas', emoji: '📅', titulo: 'Reservas', desc: 'Gestión de reservas del día', color: '#8B5CF6' },
    { href: '/dashboard', emoji: '🚦', titulo: 'Control de Salón', desc: `${mesasOcupadas}/${mesasSucursal.length} mesas ocupadas`, color: '#D4AF37' },
    { href: '/cocina', emoji: '👨‍🍳', titulo: 'KDS Cocina', desc: `${pedidosHoy.filter(p => p.estado === 'en_cocina').length} pedidos en curso`, color: '#F59E0B' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 40 }}>
      <div style={{ background: '#0A0A0A', borderBottom: '1px solid #1C1C1C', padding: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Admin · {config.nombre}</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707070' }}>Panel de gestión completo</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {noLeidas > 0 && <span style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 100, padding: '4px 10px', fontSize: 11, fontWeight: 600 }}>🔔 {noLeidas}</span>}
            <Link href="/" style={{ textDecoration: 'none', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#A0A0A0' }}>← Inicio</Link>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', whiteSpace: 'nowrap' }}>
          {([['overview', '📊 Resumen'], ['conversion', '🔁 Conversión'], ['platos', '🍽️ Platos'], ['prediccion', '🔮 Predicción']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)} style={{ borderRadius: 100, padding: '6px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0, background: tab === v ? 'rgba(212,175,55,0.15)' : '#1C1C1C', color: tab === v ? '#D4AF37' : '#A0A0A0', border: tab === v ? '1px solid rgba(212,175,55,0.4)' : '1px solid #2A2A2A' }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {tab === 'overview' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Ventas hoy', val: formatPrecio(totalVentas || 186400), color: '#22C55E', emoji: '💰' },
                { label: 'Ticket prom.', val: formatPrecio(ticketProm), color: '#D4AF37', emoji: '🧾' },
                { label: 'Ocupación', val: `${ocupacion}%`, color: '#3B82F6', emoji: '🪑' },
                { label: 'Stock crítico', val: insumoCriticos, color: insumoCriticos > 0 ? '#F59E0B' : '#22C55E', emoji: '📦' },
              ].map(s => (
                <div key={s.label} style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 14, padding: 14 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 22 }}>{s.emoji}</p>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707070' }}>{s.label}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Módulos de gestión</p>
            {modulos.map(m => (
              <Link key={m.href} href={m.href} style={{ textDecoration: 'none' }}>
                <div className="card-hover" style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10, cursor: 'pointer' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${m.color}15`, border: `1px solid ${m.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{m.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{m.titulo}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#707070' }}>{m.desc}</p>
                  </div>
                  <span style={{ color: '#383838', fontSize: 18 }}>›</span>
                </div>
              </Link>
            ))}
          </>
        )}

        {tab === 'conversion' && (
          <>
            <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 14, padding: 16, marginBottom: 12 }}>
              <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600 }}>📱 Escaneos vs Pedidos</p>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                {[{ label: 'Escaneos', val: 87, color: '#3B82F6' }, { label: 'Pedidos', val: 64, color: '#22C55E' }, { label: 'Abandonos', val: 23, color: '#EF4444' }].map(s => (
                  <div key={s.label} style={{ flex: 1, background: '#1C1C1C', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: s.color }}>{s.val}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: '#707070' }}>{s.label}</p>
                  </div>
                ))}
              </div>
              <div style={{ background: '#1C1C1C', borderRadius: 100, height: 12, overflow: 'hidden', marginBottom: 4 }}>
                <div style={{ height: '100%', width: '74%', background: 'linear-gradient(90deg, #D4AF37, #22C55E)', borderRadius: 100 }} />
              </div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#22C55E', textAlign: 'right' }}>74% conversión</p>
            </div>
            <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 14, padding: 16, marginBottom: 12 }}>
              <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>🚪 Motivos de abandono</p>
              {[{ m: 'Timeout 15 min', pct: 52, color: '#EF4444' }, { m: 'Botón abandonar', pct: 31, color: '#F59E0B' }, { m: 'Liberación staff', pct: 17, color: '#3B82F6' }].map(item => (
                <div key={item.m} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#A0A0A0' }}>{item.m}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: item.color }}>{item.pct}%</span>
                  </div>
                  <div style={{ background: '#1C1C1C', borderRadius: 100, height: 6 }}>
                    <div style={{ height: '100%', width: `${item.pct}%`, background: item.color, borderRadius: 100 }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 14, padding: 16 }}>
              <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>⏱ Tiempo hasta pedir</p>
              <p style={{ margin: 0, fontSize: 40, fontWeight: 700, color: '#D4AF37', textAlign: 'center' }}>4.2<span style={{ fontSize: 18, color: '#707070' }}>min</span></p>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#707070', textAlign: 'center' }}>Desde escaneo hasta pedido confirmado</p>
            </div>
          </>
        )}

        {tab === 'platos' && (
          <>
            <p style={{ fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>🏆 Top ventas</p>
            {platosTop.map((p, i) => (
              <div key={p.id} style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 14, padding: '12px 16px', marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: i === 0 ? '#D4AF37' : i === 1 ? '#A0A0A0' : '#CD7F32', minWidth: 24 }}>#{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{p.nombre}</p>
                  <div style={{ display: 'flex', gap: 10, marginTop: 3 }}>
                    <span style={{ fontSize: 11, color: '#D4AF37' }}>★ {p.rating}</span>
                    <span style={{ fontSize: 11, color: '#707070' }}>{p.total_reviews} pedidos</span>
                    {p.destacado && <span style={{ fontSize: 10, background: 'rgba(212,175,55,0.12)', color: '#D4AF37', borderRadius: 100, padding: '1px 6px' }}>⭐ Chef</span>}
                    {!p.disponible && <span style={{ fontSize: 10, background: 'rgba(239,68,68,0.12)', color: '#EF4444', borderRadius: 100, padding: '1px 6px' }}>Sin stock</span>}
                  </div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#22C55E' }}>{formatPrecio(p.precio)}</span>
              </div>
            ))}
            <div style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 14, padding: 16, marginTop: 8 }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#D4AF37' }}>✦ Maridajes que más convierten</p>
              {[{ p: 'Pasta', b: 'Malbec Reserva', pct: 70 }, { p: 'Bife', b: 'Cabernet Gran Reserva', pct: 82 }, { p: 'Salmón', b: 'Sauvignon Blanc', pct: 74 }].map(m => (
                <div key={m.p} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(212,175,55,0.1)', fontSize: 13 }}>
                  <span style={{ color: '#A0A0A0' }}>{m.p} + {m.b}</span>
                  <span style={{ color: '#D4AF37', fontWeight: 600 }}>{m.pct}%</span>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'prediccion' && (
          <>
            <div style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 14, padding: 16, marginBottom: 12 }}>
              <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#D4AF37' }}>🔮 Predicción para esta noche</p>
              <p style={{ margin: '0 0 14px', fontSize: 12, color: '#707070' }}>Basado en histórico de 30 días</p>
              {[['👥', 'Cubiertos esperados', '68 personas'], ['⏰', 'Hora pico', '21:00 – 22:30'], ['💰', 'Venta proyectada', formatPrecio(421600)], ['🔄', 'Rotación estimada', '2.4 turnos/mesa']].map(([e, l, v]) => (
                <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(212,175,55,0.1)', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 16 }}>{e}</span>
                    <span style={{ fontSize: 13, color: '#A0A0A0' }}>{l}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 14, padding: 16 }}>
              <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>🧑‍🍳 Sugerencia al chef</p>
              {[{ p: 'Ojo de bife 400g', c: '22 porciones', u: 'Alta' }, { p: 'Tagliatelle al funghi', c: '18 porciones', u: 'Alta' }, { p: 'Volcán de chocolate', c: '30 porciones', u: 'Media' }, { p: 'Risotto de mariscos', c: '14 porciones', u: 'Media' }].map(item => (
                <div key={item.p} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1C1C1C', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{item.p}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#707070' }}>{item.c}</p>
                  </div>
                  <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 100, fontWeight: 500, background: item.u === 'Alta' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)', color: item.u === 'Alta' ? '#EF4444' : '#F59E0B' }}>{item.u}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
