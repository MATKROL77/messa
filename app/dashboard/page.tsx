'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRightLeft,
  Banknote,
  BellRing,
  CalendarClock,
  Check,
  ChefHat,
  CircleCheckBig,
  Clock3,
  CreditCard,
  Download,
  LayoutGrid,
  MessageSquareText,
  Minus,
  Nfc,
  PencilRuler,
  Plus,
  QrCode as QrCodeIcon,
  ReceiptText,
  Trash2,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react'
import AdminOperationShell from '@/components/admin-operation-shell'
import {
  AdminButton,
  AdminEmpty,
  AdminPanel,
  AdminSegmented,
  AdminSheet,
  AdminStatus,
  AdminToast,
  AdminWorkspace,
} from '@/components/admin/admin-ui'
import PlanoSalon, { ESTADOS_MESA, ETIQUETAS_SUGERIDAS, nombreDeMesa, TIPOS_ELEMENTO } from '@/components/admin/plano-salon'
import { useStore } from '@/lib/store'
import type { Mesa, MesaEstado, MetodoPago } from '@/types'
import { formatPrecio, tiempoEnMinutos, tiempoTranscurrido } from '@/lib/utils'
import { formatearCodigo, normalizarTagRfid } from '@/lib/mesa-codigo'
import { useCodigosQr } from '@/lib/use-codigos-qr'

type VistaSalon = 'plano' | 'lista'
type MesaFilter = MesaEstado | 'todas'
type Seleccion = { tipo: 'mesa' | 'elemento'; id: string } | null

const hoyISO = () => new Date().toISOString().slice(0, 10)

