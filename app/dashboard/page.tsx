'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRightLeft,
  Banknote,
  BellRing,
  ChefHat,
  CircleCheckBig,
  Clock3,
  CreditCard,
  Grid3X3,
  LayoutDashboard,
  MapPinned,
  MessageSquareText,
  PackageSearch,
  ReceiptText,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react'
import AdminOperationShell from '@/components/admin-operation-shell'
import {
  AdminButton,
  AdminEmpty,
  AdminListAction,
  AdminMetric,
  AdminPanel,
  AdminSegmented,
  AdminSheet,
  AdminStatus,
  AdminToast,
  AdminWorkspace,
} from '@/components/admin/admin-ui'
import { useStore } from '@/lib/store'
import type { Mesa, MesaEstado, MetodoPago } from '@/types'
import { formatPrecio, tiempoEnMinutos, tiempoTranscurrido } from '@/lib/utils'

type SalonTab = 'mesas' | 'llamados'
type LayoutMode = 'grid' | 'plano'
type MesaFilter = MesaEstado | 'todas'

const ESTADOS: Record<MesaEstado, { label: string; tone: 'green' | 'rose' | 'amber' | 'gold' | 'blue' }> = {
  libre: { label: 'Libre', tone: 'green' },
  ocupada: { label: 'Ocupada', tone: 'rose' },
  pedido: { label: 'Con pedido', tone: 'amber' },
  pagando: { label: 'Pagando', tone: 'gold' },
  pagada: { label: 'Pagada', tone: 'blue' },
}

