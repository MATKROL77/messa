'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ArrowUpRight, Bell, Boxes, CalendarDays, ChartLine, ChefHat, CircleDollarSign, ClipboardList, CreditCard, Crown, Gauge, MapPinned, PackageSearch, ReceiptText, Sparkles, Store, UsersRound, UtensilsCrossed, WalletCards } from 'lucide-react'
import { useStore } from '@/lib/store'
import { formatPrecio, limpiarIconoLegacy } from '@/lib/utils'

type QuickModule = { href: string; title: string; description: string; Icon: LucideIcon; tone: 'gold' | 'green' | 'blue' | 'amber' | 'ink' }

const ESTADO_MESA: Record<string, string> = { libre: 'Libre', ocupada: 'Ocupada', pedido: 'Con pedido', pagando: 'Pagando', pagada: 'Pagada' }

function MetricCard({ label, value, detail, Icon, tone }: { label: string; value: string; detail: string; Icon: LucideIcon; tone: string }) {
  return <article className="admin-metric-card"><span className={`admin-metric-card__icon admin-tone--${tone}`}><Icon size={19} /></span><p>{label}</p><strong>{value}</strong><small>{detail}</small></article>
}

export default function AdminPage() {
  const { pedidos, mesas, platos, insumos, config, notificaciones, reservas, sucursalActualId, sucursales, sesionAdmin } = useStore()
  const nombreSucursal = sucursales.find(sucursal => sucursal.id === sucursalActualId)?.nombre || 'Sucursal principal'
  const hoy = new Date().toISOString().split('T')[0]
  const pedidosHoy = pedidos.filter(pedido => pedido.created_at.startsWith(hoy) && pedido.sucursal_id === sucursalActualId)
  const pagadosHoy = pedidosHoy.filter(pedido => pedido.estado === 'pagado')
  const pedidosActivos = pedidosHoy.filter(pedido => ['pendiente', 'en_cocina', 'listo'].includes(pedido.estado))
  const totalVentas = pagadosHoy.reduce((acumulado, pedido) => acumulado + pedido.total + pedido.propina, 0)
  const ticketPromedio = pagadosHoy.length > 0 ? totalVentas / pagadosHoy.length : 0
  const mesasSucursal = mesas.filter(mesa => mesa.sucursal_id === sucursalActualId)
  const mesasOcupadas = mesasSucursal.filter(mesa => mesa.estado !== 'libre').length
  const ocupacion = mesasSucursal.length > 0 ? Math.round((mesasOcupadas / mesasSucursal.length) * 100) : 0
  const stockCritico = insumos.filter(insumo => insumo.sucursal_id === sucursalActualId && insumo.cantidad <= insumo.cantidad_critica)
  const reservasHoy = reservas.filter(reserva => reserva.fecha === hoy && (!reserva.sucursal_id || reserva.sucursal_id === sucursalActualId) && ['pendiente', 'confirmada'].includes(reserva.estado))
  const topPlatos = [...platos].filter(plato => plato.total_reviews > 0).sort((a, b) => b.total_reviews - a.total_reviews).slice(0, 3)
  const notificacionesRecientes = notificaciones.slice(0, 4)
  const estadosPedido = [
    { label: 'Pendientes', value: pedidosHoy.filter(pedido => pedido.estado === 'pendiente').length, tone: 'amber' },
    { label: 'En cocina', value: pedidosHoy.filter(pedido => pedido.estado === 'en_cocina').length, tone: 'gold' },
    { label: 'Listos', value: pedidosHoy.filter(pedido => pedido.estado === 'listo').length, tone: 'green' },
    { label: 'Entregados', value: pedidosHoy.filter(pedido => ['entregado', 'pagado'].includes(pedido.estado)).length, tone: 'blue' },
  ]
  const maxEstado = Math.max(1, ...estadosPedido.map(estado => estado.value))
  if (sesionAdmin?.rol === 'staff') {
    return <div className="admin-dashboard admin-staff-dashboard">
      <header className="admin-dashboard__header"><div><p className="admin-kicker"><span className="admin-live-dot" />Vista de staff</p><h1>Operación de {nombreSucursal}</h1><p>Accesos diarios para atender el salón, pedidos y reservas.</p></div></header>
      <section className="admin-metrics-grid" aria-label="Resumen de turno"><MetricCard label="Mesas activas" value={`${mesasOcupadas}`} detail={`de ${mesasSucursal.length} mesas`} Icon={MapPinned} tone="blue" /><MetricCard label="Pedidos activos" value={`${pedidosActivos.length}`} detail="En preparación o listos" Icon={ChefHat} tone="gold" /><MetricCard label="Reservas de hoy" value={`${reservasHoy.length}`} detail="Pendientes o confirmadas" Icon={CalendarDays} tone="green" /><MetricCard label="Stock crítico" value={`${stockCritico.length}`} detail="Para avisar al responsable" Icon={Boxes} tone={stockCritico.length ? 'amber' : 'green'} /></section>
      <section className="admin-workspace-grid"><article className="admin-panel admin-panel--salon"><div className="admin-panel__heading"><div><p className="admin-kicker">Salón</p><h2>Mesas del turno</h2></div><Link href="/dashboard">Abrir salón <ArrowUpRight size={15} /></Link></div><div className="admin-table-map">{mesasSucursal.map(mesa => <Link href={`/mesa/${mesa.id}?staff=true`} className={`admin-table-chip admin-table-chip--${mesa.estado}`} key={mesa.id}><span>M{mesa.numero}</span><small>{ESTADO_MESA[mesa.estado]}</small></Link>)}</div></article><article className="admin-panel admin-panel--kitchen"><div className="admin-panel__heading"><div><p className="admin-kicker">Pedidos</p><h2>Seguimiento de cocina</h2></div><Link href="/cocina">Ver pedidos <ArrowUpRight size={15} /></Link></div><div className="admin-order-list">{pedidosActivos.length ? pedidosActivos.slice(0, 4).map(pedido => <Link href="/cocina" key={pedido.id} className="admin-order-row"><span className={`admin-status-dot admin-status-dot--${pedido.estado}`} /><div><b>Mesa {pedido.mesa_numero}</b><small>{pedido.items.length} ítems · {pedido.estado.replace('_', ' ')}</small></div><span>{formatPrecio(pedido.total)}</span></Link>) : <p className="admin-empty">No hay pedidos pendientes.</p>}</div></article><article className="admin-panel admin-panel--reservations"><div className="admin-panel__heading"><div><p className="admin-kicker">Agenda</p><h2>Reservas</h2></div><Link href="/reservas">Abrir agenda <ArrowUpRight size={15} /></Link></div><div className="admin-reservation-list">{reservasHoy.length ? reservasHoy.map(reserva => <div key={reserva.id}><strong>{reserva.hora}</strong><span>{reserva.nombre}</span><small>{reserva.personas} personas</small></div>) : <p className="admin-empty">No hay reservas próximas.</p>}</div></article></section>
    </div>
  }
  const modulos: QuickModule[] = [
    { href: '/admin/carta', title: 'Gestión de carta', description: `${platos.length} platos en la carta`, Icon: UtensilsCrossed, tone: 'gold' },
    { href: '/admin/stock', title: 'Inventario', description: stockCritico.length ? `${stockCritico.length} alertas de stock` : 'Stock bajo control', Icon: Boxes, tone: stockCritico.length ? 'amber' : 'green' },
    { href: '/dashboard', title: 'Control del salón', description: `${mesasOcupadas}/${mesasSucursal.length} mesas activas`, Icon: MapPinned, tone: 'blue' },
    { href: '/cocina', title: 'Ver pedidos', description: `${pedidosActivos.length} pedidos activos`, Icon: ChefHat, tone: 'amber' },
    { href: '/reservas', title: 'Reservas', description: `${reservasHoy.length} reservas para hoy`, Icon: CalendarDays, tone: 'blue' },
    { href: '/admin/cierre', title: 'Cierre de caja', description: config.caja_abierta ? 'Caja abierta' : 'Caja cerrada', Icon: ReceiptText, tone: config.caja_abierta ? 'green' : 'ink' },
    { href: '/admin/pagos', title: 'Pagos y propinas', description: 'Cobros, POS y medios de pago', Icon: CreditCard, tone: 'green' },
    { href: '/admin/finanzas', title: 'Finanzas', description: 'Margen, costos y gastos', Icon: ChartLine, tone: 'gold' },
    { href: '/admin/integraciones', title: 'Canales de delivery', description: 'Integraciones y pedidos externos', Icon: PackageSearch, tone: 'blue' },
    { href: '/admin/fidelidad', title: 'Fidelidad', description: 'Puntos y recompensas', Icon: Crown, tone: 'gold' },
    { href: '/admin/sucursales', title: 'Sucursales', description: `${sucursales.length} locales configurados`, Icon: Store, tone: 'ink' },
    { href: '/admin/usuarios', title: 'Equipo y accesos', description: 'Roles y permisos', Icon: UsersRound, tone: 'blue' },
    { href: '/admin/tema', title: 'Identidad de marca', description: 'Colores y tipografía', Icon: Sparkles, tone: 'gold' },
  ]

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard__header">
        <div><p className="admin-kicker"><span className="admin-live-dot" />Operación en vivo</p><h1>Hola, {nombreSucursal}.</h1><p>Un resumen claro para decidir el ritmo del servicio.</p></div>
        <div className="admin-dashboard__header-actions"><span className="admin-date">{new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</span><Link href="/admin/carta" className="admin-primary-link"><UtensilsCrossed size={17} />Editar carta</Link></div>
      </header>

      <section className="admin-metrics-grid" aria-label="Indicadores de hoy">
        <MetricCard label="Ventas cobradas" value={formatPrecio(totalVentas)} detail={`${pagadosHoy.length} pedidos pagados`} Icon={CircleDollarSign} tone="green" />
        <MetricCard label="Ticket promedio" value={formatPrecio(ticketPromedio)} detail={pagadosHoy.length ? 'Sobre pedidos cobrados' : 'Aún sin cobros'} Icon={WalletCards} tone="gold" />
        <MetricCard label="Ocupación" value={`${ocupacion}%`} detail={`${mesasOcupadas} de ${mesasSucursal.length} mesas`} Icon={Gauge} tone="blue" />
        <MetricCard label="Stock crítico" value={`${stockCritico.length}`} detail={stockCritico.length ? 'Requiere atención' : 'Sin alertas'} Icon={Boxes} tone={stockCritico.length ? 'amber' : 'green'} />
      </section>

      <section className="admin-workspace-grid">
        <article className="admin-panel admin-panel--salon">
          <div className="admin-panel__heading"><div><p className="admin-kicker">Salón</p><h2>Estado de mesas</h2></div><Link href="/dashboard">Abrir plano <ArrowUpRight size={15} /></Link></div>
          <div className="admin-table-map">{mesasSucursal.length ? mesasSucursal.map(mesa => <Link href={`/mesa/${mesa.id}?staff=true`} className={`admin-table-chip admin-table-chip--${mesa.estado}`} key={mesa.id}><span>M{mesa.numero}</span><small>{ESTADO_MESA[mesa.estado]}</small></Link>) : <p className="admin-empty">No hay mesas configuradas en esta sucursal.</p>}</div>
        </article>

        <article className="admin-panel admin-panel--kitchen">
          <div className="admin-panel__heading"><div><p className="admin-kicker">Cocina</p><h2>Pedidos activos</h2></div><Link href="/cocina">Ver pedidos <ArrowUpRight size={15} /></Link></div>
          <div className="admin-order-list">{pedidosActivos.length ? pedidosActivos.slice(0, 4).map(pedido => <Link href="/cocina" key={pedido.id} className="admin-order-row"><span className={`admin-status-dot admin-status-dot--${pedido.estado}`} /><div><b>Mesa {pedido.mesa_numero}</b><small>{pedido.items.length} ítems · {pedido.estado.replace('_', ' ')}</small></div><span>{formatPrecio(pedido.total)}</span></Link>) : <p className="admin-empty">No hay pedidos en curso. La cocina está al día.</p>}</div>
        </article>

        <article className="admin-panel admin-panel--reservations">
          <div className="admin-panel__heading"><div><p className="admin-kicker">Agenda</p><h2>Reservas de hoy</h2></div><Link href="/reservas">Agenda <ArrowUpRight size={15} /></Link></div>
          <div className="admin-reservation-list">{reservasHoy.length ? reservasHoy.slice(0, 4).map(reserva => <div key={reserva.id}><strong>{reserva.hora}</strong><span>{reserva.nombre}</span><small>{reserva.personas} personas</small></div>) : <p className="admin-empty">No hay reservas próximas para hoy.</p>}</div>
        </article>

        <article className="admin-panel admin-panel--activity">
          <div className="admin-panel__heading"><div><p className="admin-kicker">Ritmo del día</p><h2>Pedidos por estado</h2></div><ClipboardList size={18} /></div>
          <div className="admin-bars">{estadosPedido.map(estado => <div key={estado.label}><div><span>{estado.label}</span><strong>{estado.value}</strong></div><i><b className={`admin-tone-bg--${estado.tone}`} style={{ width: `${(estado.value / maxEstado) * 100}%` }} /></i></div>)}</div>
        </article>

        <article className="admin-panel admin-panel--top-products">
          <div className="admin-panel__heading"><div><p className="admin-kicker">Carta</p><h2>Más valorados</h2></div><Link href="/admin/carta">Gestionar <ArrowUpRight size={15} /></Link></div>
          <div className="admin-product-rank">{topPlatos.length ? topPlatos.map((plato, indice) => <div key={plato.id}><span>{indice + 1}</span><b>{plato.nombre}</b><small>{plato.rating.toFixed(1)} · {plato.total_reviews} reseñas</small></div>) : <p className="admin-empty">Todavía no hay reseñas registradas.</p>}</div>
        </article>

        <article className="admin-panel admin-panel--notifications">
          <div className="admin-panel__heading"><div><p className="admin-kicker">Actividad</p><h2>Últimas alertas</h2></div><Bell size={18} /></div>
          <div className="admin-notification-list">{notificacionesRecientes.length ? notificacionesRecientes.map(notificacion => <div key={notificacion.id}><span className={`admin-status-dot admin-status-dot--${notificacion.tipo}`} /><p>{limpiarIconoLegacy(notificacion.mensaje)}</p></div>) : <p className="admin-empty">No hay notificaciones pendientes.</p>}</div>
        </article>
      </section>

      <section className="admin-shortcuts"><div className="admin-shortcuts__heading"><div><p className="admin-kicker">Módulos</p><h2>Accesos rápidos</h2></div><span>Todo el sistema, ordenado por tareas.</span></div><div className="admin-shortcuts__grid">{modulos.map(({ href, title, description, Icon, tone }) => <Link href={href} key={href} className="admin-shortcut"><span className={`admin-shortcut__icon admin-tone--${tone}`}><Icon size={19} /></span><span><b>{title}</b><small>{description}</small></span><ArrowUpRight size={16} /></Link>)}</div></section>
    </div>
  )
}