export default function SalonPage() {
  const {
    mesas,
    pedidos,
    reservas,
    liberarMesa,
    ocuparMesaManual,
    llamadosMozo,
    atenderLlamado,
    marcarPagoManualStaff,
    confirmarTransferenciaStaff,
    transferirMesa,
    actualizarNotaMesa,
    sucursalActualId,
    sucursales,
    sesionAdmin,
    actualizarPosicionMesa,
    actualizarMesaLayout,
    actualizarComensalesMesa,
    crearMesaLayout,
    eliminarMesaLayout,
    elementosPlano,
    crearElementoPlano,
    actualizarElementoPlano,
    eliminarElementoPlano,
    asignarMesaAReserva,
    asignarRfidMesa,
    regenerarCodigoMesa,
    initStore,
  } = useStore()

  const [mesaSeleccionadaId, setMesaSeleccionadaId] = useState<string | null>(null)
  const [vista, setVista] = useState<VistaSalon>('plano')
  const [filtroEstado, setFiltroEstado] = useState<MesaFilter>('todas')
  const [editando, setEditando] = useState(false)
  const [seleccion, setSeleccion] = useState<Seleccion>(null)
  const [qrAbierto, setQrAbierto] = useState(false)
  const [llamadosAbiertos, setLlamadosAbiertos] = useState(false)
  const [transfiriendo, setTransfiriendo] = useState(false)
  const [editandoNota, setEditandoNota] = useState(false)
  const [notaTemp, setNotaTemp] = useState('')
  const [nombreTemp, setNombreTemp] = useState('')
  const [rfidTemp, setRfidTemp] = useState('')
  const [toast, setToast] = useState('')
  const [, forceTick] = useState(0)

  useEffect(() => { initStore() }, [initStore])
  useEffect(() => {
    const interval = setInterval(() => forceTick(value => value + 1), 30_000)
    return () => clearInterval(interval)
  }, [])

  const mesasSucursal = useMemo(
    () => mesas.filter(mesa => mesa.sucursal_id === sucursalActualId).sort((a, b) => a.numero - b.numero),
    [mesas, sucursalActualId],
  )
  const elementosSucursal = useMemo(
    () => elementosPlano.filter(elemento => elemento.sucursal_id === sucursalActualId),
    [elementosPlano, sucursalActualId],
  )
  const { qrPorMesa, error: errorQr } = useCodigosQr(mesasSucursal)

  const mesa = mesasSucursal.find(item => item.id === mesaSeleccionadaId) ?? null
  const nombreSucursal = sucursales.find(item => item.id === sucursalActualId)?.nombre ?? 'Sucursal'
  const llamadosPendientes = llamadosMozo.filter(llamado => !llamado.atendido)
  const pendientesTransferencia = pedidos.filter(
    pedido => pedido.metodo_pago === 'transferencia' && !pedido.confirmado_staff && pedido.sucursal_id === sucursalActualId,
  )

  // Sólo los rangos de gestión reconfiguran el salón. El equipo de sala opera
  // sobre el plano pero no puede moverlo ni renombrar mesas por accidente.
  const rol = sesionAdmin?.rol
  const puedeGestionar = rol === 'creator' || rol === 'admin' || rol === 'gerente'

  const pedidosDeMesa = useCallback(
    (mesaId: string) => pedidos.filter(pedido => pedido.mesa_id === mesaId && pedido.estado !== 'cancelado'),
    [pedidos],
  )
  const comensalesDeMesa = useCallback(
    (item: Mesa) => item.comensales ?? item.dispositivos.length,
    [],
  )
  const reservasDeMesa = useCallback(
    (mesaId: string) => reservas.filter(r => r.mesa_id === mesaId && r.fecha === hoyISO() && r.estado !== 'cancelada'),
    [reservas],
  )
  const reservasSinMesa = reservas.filter(r => !r.mesa_id && r.fecha === hoyISO() && r.estado !== 'cancelada')

  const stats = {
    libres: mesasSucursal.filter(item => item.estado === 'libre').length,
    ocupadas: mesasSucursal.filter(item => item.estado === 'ocupada').length,
    pedidos: mesasSucursal.filter(item => item.estado === 'pedido').length,
    cobrando: mesasSucursal.filter(item => item.estado === 'pagando' || item.estado === 'pagada').length,
  }
  const mesasFiltradas = mesasSucursal.filter(item => filtroEstado === 'todas' || item.estado === filtroEstado)
  const mesasLibresParaTransferir = mesasSucursal.filter(item => item.estado === 'libre' && item.id !== mesaSeleccionadaId)

  const showToast = (mensaje: string) => {
    setToast(mensaje)
    window.setTimeout(() => setToast(''), 2400)
  }

  const cerrarSheet = () => {
    setMesaSeleccionadaId(null)
    setTransfiriendo(false)
    setEditandoNota(false)
  }

  const abrirMesa = (mesaId: string) => {
    const objetivo = mesasSucursal.find(item => item.id === mesaId)
    setMesaSeleccionadaId(mesaId)
    setNombreTemp(objetivo?.nombre ?? '')
    setRfidTemp(objetivo?.rfid_tag ?? '')
  }

  const borrarSeleccion = () => {
    if (!seleccion) return
    if (seleccion.tipo === 'elemento') {
      eliminarElementoPlano(seleccion.id)
      setSeleccion(null)
      showToast('Elemento eliminado')
      return
    }
    const resultado = eliminarMesaLayout(seleccion.id)
    showToast(resultado.ok ? 'Mesa eliminada' : resultado.error || 'No se pudo eliminar')
    if (resultado.ok) setSeleccion(null)
  }

  const descargarQr = (item: Mesa) => {
    const dataUrl = qrPorMesa[item.id]
    if (!dataUrl) return
    const enlace = document.createElement('a')
    enlace.href = dataUrl
    enlace.download = `messa-qr-${nombreDeMesa(item).replace(/\s+/g, '-').toLowerCase()}.png`
    enlace.click()
    showToast(`QR de ${nombreDeMesa(item)} descargado`)
  }

  return (
    <AdminOperationShell>
      <AdminWorkspace
        eyebrow="Operación en vivo"
        title="Salón"
        description={`${nombreSucursal} · ${mesasSucursal.length} mesas · ${stats.libres} libres`}
        className="messa-salon"
        actions={(
          <>
            <AdminButton
              tone={llamadosPendientes.length ? 'primary' : 'neutral'}
              icon={BellRing}
              onClick={() => setLlamadosAbiertos(true)}
            >
              {llamadosPendientes.length ? `${llamadosPendientes.length} llamados` : 'Llamados'}
            </AdminButton>
            <AdminButton tone="neutral" icon={QrCodeIcon} onClick={() => setQrAbierto(true)}>Códigos QR</AdminButton>
            {puedeGestionar && (
              <AdminButton
                tone={editando ? 'primary' : 'neutral'}
                icon={editando ? Check : PencilRuler}
                onClick={() => { setEditando(valor => !valor); setSeleccion(null) }}
              >
                {editando ? 'Listo' : 'Editar plano'}
              </AdminButton>
            )}
          </>
        )}
      >
        <AdminToast>{toast}</AdminToast>

        {/* Una tira compacta en lugar de cuatro tarjetas grandes: la misma
            información se lee de un vistazo y deja el plano como protagonista. */}
        <div className="messa-salon-strip" role="group" aria-label="Estado del salón">
          <Chip tone="green" valor={stats.libres} label="Libres" />
          <Chip tone="rose" valor={stats.ocupadas} label="Ocupadas" />
          <Chip tone="amber" valor={stats.pedidos} label="Con pedido" />
          <Chip tone="blue" valor={stats.cobrando} label="Cobrando" />
        </div>

        {pendientesTransferencia.length > 0 && (
          <AdminPanel
            eyebrow="Requiere tu confirmación"
            title="Transferencias por verificar"
            detail="Confirmá el ingreso en tu banco antes de cerrar la mesa."
          >
            <div className="messa-transfer-list">
              {pendientesTransferencia.map(pedido => (
                <article key={pedido.id}>
                  <div><b>Mesa {pedido.mesa_numero}</b><small>{formatPrecio(pedido.total + pedido.propina)}</small></div>
                  <AdminButton tone="primary" icon={CircleCheckBig} onClick={() => { confirmarTransferenciaStaff(pedido.id); showToast('Transferencia verificada') }}>Verificar</AdminButton>
                </article>
              ))}
            </div>
          </AdminPanel>
        )}

        <AdminPanel
          className="messa-salon__panel"
          eyebrow={editando ? 'Modo edición' : 'Plano del salón'}
          title={editando ? 'Acomodá el salón' : nombreSucursal}
          detail={editando
            ? 'Arrastrá para mover, tirá de la esquina para cambiar el tamaño. Tocá «Listo» al terminar.'
            : 'Tocá una mesa para abrirla, tomar el pedido o cobrar.'}
          action={(
            <AdminSegmented<VistaSalon>
              value={vista}
              onChange={setVista}
              label="Cómo ver el salón"
              items={[
                { value: 'plano', label: 'Plano' },
                { value: 'lista', label: 'Lista' },
              ]}
            />
          )}
        >
          {editando && (
            <div className="messa-plano-toolbar" role="toolbar" aria-label="Herramientas del plano">
              <div className="messa-plano-toolbar__group">
                <span>Agregar</span>
                <button type="button" onClick={() => { crearMesaLayout('redonda', 4); showToast('Mesa agregada al centro del plano') }}>
                  <Plus size={15} aria-hidden="true" />Mesa
                </button>
                {TIPOS_ELEMENTO.map(({ tipo, label, Icon }) => (
                  <button type="button" key={tipo} onClick={() => { crearElementoPlano(tipo); showToast(`${label} agregado`) }}>
                    <Icon size={15} aria-hidden="true" />{label}
                  </button>
                ))}
              </div>
              {seleccion && (
                <div className="messa-plano-toolbar__group messa-plano-toolbar__group--selection">
                  {seleccion.tipo === 'elemento' && (() => {
                    const elemento = elementosSucursal.find(item => item.id === seleccion.id)
                    if (!elemento) return null
                    return (
                      <>
                        {elemento.tipo === 'etiqueta' && (
                          <input
                            value={elemento.texto || ''}
                            onChange={event => actualizarElementoPlano(elemento.id, { texto: event.target.value.slice(0, 22) })}
                            list="messa-etiquetas-sugeridas"
                            placeholder="Cocina, Caja, Salida…"
                            aria-label="Texto del cartel"
                          />
                        )}
                        <button type="button" onClick={() => actualizarElementoPlano(elemento.id, { rotacion: ((elemento.rotacion || 0) + 15) % 360 })}>
                          Girar {elemento.rotacion || 0}°
                        </button>
                      </>
                    )
                  })()}
                  <button type="button" className="is-danger" onClick={borrarSeleccion}><Trash2 size={15} aria-hidden="true" />Borrar</button>
                </div>
              )}
              <datalist id="messa-etiquetas-sugeridas">
                {ETIQUETAS_SUGERIDAS.map(texto => <option key={texto} value={texto} />)}
              </datalist>
            </div>
          )}

          {vista === 'plano' ? (
            <PlanoSalon
              mesas={mesasSucursal}
              elementos={elementosSucursal}
              editando={editando}
              seleccion={seleccion}
              onSeleccionar={setSeleccion}
              onAbrirMesa={abrirMesa}
              onMoverMesa={(id, x, y) => actualizarPosicionMesa(id, x, y)}
              onRedimensionarMesa={(id, ancho) => actualizarMesaLayout(id, { ancho })}
              onMoverElemento={(id, x, y) => actualizarElementoPlano(id, { pos_x: x, pos_y: y })}
              onRedimensionarElemento={(id, ancho, alto) => actualizarElementoPlano(id, { ancho, alto })}
              comensalesDeMesa={comensalesDeMesa}
            />
          ) : (
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
                  ]}
                />
              </div>
              <div className="messa-salon-grid">
                {mesasFiltradas.map(item => (
                  <MesaCard
                    key={item.id}
                    mesa={item}
                    comensales={comensalesDeMesa(item)}
                    pedidos={pedidosDeMesa(item.id).length}
                    reservada={reservasDeMesa(item.id).length > 0}
                    onClick={() => abrirMesa(item.id)}
                  />
                ))}
                {mesasFiltradas.length === 0 && (
                  <AdminEmpty Icon={LayoutGrid} title="No hay mesas con ese estado" description="Cambiá el filtro para ver el resto del salón." />
                )}
              </div>
            </>
          )}
        </AdminPanel>

        {/* ── Ficha de la mesa ── */}
        <AdminSheet
          open={Boolean(mesa)}
          onClose={cerrarSheet}
          title={mesa ? nombreDeMesa(mesa) : 'Mesa'}
          eyebrow={mesa ? `Mesa ${mesa.numero} · ${ESTADOS_MESA[mesa.estado].label}` : 'Mesa'}
          footer={mesa && (
            <>
              <AdminButton tone="quiet" onClick={cerrarSheet}>Cerrar</AdminButton>
              <Link className="messa-button messa-button--primary" href={`/mesa/${mesa.id}?staff=true`}>
                <ReceiptText size={16} />Tomar pedido
              </Link>
            </>
          )}
        >
          {mesa && (
            <div className="messa-mesa-sheet">
              <section className="messa-mesa-card">
                <header><span>Estado</span><AdminStatus tone={ESTADOS_MESA[mesa.estado].tone}>{ESTADOS_MESA[mesa.estado].label}</AdminStatus></header>
                <div className="messa-mesa-card__stepper">
                  <span>Comensales</span>
                  <div>
                    <button type="button" onClick={() => actualizarComensalesMesa(mesa.id, comensalesDeMesa(mesa) - 1)} aria-label="Quitar un comensal"><Minus size={15} /></button>
                    <b>{comensalesDeMesa(mesa)}</b>
                    <button type="button" onClick={() => actualizarComensalesMesa(mesa.id, comensalesDeMesa(mesa) + 1)} aria-label="Sumar un comensal"><Plus size={15} /></button>
                  </div>
                  <small>de {mesa.capacidad} lugares</small>
                </div>
                <div className="messa-mesa-card__pills">
                  <span><ChefHat size={13} />{pedidosDeMesa(mesa.id).length || 'Sin'} pedidos</span>
                  <span><Clock3 size={13} />{mesa.dispositivos.length ? tiempoTranscurrido(mesa.updated_at) : 'Sin sesión'}</span>
                  <span><UsersRound size={13} />{mesa.dispositivos.length} dispositivos</span>
                </div>
              </section>

              <ReservaCard
                reservasDeLaMesa={reservasDeMesa(mesa.id)}
                reservasLibres={reservasSinMesa}
                puedeAsignar={puedeGestionar}
                onAsignar={reservaId => { asignarMesaAReserva(reservaId, mesa.id); showToast('Reserva asignada a la mesa') }}
                onQuitar={reservaId => { asignarMesaAReserva(reservaId, null); showToast('Reserva liberada') }}
              />

              {puedeGestionar && (
                <section className="messa-mesa-card">
                  <header><span>Identidad de la mesa</span></header>
                  <label className="messa-mesa-field">
                    <span>Nombre visible</span>
                    <input
                      value={nombreTemp}
                      onChange={event => setNombreTemp(event.target.value)}
                      onBlur={() => { if (nombreTemp !== (mesa.nombre ?? '')) { actualizarMesaLayout(mesa.id, { nombre: nombreTemp }); showToast('Nombre actualizado') } }}
                      placeholder={`M${mesa.numero}`}
                      maxLength={28}
                    />
                  </label>
                  <div className="messa-mesa-grid-2">
                    <label className="messa-mesa-field">
                      <span>Lugares</span>
                      <input type="number" min={1} max={30} value={mesa.capacidad} onChange={event => actualizarMesaLayout(mesa.id, { capacidad: Number(event.target.value) || 1 })} />
                    </label>
                    <label className="messa-mesa-field">
                      <span>Forma</span>
                      <select value={mesa.forma} onChange={event => actualizarMesaLayout(mesa.id, { forma: event.target.value as Mesa['forma'] })}>
                        <option value="redonda">Redonda</option>
                        <option value="cuadrada">Cuadrada</option>
                        <option value="rectangular">Rectangular</option>
                      </select>
                    </label>
                  </div>
                </section>
              )}

              <section className="messa-mesa-card">
                <header><span><MessageSquareText size={15} aria-hidden="true" /> Nota del equipo</span></header>
                {editandoNota ? (
                  <div className="messa-mesa-nota">
                    <textarea value={notaTemp} onChange={event => setNotaTemp(event.target.value)} rows={3} placeholder="Alergias, cumpleaños, preferencias…" autoFocus />
                    <div>
                      <AdminButton tone="quiet" onClick={() => setEditandoNota(false)}>Cancelar</AdminButton>
                      <AdminButton tone="primary" onClick={() => { actualizarNotaMesa(mesa.id, notaTemp); setEditandoNota(false); showToast('Nota guardada') }}>Guardar</AdminButton>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="messa-mesa-nota__preview" onClick={() => { setNotaTemp(mesa.nota_staff ?? ''); setEditandoNota(true) }}>
                    {mesa.nota_staff || 'Agregar una nota para el equipo'}
                  </button>
                )}
              </section>

              {pedidosDeMesa(mesa.id).length > 0 && (
                <section className="messa-mesa-card">
                  <header><span><ChefHat size={15} aria-hidden="true" /> Consumo</span></header>
                  <div className="messa-mesa-pedidos">
                    {pedidosDeMesa(mesa.id).map(pedido => (
                      <article key={pedido.id}>
                        <header><b>#{pedido.id.slice(-4).toUpperCase()}</b><AdminStatus tone={pedido.estado === 'pagado' ? 'green' : 'amber'}>{pedido.estado.replace('_', ' ')}</AdminStatus></header>
                        {pedido.items.slice(0, 4).map(item => <p key={item.id}>{item.cantidad} × {item.plato.nombre}</p>)}
                      </article>
                    ))}
                  </div>
                </section>
              )}

              <section className="messa-mesa-card">
                <header><span>Control de mesa</span></header>
                <div className="messa-mesa-acciones">
                  <AdminButton tone="neutral" icon={UsersRound} disabled={mesa.estado === 'ocupada'} onClick={() => { ocuparMesaManual(mesa.id); showToast('Mesa marcada como ocupada') }}>Marcar ocupada</AdminButton>
                  <AdminButton tone="neutral" icon={CircleCheckBig} disabled={mesa.estado === 'libre'} onClick={() => { liberarMesa(mesa.id); cerrarSheet(); showToast('Mesa liberada') }}>Liberar</AdminButton>
                  {mesa.estado !== 'libre' && <AdminButton tone="neutral" icon={ArrowRightLeft} onClick={() => setTransfiriendo(valor => !valor)}>Trasladar</AdminButton>}
                </div>
                {transfiriendo && (
                  <div className="messa-mesa-traslado">
                    <p>Elegí la mesa libre de destino.</p>
                    <div>
                      {mesasLibresParaTransferir.length
                        ? mesasLibresParaTransferir.map(destino => (
                          <button type="button" key={destino.id} onClick={() => {
                            const resultado = transferirMesa(mesa.id, destino.id)
                            if (!resultado.ok) { showToast(resultado.error ?? 'No se pudo trasladar'); return }
                            setTransfiriendo(false)
                            setMesaSeleccionadaId(destino.id)
                            showToast('Mesa trasladada')
                          }}>{nombreDeMesa(destino)}</button>
                        ))
                        : <span>No hay mesas libres.</span>}
                    </div>
                  </div>
                )}
              </section>

              {mesa.estado !== 'libre' && mesa.estado !== 'pagada' && pedidosDeMesa(mesa.id).length > 0 && (
                <section className="messa-mesa-card">
                  <header><span><CreditCard size={15} aria-hidden="true" /> Cobrar</span></header>
                  <div className="messa-mesa-acciones">
                    <AdminButton tone="primary" icon={Banknote} onClick={() => { marcarPagoManualStaff(mesa.id, 'efectivo' as MetodoPago); cerrarSheet(); showToast('Pago en efectivo registrado') }}>Efectivo</AdminButton>
                    <AdminButton tone="primary" icon={CreditCard} onClick={() => { marcarPagoManualStaff(mesa.id, 'tarjeta' as MetodoPago); cerrarSheet(); showToast('Pago con tarjeta registrado') }}>Tarjeta</AdminButton>
                  </div>
                </section>
              )}

              <section className="messa-mesa-card messa-mesa-card--qr">
                <header><span><QrCodeIcon size={15} aria-hidden="true" /> Acceso de los comensales</span></header>
                <div className="messa-mesa-qr">
                  {qrPorMesa[mesa.id]
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={qrPorMesa[mesa.id]} alt={`Código QR de ${nombreDeMesa(mesa)}`} />
                    : <div className="messa-mesa-qr__placeholder">Generando…</div>}
                  <div>
                    <b>{formatearCodigo(mesa.codigo_acceso || '') || '········'}</b>
                    <small>Este código viaja dentro del QR. Sin él nadie abre la mesa.</small>
                    <div className="messa-mesa-acciones">
                      <AdminButton tone="neutral" icon={Download} onClick={() => descargarQr(mesa)}>Descargar</AdminButton>
                      {puedeGestionar && <AdminButton tone="quiet" icon={QrCodeIcon} onClick={() => { regenerarCodigoMesa(mesa.id); showToast('Código regenerado — hay que reimprimir el QR') }}>Regenerar</AdminButton>}
                    </div>
                  </div>
                </div>
                {puedeGestionar && (
                  <label className="messa-mesa-field">
                    <span><Nfc size={14} aria-hidden="true" /> Tarjeta RFID / NFC</span>
                    <input
                      value={rfidTemp}
                      onChange={event => setRfidTemp(event.target.value)}
                      onBlur={() => {
                        if (normalizarTagRfid(rfidTemp) === normalizarTagRfid(mesa.rfid_tag || '')) return
                        const resultado = asignarRfidMesa(mesa.id, rfidTemp)
                        showToast(resultado.ok ? (rfidTemp.trim() ? 'Tarjeta vinculada' : 'Tarjeta desvinculada') : resultado.error || 'No se pudo vincular')
                      }}
                      placeholder="Acercá la tarjeta al lector"
                    />
                  </label>
                )}
                {errorQr && <p className="messa-mesa-aviso">{errorQr}</p>}
              </section>
            </div>
          )}
        </AdminSheet>

        {/* ── Todos los QR juntos, para imprimir ── */}
        <AdminSheet
          open={qrAbierto}
          onClose={() => setQrAbierto(false)}
          title="Códigos QR del salón"
          eyebrow="Para imprimir y pegar en cada mesa"
          wide
          footer={<>
            <AdminButton tone="quiet" onClick={() => setQrAbierto(false)}>Cerrar</AdminButton>
            <AdminButton tone="primary" icon={QrCodeIcon} onClick={() => window.print()}>Imprimir hoja</AdminButton>
          </>}
        >
          {errorQr && <p className="messa-mesa-aviso">{errorQr}</p>}
          <div className="messa-qr-sheet">
            {mesasSucursal.map(item => (
              <article key={item.id}>
                {qrPorMesa[item.id]
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={qrPorMesa[item.id]} alt={`QR de ${nombreDeMesa(item)}`} />
                  : <div className="messa-mesa-qr__placeholder">Generando…</div>}
                <b>{nombreDeMesa(item)}</b>
                <small>{formatearCodigo(item.codigo_acceso || '') || '········'}</small>
              </article>
            ))}
          </div>
        </AdminSheet>

        {/* ── Llamados ── */}
        <AdminSheet
          open={llamadosAbiertos}
          onClose={() => setLlamadosAbiertos(false)}
          title="Llamados al mozo"
          eyebrow={`${llamadosPendientes.length} pendientes`}
          footer={<AdminButton tone="quiet" onClick={() => setLlamadosAbiertos(false)}>Cerrar</AdminButton>}
        >
          {llamadosMozo.length === 0 ? (
            <AdminEmpty Icon={BellRing} title="El salón está tranquilo" description="Los llamados de los comensales aparecen acá al instante." />
          ) : (
            <div className="messa-llamados">
              {llamadosMozo.map(llamado => (
                <article key={llamado.id} className={llamado.atendido ? 'is-attended' : ''}>
                  <div>
                    <b>Mesa {llamado.mesa_numero}</b>
                    <span>{llamado.motivo}</span>
                    <small><Clock3 size={12} />{tiempoTranscurrido(llamado.created_at)}</small>
                  </div>
                  {llamado.atendido
                    ? <AdminStatus tone="green">Atendido</AdminStatus>
                    : (
                      <div className="messa-mesa-acciones">
                        <AdminButton tone="neutral" icon={UserRoundCheck} onClick={() => { atenderLlamado(llamado.id); showToast('Llamado atendido') }}>Atendido</AdminButton>
                        <Link className="messa-button messa-button--primary" href={`/mesa/${llamado.mesa_id}?staff=true`} onClick={() => atenderLlamado(llamado.id)}><ReceiptText size={15} />Abrir</Link>
                      </div>
                    )}
                </article>
              ))}
            </div>
          )}
        </AdminSheet>
      </AdminWorkspace>
    </AdminOperationShell>
  )
}