export default function DashboardPage() {
  const {
    mesas,
    pedidos,
    notificaciones,
    liberarMesa,
    ocuparMesaManual,
    insumos,
    llamadosMozo,
    atenderLlamado,
    marcarPagoManualStaff,
    confirmarTransferenciaStaff,
    transferirMesa,
    actualizarNotaMesa,
    sucursalActualId,
    sucursales,
    actualizarPosicionMesa,
  } = useStore()

  const [mesaSeleccionadaId, setMesaSeleccionadaId] = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<MesaFilter>('todas')
  const [tab, setTab] = useState<SalonTab>('mesas')
  const [vistaLayout, setVistaLayout] = useState<LayoutMode>('grid')
  const [transfiriendo, setTransfiriendo] = useState(false)
  const [editandoNota, setEditandoNota] = useState(false)
  const [notaTemp, setNotaTemp] = useState('')
  const [toast, setToast] = useState('')
  const [arrastrandoId, setArrastrandoId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [, forceTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => forceTick(value => value + 1), 30_000)
    return () => clearInterval(interval)
  }, [])

  const mesasSucursal = useMemo(
    () => mesas.filter(mesa => mesa.sucursal_id === sucursalActualId),
    [mesas, sucursalActualId],
  )
  const mesaSeleccionada = mesasSucursal.find(mesa => mesa.id === mesaSeleccionadaId) ?? null
  const nombreSucursal = sucursales.find(sucursal => sucursal.id === sucursalActualId)?.nombre ?? 'Sucursal'
  const criticos = insumos.filter(insumo => insumo.activo && insumo.sucursal_id === sucursalActualId && insumo.cantidad <= insumo.cantidad_critica)
  const llamadosPendientes = llamadosMozo.filter(llamado => !llamado.atendido)
  const pendientesTransferencia = pedidos.filter(
    pedido => pedido.metodo_pago === 'transferencia' && !pedido.confirmado_staff && pedido.sucursal_id === sucursalActualId,
  )
  const alertasRecientes = notificaciones
    .filter(notificacion => tiempoEnMinutos(notificacion.timestamp) < 60)
    .slice(0, 4)
  const mesasFiltradas = mesasSucursal.filter(mesa => filtroEstado === 'todas' || mesa.estado === filtroEstado)
  const mesasLibresParaTransferir = mesasSucursal.filter(mesa => mesa.estado === 'libre' && mesa.id !== mesaSeleccionadaId)
  const pedidosDeMesa = useCallback(
    (mesaId: string) => pedidos.filter(pedido => pedido.mesa_id === mesaId && pedido.estado !== 'cancelado'),
    [pedidos],
  )

  const stats = {
    libres: mesasSucursal.filter(mesa => mesa.estado === 'libre').length,
    ocupadas: mesasSucursal.filter(mesa => mesa.estado === 'ocupada').length,
    pedidos: mesasSucursal.filter(mesa => mesa.estado === 'pedido').length,
    pagadas: mesasSucursal.filter(mesa => mesa.estado === 'pagada').length,
  }

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2400)
  }

  const closeMesaSheet = () => {
    setMesaSeleccionadaId(null)
    setTransfiriendo(false)
    setEditandoNota(false)
  }

  const handleLiberar = (mesaId: string) => {
    liberarMesa(mesaId)
    closeMesaSheet()
    showToast('Mesa liberada')
  }

  const handleOcupar = (mesaId: string) => {
    ocuparMesaManual(mesaId)
    showToast('Mesa marcada como ocupada')
  }

  const handlePagoManual = (mesaId: string, metodo: MetodoPago) => {
    marcarPagoManualStaff(mesaId, metodo)
    closeMesaSheet()
    showToast('Pago confirmado')
  }

  const handleTransferir = (destinoId: string) => {
    if (!mesaSeleccionadaId) return
    const result = transferirMesa(mesaSeleccionadaId, destinoId)
    if (!result.ok) {
      showToast(result.error ?? 'No se pudo trasladar la mesa')
      return
    }
    setTransfiriendo(false)
    setMesaSeleccionadaId(destinoId)
    showToast('Mesa trasladada')
  }

  const handleGuardarNota = () => {
    if (mesaSeleccionadaId) actualizarNotaMesa(mesaSeleccionadaId, notaTemp)
    setEditandoNota(false)
    showToast('Nota guardada')
  }

  const posDesdeEvento = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 50, y: 50 }
    return {
      x: Math.min(96, Math.max(4, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.min(94, Math.max(7, ((clientY - rect.top) / rect.height) * 100)),
    }
  }, [])

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!arrastrandoId) return
    const { x, y } = posDesdeEvento(clientX, clientY)
    actualizarPosicionMesa(arrastrandoId, x, y)
  }, [arrastrandoId, posDesdeEvento, actualizarPosicionMesa])

  return (
    <AdminOperationShell>
      <AdminWorkspace
        eyebrow="Operación en vivo"
        title="Control de salón"
        description={`Mesas, llamados y cobros de ${nombreSucursal} en un único espacio de trabajo.`}
        className="messa-salon"
        actions={(
          <>
            <AdminButton
              tone={llamadosPendientes.length ? 'primary' : 'neutral'}
              icon={BellRing}
              onClick={() => setTab('llamados')}
            >
              {llamadosPendientes.length ? `${llamadosPendientes.length} llamados` : 'Sin llamados'}
            </AdminButton>
            <Link className="messa-button messa-button--neutral" href="/cocina"><ChefHat size={16} />Ver pedidos</Link>
          </>
        )}
      >
        <AdminToast>{toast}</AdminToast>

        <section className="messa-metrics" aria-label="Estado del salón">
          <AdminMetric label="Mesas libres" value={`${stats.libres}`} detail={`de ${mesasSucursal.length} mesas`} Icon={CircleCheckBig} tone="green" progress={(stats.libres / Math.max(1, mesasSucursal.length)) * 100} />
          <AdminMetric label="Ocupadas" value={`${stats.ocupadas}`} detail="Servicio activo" Icon={UsersRound} tone="rose" progress={(stats.ocupadas / Math.max(1, mesasSucursal.length)) * 100} />
          <AdminMetric label="Con pedido" value={`${stats.pedidos}`} detail="Órdenes en curso" Icon={ChefHat} tone="amber" progress={(stats.pedidos / Math.max(1, mesasSucursal.length)) * 100} />
          <AdminMetric label="Stock crítico" value={`${criticos.length}`} detail={criticos.length ? 'Requiere atención' : 'Sin alertas'} Icon={PackageSearch} tone={criticos.length ? 'amber' : 'green'} progress={Math.min(100, criticos.length * 20)} />
        </section>

        <AdminPanel className="messa-salon__control">
          <div className="messa-salon__control-row">
            <AdminSegmented<SalonTab>
              value={tab}
              onChange={setTab}
              label="Vista del salón"
              items={[
                { value: 'mesas', label: 'Mesas', count: mesasSucursal.length },
                { value: 'llamados', label: 'Llamados', count: llamadosPendientes.length },
              ]}
            />
            {tab === 'mesas' && (
              <AdminButton
                tone="neutral"
                icon={vistaLayout === 'grid' ? MapPinned : Grid3X3}
                onClick={() => setVistaLayout(value => value === 'grid' ? 'plano' : 'grid')}
              >
                {vistaLayout === 'grid' ? 'Ver plano' : 'Ver grilla'}
              </AdminButton>
            )}
          </div>

          {tab === 'mesas' ? (
            <>
              <div className="messa-salon__filters">
                <AdminSegmented<MesaFilter>
                  value={filtroEstado}
                  onChange={setFiltroEstado}
                  label="Filtrar mesas por estado"
                  items={[
                    { value: 'todas', label: 'Todas', count: mesasSucursal.length },
                    { value: 'libre', label: 'Libres', count: stats.libres },
                    { value: 'ocupada', label: 'Ocupadas', count: stats.ocupadas },
                    { value: 'pedido', label: 'Con pedido', count: stats.pedidos },
                    { value: 'pagada', label: 'Pagadas', count: stats.pagadas },
                  ]}
                />
              </div>

              {pendientesTransferencia.length > 0 && (
                <section className="messa-salon__transfer-alert" aria-label="Transferencias pendientes">
                  <header>
                    <CreditCard size={18} />
                    <div><b>Transferencias por verificar</b><span>Confirmá el ingreso antes de cerrar la mesa.</span></div>
                  </header>
                  <div>
                    {pendientesTransferencia.map(pedido => (
                      <div key={pedido.id}>
                        <span>Mesa {pedido.mesa_numero} · {formatPrecio(pedido.total + pedido.propina)}</span>
                        <AdminButton tone="primary" icon={CircleCheckBig} onClick={() => { confirmarTransferenciaStaff(pedido.id); showToast('Transferencia verificada') }}>Verificar</AdminButton>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {vistaLayout === 'grid' ? (
                <div className="messa-salon-grid">
                  {mesasFiltradas.map(mesa => (
                    <MesaCard
                      key={mesa.id}
                      mesa={mesa}
                      orderCount={pedidosDeMesa(mesa.id).length}
                      onClick={() => setMesaSeleccionadaId(mesa.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="messa-floor">
                  <div
                    className="messa-floor__canvas"
                    ref={canvasRef}
                    onMouseMove={event => handleMove(event.clientX, event.clientY)}
                    onMouseUp={() => setArrastrandoId(null)}
                    onMouseLeave={() => setArrastrandoId(null)}
                    onTouchMove={event => {
                      if (!arrastrandoId) return
                      event.preventDefault()
                      const touch = event.touches[0]
                      handleMove(touch.clientX, touch.clientY)
                    }}
                    onTouchEnd={() => setArrastrandoId(null)}
                  >
                    <span className="messa-floor__entry">Entrada</span>
                    {mesasSucursal.map(mesa => (
                      <button
                        key={mesa.id}
                        type="button"
                        className={`messa-floor__table is-${mesa.estado} is-${mesa.forma}${arrastrandoId === mesa.id ? ' is-dragging' : ''}`}
                        style={{ left: `${mesa.pos_x}%`, top: `${mesa.pos_y}%` }}
                        onMouseDown={() => setArrastrandoId(mesa.id)}
                        onTouchStart={() => setArrastrandoId(mesa.id)}
                        onClick={() => { if (!arrastrandoId) setMesaSeleccionadaId(mesa.id) }}
                        aria-label={`Mesa ${mesa.numero}, ${ESTADOS[mesa.estado].label}`}
                      >
                        M{mesa.numero}
                      </button>
                    ))}
                  </div>
                  <p className="messa-floor__help"><LayoutDashboard size={14} />Arrastrá cada mesa para reflejar la disposición real del salón.</p>
                </div>
              )}

              {alertasRecientes.length > 0 && (
                <section className="messa-salon__alerts">
                  <p className="messa-kicker">Actividad reciente</p>
                  <div>
                    {alertasRecientes.map(alerta => (
                      <AdminListAction
                        key={alerta.id}
                        title={alerta.mensaje}
                        detail={tiempoTranscurrido(alerta.timestamp)}
                        leading={<BellRing size={17} />}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <section className="messa-waiter-calls" aria-live="polite">
              {llamadosMozo.length === 0 ? (
                <AdminEmpty Icon={BellRing} title="El salón está tranquilo" description="Los llamados de los comensales van a aparecer acá en tiempo real." />
              ) : llamadosMozo.map(llamado => (
                <article key={llamado.id} className={`messa-waiter-call${llamado.atendido ? ' is-attended' : ''}`}>
                  <span className="messa-waiter-call__icon"><BellRing size={20} /></span>
                  <div>
                    <header>
                      <div>
                        <p className="messa-kicker">Mesa {llamado.mesa_numero}</p>
                        <h3>{llamado.motivo}</h3>
                      </div>
                      <AdminStatus tone={llamado.atendido ? 'green' : 'amber'}>{llamado.atendido ? 'Atendido' : 'Pendiente'}</AdminStatus>
                    </header>
                    <p>{llamado.atendido ? 'El equipo ya confirmó este llamado.' : 'El comensal está esperando asistencia del equipo.'}</p>
                    <footer>
                      <span><Clock3 size={14} />{tiempoTranscurrido(llamado.created_at)}</span>
                      {!llamado.atendido && (
                        <>
                          <AdminButton tone="neutral" icon={UserRoundCheck} onClick={() => { atenderLlamado(llamado.id); showToast('Llamado marcado como atendido') }}>Marcar atendido</AdminButton>
                          <Link className="messa-button messa-button--primary" href={`/mesa/${llamado.mesa_id}?staff=true`} onClick={() => atenderLlamado(llamado.id)}>
                            <ReceiptText size={16} />Abrir mesa
                          </Link>
                        </>
                      )}
                    </footer>
                  </div>
                </article>
              ))}
            </section>
          )}
        </AdminPanel>

        <AdminSheet
          open={Boolean(mesaSeleccionada)}
          onClose={closeMesaSheet}
          title={mesaSeleccionada ? `Mesa ${mesaSeleccionada.numero}` : 'Mesa'}
          eyebrow="Gestión de mesa"
          footer={mesaSeleccionada && (
            <>
              <AdminButton tone="quiet" onClick={closeMesaSheet}>Cerrar</AdminButton>
              <Link className="messa-button messa-button--primary" href={`/mesa/${mesaSeleccionada.id}?staff=true`}>
                <ReceiptText size={16} />Tomar pedido
              </Link>
            </>
          )}
        >
          {mesaSeleccionada && (
            <div className="messa-table-sheet">
              <section className="messa-table-sheet__summary">
                <div>
                  <span>Estado</span>
                  <AdminStatus tone={ESTADOS[mesaSeleccionada.estado].tone}>{ESTADOS[mesaSeleccionada.estado].label}</AdminStatus>
                </div>
                <div><span>Comensales</span><b>{mesaSeleccionada.dispositivos.length} / {mesaSeleccionada.capacidad}</b></div>
                <div><span>Pedidos</span><b>{pedidosDeMesa(mesaSeleccionada.id).length}</b></div>
              </section>

              <section className="messa-table-sheet__section">
                <header><MessageSquareText size={17} /><div><b>Nota del equipo</b><span>Información visible para quienes atienden la mesa.</span></div></header>
                {editandoNota ? (
                  <div className="messa-table-note">
                    <textarea value={notaTemp} onChange={event => setNotaTemp(event.target.value)} rows={3} placeholder="Alergias, preferencias o contexto de servicio…" autoFocus />
                    <div><AdminButton tone="quiet" onClick={() => setEditandoNota(false)}>Cancelar</AdminButton><AdminButton tone="primary" onClick={handleGuardarNota}>Guardar nota</AdminButton></div>
                  </div>
                ) : (
                  <button type="button" className="messa-table-note__preview" onClick={() => { setNotaTemp(mesaSeleccionada.nota_staff ?? ''); setEditandoNota(true) }}>
                    {mesaSeleccionada.nota_staff || 'Agregar una nota para el equipo'}
                  </button>
                )}
              </section>

              {pedidosDeMesa(mesaSeleccionada.id).length > 0 && (
                <section className="messa-table-sheet__section">
                  <header><ChefHat size={17} /><div><b>Pedidos de la mesa</b><span>Resumen del consumo activo.</span></div></header>
                  <div className="messa-table-orders">
                    {pedidosDeMesa(mesaSeleccionada.id).map(pedido => (
                      <article key={pedido.id}>
                        <header><b>Pedido #{pedido.id.slice(-4).toUpperCase()}</b><AdminStatus tone={pedido.estado === 'pagado' ? 'green' : 'amber'}>{pedido.estado.replace('_', ' ')}</AdminStatus></header>
                        {pedido.items.slice(0, 4).map(item => <p key={item.id}>{item.cantidad} × {item.plato.nombre}</p>)}
                      </article>
                    ))}
                  </div>
                </section>
              )}

              <section className="messa-table-sheet__section">
                <header><Grid3X3 size={17} /><div><b>Control de mesa</b><span>Acciones operativas y reversibles.</span></div></header>
                <div className="messa-table-actions">
                  <AdminButton tone="neutral" icon={UsersRound} disabled={mesaSeleccionada.estado === 'ocupada'} onClick={() => handleOcupar(mesaSeleccionada.id)}>Marcar ocupada</AdminButton>
                  <AdminButton tone="neutral" icon={CircleCheckBig} disabled={mesaSeleccionada.estado === 'libre'} onClick={() => handleLiberar(mesaSeleccionada.id)}>Liberar mesa</AdminButton>
                  {mesaSeleccionada.estado !== 'libre' && <AdminButton tone="neutral" icon={ArrowRightLeft} onClick={() => setTransfiriendo(value => !value)}>Trasladar mesa</AdminButton>}
                </div>
                {transfiriendo && (
                  <div className="messa-table-transfer">
                    <p>Elegí una mesa libre como destino.</p>
                    <div>
                      {mesasLibresParaTransferir.length
                        ? mesasLibresParaTransferir.map(mesa => <button type="button" key={mesa.id} onClick={() => handleTransferir(mesa.id)}>M{mesa.numero}</button>)
                        : <span>No hay mesas libres disponibles.</span>}
                    </div>
                  </div>
                )}
              </section>

              {mesaSeleccionada.estado !== 'libre' && mesaSeleccionada.estado !== 'pagada' && pedidosDeMesa(mesaSeleccionada.id).length > 0 && (
                <section className="messa-table-sheet__section">
                  <header><CreditCard size={17} /><div><b>Confirmar pago</b><span>Registrá el medio cobrado por el equipo.</span></div></header>
                  <div className="messa-table-actions">
                    <AdminButton tone="primary" icon={Banknote} onClick={() => handlePagoManual(mesaSeleccionada.id, 'efectivo')}>Efectivo</AdminButton>
                    <AdminButton tone="primary" icon={CreditCard} onClick={() => handlePagoManual(mesaSeleccionada.id, 'tarjeta')}>Tarjeta</AdminButton>
                  </div>
                </section>
              )}
            </div>
          )}
        </AdminSheet>
      </AdminWorkspace>
    </AdminOperationShell>
  )
}

function MesaCard({ mesa, orderCount, onClick }: {
  mesa: Mesa
  orderCount: number
  onClick: () => void
}) {
  const elapsed = mesa.dispositivos.length > 0 ? tiempoEnMinutos(mesa.updated_at) : 0
  const elapsedLabel = mesa.dispositivos.length === 0
    ? 'Sin sesión'
    : elapsed > 720
      ? 'Turno anterior'
      : elapsed > 0 ? `${elapsed} min` : 'Ahora'
  const config = ESTADOS[mesa.estado]

  return (
    <button type="button" className={`messa-table-card is-${mesa.estado}`} onClick={onClick}>
      <span className="messa-table-card__dot" aria-hidden="true" />
      <header>
        <span>M{mesa.numero}</span>
        <AdminStatus tone={config.tone}>{config.label}</AdminStatus>
      </header>
      <div className="messa-table-card__meta">
        <span><UsersRound size={14} />{mesa.dispositivos.length || '—'} comensales</span>
        <span><ChefHat size={14} />{orderCount || '—'} pedidos</span>
        <span><Clock3 size={14} />{elapsedLabel}</span>
      </div>
      {mesa.nota_staff && <span className="messa-table-card__note"><MessageSquareText size={14} />Nota del equipo</span>}
    </button>
  )
}