function Chip({ tone, valor, label }: { tone: string; valor: number; label: string }) {
  return (
    <span className={`messa-salon-chip messa-salon-chip--${tone}`}>
      <b>{valor}</b>{label}
    </span>
  )
}

function ReservaCard({ reservasDeLaMesa, reservasLibres, puedeAsignar, onAsignar, onQuitar }: {
  reservasDeLaMesa: { id: string; nombre: string; hora: string; personas: number; estado: string }[]
  reservasLibres: { id: string; nombre: string; hora: string; personas: number }[]
  puedeAsignar: boolean
  onAsignar: (reservaId: string) => void
  onQuitar: (reservaId: string) => void
}) {
  const [asignando, setAsignando] = useState(false)

  return (
    <section className={`messa-mesa-card${reservasDeLaMesa.length ? ' messa-mesa-card--reservada' : ''}`}>
      <header>
        <span><CalendarClock size={15} aria-hidden="true" /> Reservas de hoy</span>
        {reservasDeLaMesa.length > 0 && <AdminStatus tone="gold">Reservada</AdminStatus>}
      </header>
      {reservasDeLaMesa.length === 0
        ? <p className="messa-mesa-vacio">Sin reservas asignadas a esta mesa.</p>
        : (
          <div className="messa-mesa-reservas">
            {reservasDeLaMesa.map(reserva => (
              <article key={reserva.id}>
                <div><b>{reserva.hora} · {reserva.nombre}</b><small>{reserva.personas} personas · {reserva.estado}</small></div>
                {puedeAsignar && <button type="button" onClick={() => onQuitar(reserva.id)} aria-label={`Quitar la reserva de ${reserva.nombre}`}>Quitar</button>}
              </article>
            ))}
          </div>
        )}

      {puedeAsignar && reservasLibres.length > 0 && (
        asignando ? (
          <div className="messa-mesa-reservas messa-mesa-reservas--libres">
            {reservasLibres.map(reserva => (
              <button type="button" key={reserva.id} onClick={() => { onAsignar(reserva.id); setAsignando(false) }}>
                <b>{reserva.hora} · {reserva.nombre}</b><small>{reserva.personas} personas</small>
              </button>
            ))}
          </div>
        ) : (
          <AdminButton tone="quiet" icon={Plus} onClick={() => setAsignando(true)}>Asignar una reserva</AdminButton>
        )
      )}
    </section>
  )
}

function MesaCard({ mesa, comensales, pedidos, reservada, onClick }: {
  mesa: Mesa
  comensales: number
  pedidos: number
  reservada: boolean
  onClick: () => void
}) {
  const minutos = mesa.dispositivos.length > 0 ? tiempoEnMinutos(mesa.updated_at) : 0
  const tiempo = mesa.dispositivos.length === 0
    ? 'Sin sesión'
    : minutos > 720 ? 'Turno anterior' : minutos > 0 ? `${minutos} min` : 'Ahora'
  const estado = ESTADOS_MESA[mesa.estado]

  return (
    <button type="button" className={`messa-table-card is-${mesa.estado}`} onClick={onClick}>
      <header>
        <span>{nombreDeMesa(mesa)}</span>
        <AdminStatus tone={estado.tone}>{estado.label}</AdminStatus>
      </header>
      <div className="messa-table-card__meta">
        <span><UsersRound size={14} />{comensales || '—'}/{mesa.capacidad}</span>
        <span><ChefHat size={14} />{pedidos || '—'} pedidos</span>
        <span><Clock3 size={14} />{tiempo}</span>
      </div>
      <div className="messa-table-card__flags">
        {reservada && <em><CalendarClock size={12} />Reservada</em>}
        {mesa.nota_staff && <em><MessageSquareText size={12} />Nota</em>}
      </div>
    </button>
  )
}
