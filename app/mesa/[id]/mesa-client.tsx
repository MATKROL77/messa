'use client'
import { useEffect, useState, useRef, type CSSProperties, type Dispatch, type Ref, type SetStateAction } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import { Plato, ItemPedido, Ingrediente, MetodoPago, type ConfigPanera, type ConfigRestaurante, type Pedido, type PropinaConfig } from '@/types'
import { formatPrecio, formatPrecioCarta, tiempoTranscurrido, validarEmail } from '@/lib/utils'
import {
  ArrowLeft,
  Banknote,
  BellRing,
  BookOpen,
  Check,
  CheckCircle2,
  ChefHat,
  Clock3,
  CreditCard,
  DoorOpen,
  HandPlatter,
  Landmark,
  MessageSquareText,
  Minus,
  Plus,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Trash2,
  UserRound,
  Users,
  Utensils,
  WalletCards,
  Wheat,
  X,
} from 'lucide-react'
import DishMedia from '@/components/menu/DishMedia'
import MenuExperience from '@/components/menu/MenuExperience'
import MenuActionDialog from '@/components/menu/MenuActionDialog'
import TableAccessGate from '@/components/menu/TableAccessGate'
import { accesoRecordado, olvidarAcceso, recordarAcceso, validarCodigoDeMesa } from '@/lib/acceso-mesa'
import { withBasePath } from '@/lib/base-path'

type VistaAll = 'menu' | 'carrito' | 'pago' | 'reviews'
type ReviewDraft = Record<string, { rating: number; comentario: string }>
type Maridaje = NonNullable<Plato['maridaje']>[number]
type VerificacionPagoResponse = { ok?: boolean; aprobado?: boolean }
type PreferenciaPagoResponse = { demo?: boolean; init_point?: string }
type FlyToCart = {
  plato: Plato
  left: number
  top: number
  width: number
  height: number
  deltaX: number
  deltaY: number
}

type EstadoAcceso = 'verificando' | 'concedido' | 'denegado'

/**
 * Control de acceso de la mesa. `/mesa/m2` a secas ya no abre nada: hace falta
 * el código que viaja en el QR (`?c=XXXX-XXXX`), uno tipeado a mano, o un
 * permiso ya validado en este mismo dispositivo. El modo staff se valida
 * aparte contra la sesión real del panel, porque antes alcanzaba con agregar
 * `?staff=true` a la URL para tomar pedidos en nombre de cualquier mesa.
 */
export default function MesaClient() {
  const params = useParams()
  const searchParams = useSearchParams()
  const mesaId = params.id as string
  const pideModoStaff = searchParams.get('staff') === 'true'
  const { mesas, initStore } = useStore()

  const [acceso, setAcceso] = useState<EstadoAcceso>('verificando')
  const [staffAutorizado, setStaffAutorizado] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { initStore() }, [initStore])

  useEffect(() => {
    let vigente = true

    const resolver = async () => {
      if (pideModoStaff) {
        // El modo staff toma pedidos en nombre de la mesa: exige sesión real.
        // Antes alcanzaba con agregar `?staff=true` a la dirección.
        try {
          const respuesta = await fetch(withBasePath('/api/auth/me'))
          if (!vigente) return
          if (respuesta.ok) { setStaffAutorizado(true); setAcceso('concedido'); return }
        } catch {
          // Sin backend disponible caemos al control por código, igual que un comensal.
        }
        if (!vigente) return
      }

      const codigoUrl = searchParams.get('c') || searchParams.get('codigo') || ''
      if (codigoUrl && await validarCodigoDeMesa(mesaId, codigoUrl, mesas)) {
        if (!vigente) return
        recordarAcceso(mesaId, codigoUrl)
        setAcceso('concedido')
        return
      }

      const guardado = accesoRecordado(mesaId)
      if (guardado && await validarCodigoDeMesa(mesaId, guardado, mesas)) {
        if (!vigente) return
        setAcceso('concedido')
        return
      }
      if (!vigente) return
      if (guardado) olvidarAcceso(mesaId)

      setError(codigoUrl ? 'Ese código no corresponde a esta mesa.' : '')
      setAcceso('denegado')
    }

    void resolver()
    return () => { vigente = false }
  }, [mesaId, mesas, pideModoStaff, searchParams])

  if (acceso === 'verificando') {
    return <div className="mesa-gate mesa-gate--loading" role="status" aria-live="polite"><span className="menu-spinner" /><p>Abriendo tu mesa…</p></div>
  }

  if (acceso === 'denegado') {
    return (
      <TableAccessGate
        mesaNumero={mesas.find(mesa => mesa.id === mesaId)?.numero}
        error={error}
        onSubmit={async codigo => {
          if (await validarCodigoDeMesa(mesaId, codigo, mesas)) {
            recordarAcceso(mesaId, codigo)
            setError('')
            setAcceso('concedido')
          } else {
            setError('El código no coincide con esta mesa. Revisalo e intentá de nuevo.')
          }
        }}
      />
    )
  }

  return <MesaExperience mesaId={mesaId} esModoStaff={pideModoStaff && staffAutorizado} />
}

function MesaExperience({ mesaId, esModoStaff }: { mesaId: string; esModoStaff: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { sesion, esStaff, mesas, carrito, pedidos, platos, config, categoriasDisponibles, initStore, iniciarSesionMesa, iniciarSesionStaff, abandonarMesa, confirmarPedido, marcarComoPagado, registrarPagoParcial, saldoPendienteMesa, prepararPagoManual, setModoPostPago, agregarAlCarrito, quitarDelCarrito, actualizarCantidad, setPaneraAceptada, panera_aceptada, llamarMozo, propinaConfig, paneraPromptShown, fidelidadConfig, resenasEnviadas, ultimaCuentaPagada, enviarResena } = useStore()

  const mesa = mesas.find(m => m.id === mesaId)
  const [vista, setVista] = useState<VistaAll>('menu')
  const [categoriaActiva, setCategoriaActiva] = useState('todos')
  const [filtros, setFiltros] = useState<string[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [platoActivo, setPlatoActivo] = useState<Plato | null>(null)
  const [ingRemovidos, setIngRemovidos] = useState<string[]>([])
  const [modsElegidos, setModsElegidos] = useState<string[]>([])
  const [notas, setNotas] = useState('')
  const [mostrarNutri, setMostrarNutri] = useState(false)
  const [mostrarReviews, setMostrarReviews] = useState(false)
  const [confirmandoAbandono, setConfirmandoAbandono] = useState(false)
  const [pedidoEnviado, setPedidoEnviado] = useState(false)
  const [pagoCompletado, setPagoCompletado] = useState(false)
  const [reviewPlatos, setReviewPlatos] = useState<ReviewDraft>({})
  const [emailPago, setEmailPago] = useState('')
  const [toast, setToast] = useState('')
  const [mostrarPanera, setMostrarPanera] = useState(false)
  const [mostrarLlamarMozo, setMostrarLlamarMozo] = useState(false)
  const [verificandoMP, setVerificandoMP] = useState(false)
  const [flyToCart, setFlyToCart] = useState<FlyToCart | null>(null)
  const [cartPulse, setCartPulse] = useState(false)
  const toastRef = useRef<NodeJS.Timeout | null>(null)
  const flyRef = useRef<NodeJS.Timeout | null>(null)
  const pulseRef = useRef<NodeJS.Timeout | null>(null)
  const pedidoNavRef = useRef<HTMLButtonElement | null>(null)

  const pedidosMesa = pedidos.filter(p => p.mesa_id === mesaId && p.estado !== 'cancelado')
  const pedidosEnCocina = pedidosMesa.filter(p => ['en_cocina', 'entregado'].includes(p.estado))

  /**
   * Acredita los puntos del consumo en la cuenta del comensal (si tiene una en
   * /cuenta y está logueado en este dispositivo). Se dispara al cerrar la
   * cuenta y no bloquea nada: si falla —no hay cuenta, no hay base de datos,
   * se cortó la conexión— el pago igual se completa y el saldo local de
   * fidelidad sigue funcionando como siempre.
   */
  const acreditarPuntosDeCuenta = (monto: number) => {
    if (!fidelidadConfig.habilitado || monto <= 0) return
    const codigo = accesoRecordado(mesaId)
    if (!codigo) return
    void fetch(withBasePath('/api/cuenta/puntos'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        monto,
        mesaId,
        codigo,
        puntosPor1000: fidelidadConfig.puntos_por_1000_gastado,
        referencia: `mesa:${mesaId}`,
      }),
    }).catch(() => {})
  }

  const idsUltimaCuenta = ultimaCuentaPagada[mesaId] || []
  const pedidosPagados = pedidosMesa.filter(p => idsUltimaCuenta.includes(p.id) && p.estado === 'pagado' && p.confirmado_staff !== false)
  const yaHayPedido = pedidosEnCocina.length > 0
  const esPostPago = sesion?.modo === 'post_pago'
  const mesaNumero = mesa?.numero || parseInt(mesaId.replace('m', '')) || 1
  const cantPersonas = mesa?.dispositivos.length || 1

  const platosDisponibles = platos.filter(p => p.disponible)
  const platosDestacados = platosDisponibles.filter(p => p.destacado && config.chef_recomendaciones_habilitadas)
  const platosFiltrados = platosDisponibles.filter(p => {
    if (categoriaActiva !== 'todos' && p.categoria_id !== categoriaActiva) return false
    if (filtros.length > 0 && !filtros.every(f => p.tags.includes(f))) return false
    if (busqueda && !p.nombre.toLowerCase().includes(busqueda.toLowerCase()) && !p.descripcion.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })
  const todosLosTags = [...new Set(platosDisponibles.flatMap(p => p.tags))]

  useEffect(() => {
    initStore()
    if (esModoStaff) {
      iniciarSesionStaff(mesaId, mesaNumero)
    } else if (!sesion || sesion.mesa_id !== mesaId || esStaff) {
      iniciarSesionMesa(mesaId, mesaNumero)
    }
    const timer = (!yaHayPedido && !esModoStaff) ? setTimeout(() => { router.push('/vista') }, 15 * 60 * 1000) : null
    return () => { if (timer) clearTimeout(timer) }
    // eslint-disable-next-line
  }, [mesaId, esModoStaff])

  useEffect(() => {
    if (esModoStaff || !config.panera.habilitada || paneraPromptShown[mesaId] || panera_aceptada !== null) return
    const timer = window.setTimeout(() => setMostrarPanera(true), 650)
    return () => window.clearTimeout(timer)
  }, [config.panera.habilitada, esModoStaff, mesaId, paneraPromptShown, panera_aceptada])

  useEffect(() => () => {
    if (toastRef.current) clearTimeout(toastRef.current)
    if (flyRef.current) clearTimeout(flyRef.current)
    if (pulseRef.current) clearTimeout(pulseRef.current)
  }, [])

  useEffect(() => {
    if (esModoStaff || pedidosPagados.length === 0) return
    const emailCuenta = pedidosPagados.find(pedido => pedido.cliente_email)?.cliente_email
    const timer = window.setTimeout(() => {
      if (emailCuenta) setEmailPago(emailCuenta)
      if (!esPostPago) setModoPostPago()
      setVista('reviews')
    }, 0)
    // Solo se abre al aparecer una nueva cuenta pagada. Después de enviar la
    // reseña, el comensal puede volver a la carta sin que se reabra.
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esModoStaff, mesaId, pedidosPagados.length])

  const showToast = (msg: string) => {
    setToast(msg)
    if (toastRef.current) clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(''), 2600)
  }

  // Cuando Mercado Pago redirige de vuelta tras un pago real (no el demo),
  // acá está el único lugar del cliente donde se decide si se marca como
  // pagado — y solo después de confirmarlo con la API real de MP, nunca por
  // confiar en el query string tal cual llega.
  useEffect(() => {
    const mpStatus = searchParams.get('mp_status')
    const paymentId = searchParams.get('payment_id')
    if (!mpStatus || esModoStaff) return

    if (mpStatus !== 'success' || !paymentId) {
      window.setTimeout(() => showToast(mpStatus === 'pending' ? 'Tu pago está pendiente de acreditación' : 'El pago no se completó — podés reintentar'), 0)
      router.replace(`/mesa/${mesaId}`)
      return
    }

    window.setTimeout(() => setVerificandoMP(true), 0)
    const propinaUrl = parseFloat(searchParams.get('propina') || '0') || 0
    const emailUrl = searchParams.get('email') || ''
    // `parcial` lleva el importe de la parte que se pagó cuando la cuenta se
    // dividió: al volver del checkout hay que sumarlo como aporte, no cerrar
    // la mesa entera.
    const parcialUrl = parseFloat(searchParams.get('parcial') || '0') || 0

    fetch(withBasePath(`/api/mercadopago/verificar-pago?payment_id=${paymentId}`))
      .then(r => r.json() as Promise<VerificacionPagoResponse>)
      .then(data => {
        if (data.ok && data.aprobado) {
          // Los puntos se acreditan también al volver del checkout externo:
          // este camino no pasa por PagoView, así que sin esto un pago con
          // Mercado Pago real no sumaría nada a la cuenta del comensal.
          acreditarPuntosDeCuenta(parcialUrl > 0 ? parcialUrl : pedidosEnCocina.reduce((suma, pedido) => suma + pedido.total, 0))
          const resultado = parcialUrl > 0
            ? registrarPagoParcial(mesaId, parcialUrl, propinaUrl, 'mercadopago', emailUrl)
            : (marcarComoPagado(mesaId, 'mercadopago', propinaUrl, emailUrl), { saldado: true, restante: 0 })
          if (resultado.saldado) {
            setModoPostPago()
            setPagoCompletado(true)
            setVista('reviews')
            showToast('Pago verificado con Mercado Pago')
          } else {
            showToast(`Aporte acreditado — faltan ${formatPrecio(resultado.restante)} en la mesa`)
          }
        } else {
          showToast('No pudimos confirmar el pago con Mercado Pago — hablá con el mozo')
        }
      })
      .catch(() => showToast('Error verificando el pago — hablá con el mozo'))
      .finally(() => {
        setVerificandoMP(false)
        router.replace(`/mesa/${mesaId}`)
      })
    // eslint-disable-next-line
  }, [])

  const handlePanera = (opcionId: string | null) => {
    setMostrarPanera(false)
    setPaneraAceptada(opcionId)
    useStore.setState(s => ({ paneraPromptShown: { ...s.paneraPromptShown, [mesaId]: true } }))
    const opcion = config.panera.opciones.find(o => o.id === opcionId)
    if (opcion && opcion.precio > 0) showToast(`${opcion.nombre} agregada (${formatPrecio(opcion.precio)})`)
    else if (opcion) showToast(`${opcion.nombre} agregada`)
  }

  const toggleFiltro = (f: string) => setFiltros(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])
  const toggleIng = (ing: Ingrediente) => { if (!ing.removible) return; setIngRemovidos(prev => prev.includes(ing.id) ? prev.filter(x => x !== ing.id) : [...prev, ing.id]) }
  const abrirDetalle = (plato: Plato) => { setPlatoActivo(plato); setIngRemovidos([]); setModsElegidos([]); setNotas(''); setMostrarNutri(false); setMostrarReviews(false) }

  const toggleModificador = (plato: Plato, modificadorId: string, opcionId: string) => {
    const modificador = plato.modificadores.find(item => item.id === modificadorId)
    if (!modificador) return
    setModsElegidos(actuales => {
      if (modificador.multiple) return actuales.includes(opcionId) ? actuales.filter(id => id !== opcionId) : [...actuales, opcionId]
      const idsDelGrupo = new Set(modificador.opciones.map(opcion => opcion.id))
      return [...actuales.filter(id => !idsDelGrupo.has(id)), ...(actuales.includes(opcionId) ? [] : [opcionId])]
    })
  }

  const handleAgregarAlCarrito = (plato: Plato) => {
    if (esPostPago || sesion?.modo === 'curioso') { showToast('No podés agregar platos en este modo'); return }
    if (plato.precio_pendiente) { showToast('Este producto todavía necesita un precio en Administración'); return }
    const incompleto = plato.modificadores.find(modificador => modificador.obligatorio && !modificador.opciones.some(opcion => modsElegidos.includes(opcion.id)))
    if (incompleto) { showToast(`Elegí ${incompleto.nombre.toLowerCase()} para continuar`); return }

    const media = document.querySelector<HTMLElement>('.mesa-detail-panel .dish-media')
    const target = pedidoNavRef.current
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (media && target && !reduceMotion) {
      const sourceRect = media.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      setFlyToCart({
        plato,
        left: sourceRect.left,
        top: sourceRect.top,
        width: sourceRect.width,
        height: sourceRect.height,
        deltaX: targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2),
        deltaY: targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2),
      })
      if (flyRef.current) clearTimeout(flyRef.current)
      flyRef.current = setTimeout(() => {
        setFlyToCart(null)
        setCartPulse(true)
        if (pulseRef.current) clearTimeout(pulseRef.current)
        pulseRef.current = setTimeout(() => setCartPulse(false), 520)
      }, 720)
    } else {
      setCartPulse(true)
      if (pulseRef.current) clearTimeout(pulseRef.current)
      pulseRef.current = setTimeout(() => setCartPulse(false), 420)
    }

    agregarAlCarrito(plato, ingRemovidos, notas, 1, modsElegidos)
    setPlatoActivo(null)
    showToast(`${plato.nombre} agregado`)
  }

  const handleConfirmarPedido = () => {
    if (carrito.length === 0) return
    const pedido = confirmarPedido(panera_aceptada)
    if (pedido) { setPedidoEnviado(true); showToast('Pedido enviado a cocina'); setTimeout(() => { setPedidoEnviado(false); setVista('menu') }, 2600) }
  }

  const handleAbandonarMesa = () => { if (yaHayPedido) { showToast('Hay pedido activo. Avisá al personal.'); return }; olvidarAcceso(mesaId); abandonarMesa(); router.push('/vista') }

  const handleLlamarMozo = (motivo: string) => {
    llamarMozo(mesaId, mesaNumero, motivo)
    setMostrarLlamarMozo(false)
    showToast('El equipo de salón recibió tu llamado')
  }

  const handleEnviarResenas = () => {
    let enviadas = 0
    let error = ''
    Object.entries(reviewPlatos).forEach(([platoId, r]) => {
      if (r.rating <= 0) return
      const pedido = pedidosPagados.find(item => item.items.some(linea => linea.plato.id === platoId) && !resenasEnviadas[`${item.id}:${platoId}`])
      if (!pedido) return
      const resultado = enviarResena(pedido.id, platoId, r.rating, r.comentario, emailPago)
      if (resultado.ok) enviadas += 1
      else error = resultado.error || error
    })
    if (!enviadas) { showToast(error || 'Elegí al menos una puntuación'); return }
    const puntos = fidelidadConfig.habilitado && emailPago ? (useStore.getState().puntosClientes[emailPago.toLowerCase()] || 0) : 0
    showToast(fidelidadConfig.habilitado ? `Gracias. Ahora tenés ${puntos} puntos` : 'Gracias por tus reseñas')
    setTimeout(() => setVista('menu'), 2200)
  }

  return (
    <div className="mesa-experience">
      {toast && <div className="menu-feedback-toast fade-in" role="status"><CheckCircle2 size={16} />{toast}</div>}
      {flyToCart && (
        <div
          className="mesa-fly-product"
          aria-hidden="true"
          style={{
            left: flyToCart.left,
            top: flyToCart.top,
            width: flyToCart.width,
            height: flyToCart.height,
            '--fly-delta-x': `${flyToCart.deltaX}px`,
            '--fly-delta-y': `${flyToCart.deltaY}px`,
          } as CSSProperties}
        >
          <DishMedia plato={flyToCart.plato} variant="hero" />
        </div>
      )}

      {verificandoMP && (
        <div className="menu-action-layer" role="status" aria-live="polite">
          <div className="menu-payment-loading">
            <span className="menu-spinner" />
            <p>Verificando tu pago con Mercado Pago…</p>
          </div>
        </div>
      )}

      {esModoStaff && (
        <div className="mesa-staff-banner">
          <UserRound size={15} />
          <span>Modo Staff · pedido en nombre de Mesa {mesaNumero}</span>
        </div>
      )}

      <MenuActionDialog
        open={mostrarPanera}
        onClose={() => handlePanera(null)}
        Icon={Wheat}
        eyebrow="BIENVENIDA"
        title="La panera de la casa"
        description={config.panera.titulo}
        tone="gold"
      >
        <div className="menu-choice-list">
          {config.panera.opciones.map(opcion => (
            <button type="button" key={opcion.id} onClick={() => handlePanera(opcion.id)}>
              {/* La opción de rechazar también decía "Se suma a esta mesa", que
                  es justo lo contrario de lo que hace. */}
              <span><b>{opcion.nombre}</b><small>{opcion.precio > 0 ? 'Se suma a esta mesa' : 'Seguimos sin panera'}</small></span>
              <strong>{opcion.precio > 0 ? formatPrecio(opcion.precio) : 'Sin cargo'}</strong>
            </button>
          ))}
        </div>
      </MenuActionDialog>

      {vista === 'menu' && (
        <MenuExperience
          mode="table-order"
          restaurantName={config.nombre}
          contextLabel={`Mesa ${mesaNumero} · ${cantPersonas} ${cantPersonas === 1 ? 'comensal' : 'comensales'}`}
          status={<span className={`menu-table-status menu-table-status--${esPostPago ? 'paid' : yaHayPedido ? 'active-order' : 'active'}`}><i />{esPostPago ? 'Cuenta pagada' : yaHayPedido ? 'Pedido activo' : 'Mesa activa'}</span>}
          dishes={platosFiltrados}
          featured={platosDestacados}
          categories={categoriasDisponibles}
          category={categoriaActiva}
          onCategoryChange={setCategoriaActiva}
          query={busqueda}
          onQueryChange={setBusqueda}
          filters={filtros}
          filterOptions={todosLosTags}
          filtersOpen={filtrosAbiertos}
          onFiltersOpenChange={setFiltrosAbiertos}
          onToggleFilter={toggleFiltro}
          onClearFilters={() => setFiltros([])}
          onSelect={abrirDetalle}
        >
          {yaHayPedido && (
            <section className="mesa-live-order">
              <header><span><ChefHat size={18} /></span><div><p className="eyebrow">COCINA EN MARCHA</p><h2>{pedidosEnCocina.length > 1 ? `${pedidosEnCocina.length} rondas enviadas` : 'Tu pedido está en cocina'}</h2></div></header>
              <div className="mesa-live-order__items">
                {pedidosEnCocina.flatMap(p => p.items).map(item => (
                  <div key={item.id}>
                    <span>{item.cantidad}× {item.plato.nombre}{item.dispositivo_id.startsWith('staff') && <small>Agregado por el equipo</small>}</span>
                    <strong>{formatPrecio(item.precio_unitario * item.cantidad)}</strong>
                  </div>
                ))}
              </div>
              <footer><span>Última ronda {tiempoTranscurrido(pedidosEnCocina[pedidosEnCocina.length - 1]?.created_at)}</span>{!esModoStaff && <button type="button" onClick={() => setVista('pago')}>Revisar y pagar <ReceiptText size={15} /></button>}</footer>
            </section>
          )}
          {!yaHayPedido && !esPostPago && !esModoStaff && (
            <div className="mesa-session-exit"><button type="button" onClick={() => setConfirmandoAbandono(true)}><DoorOpen size={15} />Cerrar esta sesión de mesa</button></div>
          )}
        </MenuExperience>
      )}

      {vista === 'carrito' && <CarritoView carrito={carrito} sesionDispositivoId={sesion?.dispositivo_id || ''} onRemover={quitarDelCarrito} onActualizar={actualizarCantidad} onVolver={() => setVista('menu')} onPedir={handleConfirmarPedido} onIrPago={() => setVista('pago')} pedidoEnviado={pedidoEnviado} paneraAceptada={panera_aceptada} paneraConfig={config.panera} esModoStaff={esModoStaff} />}
      {vista === 'pago' && !esModoStaff && <PagoView pedidos={pedidosEnCocina} propinaConfig={propinaConfig} pagoCompletado={pagoCompletado} setPagoCompletado={setPagoCompletado} onVolver={() => setVista('menu')} sesionDispositivoId={sesion?.dispositivo_id || ''} mesaId={mesaId} mesaNumero={mesaNumero} config={config} marcarComoPagado={marcarComoPagado} registrarPagoParcial={registrarPagoParcial} yaAportado={saldoPendienteMesa(mesaId).cubierto} prepararPagoManual={prepararPagoManual} setModoPostPago={setModoPostPago} irAResenas={() => setVista('reviews')} onLlamarMozo={handleLlamarMozo} emailPago={emailPago} setEmailPago={setEmailPago} acreditarPuntos={acreditarPuntosDeCuenta} />}
      {vista === 'reviews' && !esModoStaff && <ReviewsView pedidos={pedidosPagados} resenasEnviadas={resenasEnviadas} reviewPlatos={reviewPlatos} setReviewPlatos={setReviewPlatos} onEnviar={handleEnviarResenas} fidelidadHabilitado={fidelidadConfig.habilitado && Boolean(emailPago)} puntosPorResena={fidelidadConfig.puntos_por_resena} onVolver={() => setVista('menu')} />}

      {vista === 'menu' && !esPostPago && !esModoStaff && (
        <button type="button" className="mesa-waiter-trigger" onClick={() => setMostrarLlamarMozo(true)} aria-label="Llamar al equipo de salón">
          <BellRing size={20} />
          <span>Llamar al mozo</span>
        </button>
      )}

      {vista !== 'pago' && (
        <div className="mesa-bottom-nav" role="navigation" aria-label="Navegación de la mesa">
          <NavItem label="Carta" Icon={BookOpen} active={vista === 'menu'} onClick={() => setVista('menu')} />
          <NavItem buttonRef={pedidoNavRef} className={cartPulse ? 'is-receiving' : ''} label={carrito.length > 0 ? `Pedido (${carrito.length})` : 'Pedido'} Icon={ShoppingBag} active={vista === 'carrito'} onClick={() => setVista('carrito')} badge={carrito.length} disabled={esPostPago} />
          {yaHayPedido && !esModoStaff && <NavItem label="Pagar" Icon={CreditCard} active={(vista as string) === 'pago'} onClick={() => setVista('pago')} gold />}
        </div>
      )}

      {platoActivo && (
        <div className="overlay mesa-detail-overlay" onClick={e => { if (e.target === e.currentTarget) setPlatoActivo(null) }} style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }}>
          {/* El botón de cerrar vive fuera del panel: el panel es el contenedor
              que scrollea, y cualquier hijo suyo quedaría recortado por ese
              overflow al desplazarse. */}
          <button type="button" className="mesa-detail-close" onClick={() => setPlatoActivo(null)} aria-label="Cerrar detalle"><X size={19} /></button>
          <div className="slide-up mesa-detail-panel">
            <DetalleContent plato={platoActivo} ingRemovidos={ingRemovidos} toggleIng={toggleIng} modsElegidos={modsElegidos} toggleModificador={toggleModificador} notas={notas} setNotas={setNotas} mostrarNutri={mostrarNutri} setMostrarNutri={setMostrarNutri} mostrarReviews={mostrarReviews} setMostrarReviews={setMostrarReviews} onAgregar={() => handleAgregarAlCarrito(platoActivo)} onMaridar={(maridaje: Maridaje) => { const producto = platos.find(item => item.id === maridaje.plato_id); if (producto) { agregarAlCarrito(producto, [], ''); showToast(`${maridaje.nombre} agregado`) } }} esPostPago={esPostPago} mostrarNutricion={config.mostrar_nutricion} />
          </div>
        </div>
      )}

      <MenuActionDialog
        open={confirmandoAbandono}
        onClose={() => setConfirmandoAbandono(false)}
        Icon={DoorOpen}
        eyebrow="SESIÓN DE MESA"
        title="¿Cerrar esta sesión?"
        description="Se cerrará la experiencia de esta mesa. No tenés pedidos activos."
        tone="danger"
        footer={<><button type="button" className="menu-dialog-button menu-dialog-button--secondary" onClick={() => setConfirmandoAbandono(false)}>Continuar en la mesa</button><button type="button" className="menu-dialog-button menu-dialog-button--danger" onClick={handleAbandonarMesa}>Cerrar sesión</button></>}
      />

      <MenuActionDialog
        open={mostrarLlamarMozo}
        onClose={() => setMostrarLlamarMozo(false)}
        Icon={BellRing}
        eyebrow={`MESA ${mesaNumero}`}
        title="¿Cómo podemos ayudarte?"
        description="Elegí el motivo. El equipo de salón verá la mesa y la prioridad del llamado."
        tone="gold"
      >
        <div className="menu-choice-list menu-choice-list--waiter">
          {[
            { label: 'Ayuda con el pedido', detail: 'Dudas, cambios o recomendaciones', Icon: MessageSquareText },
            { label: 'Falta algo en la mesa', detail: 'Cubiertos, servilletas o vajilla', Icon: Utensils },
            { label: 'Pagar en efectivo', detail: 'El mozo se acerca con la cuenta', Icon: Banknote },
            { label: 'Pagar con tarjeta', detail: 'El mozo se acerca con el POS', Icon: CreditCard },
            { label: 'Otra consulta', detail: 'Asistencia general', Icon: HandPlatter },
          ].map(option => (
            <button type="button" key={option.label} onClick={() => handleLlamarMozo(option.label)}>
              <span className="menu-choice-list__icon"><option.Icon size={18} /></span>
              <span><b>{option.label}</b><small>{option.detail}</small></span>
              <span className="menu-choice-list__arrow">→</span>
            </button>
          ))}
        </div>
      </MenuActionDialog>
    </div>
  )
}

interface DetalleContentProps {
  plato: Plato
  ingRemovidos: string[]
  toggleIng: (ingrediente: Ingrediente) => void
  modsElegidos: string[]
  toggleModificador: (plato: Plato, modificadorId: string, opcionId: string) => void
  notas: string
  setNotas: (notas: string) => void
  mostrarNutri: boolean
  setMostrarNutri: (mostrar: boolean) => void
  mostrarReviews: boolean
  setMostrarReviews: (mostrar: boolean) => void
  onAgregar: () => void
  onMaridar: (maridaje: Maridaje) => void
  esPostPago: boolean
  mostrarNutricion: boolean
}

function DetalleContent({ plato, ingRemovidos, toggleIng, modsElegidos, toggleModificador, notas, setNotas, mostrarNutri, setMostrarNutri, mostrarReviews, setMostrarReviews, onAgregar, onMaridar, esPostPago, mostrarNutricion }: DetalleContentProps) {
  const precioFinal = plato.precio + plato.modificadores
    .flatMap((modificador: Plato['modificadores'][number]) => modificador.opciones)
    .filter((opcion: Plato['modificadores'][number]['opciones'][number]) => modsElegidos.includes(opcion.id))
    .reduce((total: number, opcion: Plato['modificadores'][number]['opciones'][number]) => total + opcion.precio_extra, 0)
  return (
    <>
      <div className="mesa-detail__media">
        <DishMedia plato={plato} variant="hero" />
      </div>
      <div className="mesa-detail__body">
        <div className="mesa-detail__heading">
          <h2 className="font-titulos">{plato.nombre}</h2>
          <span className="mesa-detail__price">{formatPrecioCarta(plato.precio, plato.precio_pendiente)}</span>
        </div>
        <button onClick={() => setMostrarReviews(!mostrarReviews)} style={{ display: 'flex', gap: 8, marginBottom: 12, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
          <span style={{ alignItems: 'center', color: 'var(--gold)', display: 'inline-flex', fontSize: 13, gap: 4 }}><Star size={14} fill="currentColor" /> {plato.rating}</span>
          <span style={{ fontSize: 12, color: '#707070', textDecoration: 'underline' }}>({plato.total_reviews} reseñas)</span>
        </button>
        {plato.tiempo_preparacion_minutos && <p style={{ alignItems: 'center', color: '#707070', display: 'flex', fontSize: 12, gap: 5, margin: '-5px 0 14px' }}><Clock3 size={14} /> {plato.tiempo_preparacion_minutos} min</p>}
        {mostrarReviews && plato.reviews_muestra?.length > 0 && (
          <div className="fade-in" style={{ background: '#1C1C1C', borderRadius: 12, padding: 12, marginBottom: 16 }}>
            {plato.reviews_muestra.map(r => (
              <div key={r.id} style={{ padding: '8px 0', borderBottom: '1px solid #2A2A2A' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#A0A0A0' }}>{r.autor}</span>
                  <span className="mesa-review-stars" aria-label={`${r.rating} de 5 estrellas`}>{Array.from({ length: r.rating }, (_, index) => <Star key={index} size={11} fill="currentColor" />)}</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: '#707070', lineHeight: 1.5 }}>{r.comentario}</p>
              </div>
            ))}
          </div>
        )}
        <p style={{ color: '#A0A0A0', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>{plato.descripcion}</p>

        {plato.modificadores?.map(mod => (
          <div key={mod.id} style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>{mod.nombre} {mod.obligatorio ? '*' : ''}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {mod.opciones.map(op => {
                const active = modsElegidos.includes(op.id)
                return <button type="button" key={op.id} aria-pressed={active} onClick={() => toggleModificador(plato, mod.id, op.id)} className={active ? 'mesa-option is-selected' : 'mesa-option'}>{active && <Check size={14} />}{op.nombre}{op.precio_extra > 0 ? ` +${formatPrecio(op.precio_extra)}` : ''}</button>
              })}
            </div>
          </div>
        ))}

        {plato.ingredientes?.length > 0 && (
          <>
            <p style={{ fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Personalizá · tocá para quitar</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
              {plato.ingredientes.map((ing: Ingrediente) => (
                <button
                  key={ing.id}
                  type="button"
                  onClick={() => toggleIng(ing)}
                  disabled={!ing.removible}
                  className={`mesa-ingredient-option${ingRemovidos.includes(ing.id) ? ' is-removed' : ''}`}
                >
                  {ing.nombre}
                </button>
              ))}
            </div>
          </>
        )}

        <textarea value={notas} onChange={event => setNotas(event.target.value)} placeholder="Notas adicionales (alergias, punto de cocción...)" rows={2} className="input-premium" style={{ resize: 'none', marginBottom: 16 }} />

        {plato.maridaje?.length > 0 && (
          <div style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <p style={{ alignItems: 'center', color: 'var(--gold)', display: 'flex', fontSize: 12, fontWeight: 600, gap: 5, margin: '0 0 8px' }}><Sparkles size={14} /> Maridaje sugerido · {plato.maridaje[0].porcentaje_conversion}% de mesas lo piden</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div><p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{plato.maridaje[0].nombre}</p><p style={{ margin: 0, fontSize: 12, color: '#707070' }}>{formatPrecio(plato.maridaje[0].precio)}</p></div>
              <button onClick={() => onMaridar(plato.maridaje[0])} style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 10, padding: '7px 12px', color: 'var(--gold)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>+ Agregar</button>
            </div>
          </div>
        )}

        {mostrarNutricion && plato.calorias && (
          <div style={{ marginBottom: 20 }}>
            <button onClick={() => setMostrarNutri(!mostrarNutri)} style={{ background: 'transparent', border: 'none', color: '#707070', fontSize: 13, cursor: 'pointer', padding: 0 }}>{mostrarNutri ? '▲' : '▼'} Información nutricional</button>
            {mostrarNutri && (
              <div className="fade-in" style={{ background: '#1C1C1C', borderRadius: 12, padding: 14, marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[['Calorías', `${plato.calorias} kcal`], ['Proteínas', `${plato.proteinas}g`], ['Carbohidratos', `${plato.carbohidratos}g`], ['Grasas', `${plato.grasas}g`]].map(([label, value]) => (
                  <div key={label} style={{ textAlign: 'center' }}><p style={{ margin: 0, fontSize: 11, color: '#707070' }}>{label}</p><p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{value}</p></div>
                ))}
              </div>
            )}
          </div>
        )}

        {plato.precio_pendiente ? <div style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.26)', borderRadius: 14, color: 'var(--gold)', fontSize: 13, lineHeight: 1.45, padding: 14, textAlign: 'center' }}>Precio pendiente de configuración.</div> : !esPostPago ? <button onClick={onAgregar} className="mesa-primary-cta">Agregar a la cocina — {formatPrecio(precioFinal)}</button> : <div style={{ textAlign: 'center', color: '#707070', fontSize: 14 }}>Cuenta pagada — Modo exploración</div>}
      </div>
    </>
  )
}

interface CarritoViewProps {
  carrito: ItemPedido[]
  sesionDispositivoId: string
  onRemover: (itemId: string) => void
  onActualizar: (itemId: string, cantidad: number) => void
  onVolver: () => void
  onPedir: () => void
  onIrPago: () => void
  pedidoEnviado: boolean
  paneraAceptada: string | null
  paneraConfig: ConfigPanera
  esModoStaff: boolean
}

function CarritoView({ carrito, sesionDispositivoId, onRemover, onActualizar, onVolver, onPedir, onIrPago, pedidoEnviado, paneraAceptada, paneraConfig, esModoStaff }: CarritoViewProps) {
  const miCarrito = carrito.filter((i: ItemPedido) => i.dispositivo_id === sesionDispositivoId)
  const otros = carrito.filter((i: ItemPedido) => i.dispositivo_id !== sesionDispositivoId)
  const miTotal = miCarrito.reduce((acc: number, i: ItemPedido) => acc + i.precio_unitario * i.cantidad, 0)
  const totalMesa = carrito.reduce((acc: number, i: ItemPedido) => acc + i.precio_unitario * i.cantidad, 0)
  const opcionPanera = paneraConfig.opciones.find(opcion => opcion.id === paneraAceptada)
  const paneraExtra = opcionPanera ? opcionPanera.precio : 0

  if (pedidoEnviado) return <div className="mesa-success-state"><div className="fade-in"><span><ChefHat size={30} /></span><h2>Pedido enviado</h2><p>La orden ya está en camino a la cocina.</p></div></div>

  return (
    <div className="mesa-subview">
      <div className="mesa-subview__header">
        <button type="button" onClick={onVolver}><ArrowLeft size={16} />Carta</button>
        <div><p className="eyebrow">PEDIDO DE LA MESA</p><h2>{esModoStaff ? 'Pedido para la mesa' : 'Tu selección'}</h2></div>
      </div>
      {opcionPanera && <div className="mesa-order-addon"><Wheat size={17} /><span>{opcionPanera.nombre}</span><strong>{paneraExtra > 0 ? formatPrecio(paneraExtra) : 'Sin cargo'}</strong></div>}
      {carrito.length === 0 && !opcionPanera && <div className="mesa-empty-selection"><ShoppingBag size={24} /><h3>Tu selección está vacía</h3><p>{esModoStaff ? 'Elegí platos de la carta para agregarlos al pedido.' : 'Volvé a la carta y elegí algo para disfrutar.'}</p></div>}
      {miCarrito.length > 0 && <>{!esModoStaff && <p style={{ fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Tu pedido</p>}{miCarrito.map((item: ItemPedido) => <ItemRow key={item.id} item={item} onRemover={onRemover} onActualizar={onActualizar} />)}</>}
      {otros.length > 0 && <><p style={{ fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '16px 0 10px' }}>Otros comensales</p>{otros.map((item: ItemPedido) => <div key={item.id} className="mesa-cart-item mesa-cart-item--muted"><DishMedia plato={item.plato} className="mesa-cart-item__media" /><span className="mesa-cart-item__guest">{item.cantidad}× {item.plato.nombre}</span><span className="mesa-cart-item__guest-price">{formatPrecio(item.precio_unitario * item.cantidad)}</span></div>)}</>}
      {(carrito.length > 0 || opcionPanera) && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #2A2A2A' }}>
          {!esModoStaff && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: 13, color: '#707070' }}>Tu cuenta</span><span style={{ fontSize: 14, fontWeight: 600 }}>{formatPrecio(miTotal + paneraExtra)}</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}><span style={{ fontSize: 14, fontWeight: 600 }}>Total mesa</span><span style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold)' }}>{formatPrecio(totalMesa + paneraExtra)}</span></div>
          {carrito.length > 0 && <button onClick={onPedir} className="mesa-primary-cta mesa-primary-cta--spaced">Confirmar {carrito.length > 0 ? 'esta ronda' : 'pedido'} a cocina</button>}
          {!esModoStaff && <button onClick={onIrPago} className="mesa-secondary-cta">Ir a pagar</button>}
        </div>
      )}
    </div>
  )
}

function ItemRow({ item, onRemover, onActualizar }: { item: ItemPedido; onRemover: (id: string) => void; onActualizar: (id: string, c: number) => void }) {
  const nombresRemovidos = item.plato.ingredientes.filter(ingrediente => item.ingredientes_removidos.includes(ingrediente.id)).map(ingrediente => ingrediente.nombre)
  const opciones = item.plato.modificadores.flatMap(modificador => modificador.opciones).filter(opcion => item.modificadores_elegidos.includes(opcion.id))
  return (
    <article className="mesa-cart-item">
      <DishMedia plato={item.plato} className="mesa-cart-item__media" />
      <div className="mesa-cart-item__content">
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{item.plato.nombre}</p>
        {nombresRemovidos.length > 0 && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#EF4444' }}>Sin: {nombresRemovidos.join(', ')}</p>}
        {opciones.length > 0 && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#8b6b24' }}>{opciones.map(opcion => opcion.nombre).join(' · ')}</p>}
        {item.notas && <p style={{ alignItems: 'center', color: '#707070', display: 'flex', fontSize: 11, gap: 4, margin: '2px 0 0' }}><MessageSquareText size={11} />{item.notas}</p>}
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--gold)', fontWeight: 600 }}>{formatPrecio(item.precio_unitario * item.cantidad)}</p>
      </div>
      <div className="mesa-cart-item__controls">
        <button type="button" onClick={() => onActualizar(item.id, item.cantidad - 1)} aria-label={`Quitar una unidad de ${item.plato.nombre}`}><Minus size={14} /></button>
        <span>{item.cantidad}</span>
        <button type="button" onClick={() => onActualizar(item.id, item.cantidad + 1)} aria-label={`Agregar una unidad de ${item.plato.nombre}`}><Plus size={14} /></button>
        <button type="button" className="mesa-cart-item__remove" onClick={() => onRemover(item.id)} aria-label={`Eliminar ${item.plato.nombre}`}><Trash2 size={16} /></button>
      </div>
    </article>
  )
}

interface PagoViewProps {
  pedidos: Pedido[]
  propinaConfig: PropinaConfig
  pagoCompletado: boolean
  setPagoCompletado: Dispatch<SetStateAction<boolean>>
  onVolver: () => void
  sesionDispositivoId: string
  mesaId: string
  mesaNumero: number
  config: ConfigRestaurante
  marcarComoPagado: (mesaId: string, metodo: MetodoPago, propina: number, email: string) => void
  registrarPagoParcial: (mesaId: string, monto: number, propina: number, metodo: MetodoPago, email: string) => { saldado: boolean; restante: number }
  yaAportado: number
  prepararPagoManual: (mesaId: string, propina: number, email: string) => void
  setModoPostPago: () => void
  irAResenas: () => void
  onLlamarMozo: (motivo: string) => void
  emailPago: string
  setEmailPago: Dispatch<SetStateAction<string>>
  /** Suma los puntos del consumo a la cuenta del comensal, si tiene una. */
  acreditarPuntos: (monto: number) => void
}

function PagoView({ pedidos, propinaConfig, pagoCompletado, setPagoCompletado, onVolver, sesionDispositivoId, mesaId, mesaNumero, config, marcarComoPagado, registrarPagoParcial, yaAportado, prepararPagoManual, setModoPostPago, irAResenas, onLlamarMozo, emailPago, setEmailPago, acreditarPuntos }: PagoViewProps) {
  const todosItems: ItemPedido[] = pedidos.flatMap(pedido => pedido.items)
  const misItems = todosItems.filter((i: ItemPedido) => i.dispositivo_id === sesionDispositivoId)
  const totalGeneral = todosItems.reduce((acc: number, i: ItemPedido) => acc + i.precio_unitario * i.cantidad, 0)
  const miTotal = misItems.reduce((acc: number, i: ItemPedido) => acc + i.precio_unitario * i.cantidad, 0)
  const restanteMesa = Math.max(0, totalGeneral - yaAportado)

  const [metodoPago, setMetodoPago] = useState<'total' | 'dividido' | 'partes' | null>(null)
  const [partes, setPartes] = useState(2)
  const [propinaPct, setPropinaPct] = useState<number | null>(null)
  const [propinaCustomPct, setPropinaCustomPct] = useState('')
  const [propinaCustomMonto, setPropinaCustomMonto] = useState('')
  const [modoPropinaCustom, setModoPropinaCustom] = useState<'pct' | 'monto' | null>(null)
  const [emailError, setEmailError] = useState('')
  const [mostrarMPCheckout, setMostrarMPCheckout] = useState(false)
  const [procesandoMP, setProcesandoMP] = useState(false)
  const [cargandoMP, setCargandoMP] = useState(false)
  const [mpEsDemo, setMpEsDemo] = useState(false)
  const [mostrarTransferencia, setMostrarTransferencia] = useState(false)
  const [aporteRegistrado, setAporteRegistrado] = useState<number | null>(null)

  const baseCalculo = metodoPago === 'dividido'
    ? miTotal
    : metodoPago === 'partes'
      ? Math.round(totalGeneral / Math.max(1, partes))
      : totalGeneral
  const propinaMonto = modoPropinaCustom === 'monto' ? (parseFloat(propinaCustomMonto) || 0)
    : modoPropinaCustom === 'pct' ? Math.round(baseCalculo * (parseFloat(propinaCustomPct) || 0) / 100)
    : propinaPct ? Math.round(baseCalculo * propinaPct / 100) : 0
  const montoFinal = baseCalculo + propinaMonto

  if (pagoCompletado) return (
    <div className="mesa-success-state">
      <div className="fade-in">
        <span><CheckCircle2 size={30} /></span>
        <h2>Pago confirmado</h2>
        <p>El eco-ticket fue enviado a<br /><strong>{emailPago}</strong></p>
      </div>
    </div>
  )

  if (aporteRegistrado !== null) return (
    <div className="mesa-success-state">
      <div className="fade-in">
        <span><CheckCircle2 size={30} /></span>
        <h2>Tu parte está paga</h2>
        <p>Registramos tu aporte y te enviamos el comprobante a <strong>{emailPago}</strong>.</p>
        <p className="mesa-success-state__balance">Falta {formatPrecio(aporteRegistrado)} para cerrar la cuenta de la mesa.</p>
        <button type="button" className="mesa-secondary-cta" onClick={() => { setAporteRegistrado(null); onVolver() }}>Volver a la carta</button>
      </div>
    </div>
  )

  // Pagar "todo" cierra la cuenta; pagar la parte propia o una fracción es un
  // aporte que se acumula y sólo cierra la mesa cuando cubre el total.
  const esPagoParcial = metodoPago === 'dividido' || metodoPago === 'partes'

  const aplicarPago = (metodo: MetodoPago) => {
    // Los puntos se acreditan sobre lo que efectivamente paga esta persona, así
    // que en una cuenta dividida cada comensal suma por su propio aporte.
    acreditarPuntos(baseCalculo)
    if (!esPagoParcial) {
      marcarComoPagado(mesaId, metodo, propinaMonto, emailPago)
      return { saldado: true, restante: 0 }
    }
    return registrarPagoParcial(mesaId, baseCalculo, propinaMonto, metodo, emailPago)
  }

  const validarYContinuar = async (metodo: MetodoPago) => {
    if (!emailPago.trim() || !validarEmail(emailPago)) { setEmailError('Ingresá un email válido para recibir tu eco-ticket'); return }
    setEmailError('')
    if (metodo === 'mercadopago') {
      setCargandoMP(true)
      try {
        const res = await fetch(withBasePath('/api/mercadopago/crear-preferencia'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ monto: montoFinal, descripcion: `Mesa ${mesaNumero}`, mesa_id: mesaId, mesa_numero: mesaNumero, propina: propinaMonto, email: emailPago, parcial: esPagoParcial ? baseCalculo : 0 }),
        })
        const data = await res.json() as PreferenciaPagoResponse
        if (!data.demo && data.init_point) {
          // Pago real: salimos de la app hacia el checkout oficial de Mercado Pago.
          window.location.assign(data.init_point)
          return
        }
        // Sin Access Token configurado en el servidor → checkout de demostración.
        setMpEsDemo(true)
        setMostrarMPCheckout(true)
      } catch {
        setMpEsDemo(true)
        setMostrarMPCheckout(true)
      } finally {
        setCargandoMP(false)
      }
    }
    else if (metodo === 'transferencia') setMostrarTransferencia(true)
    else {
      prepararPagoManual(mesaId, propinaMonto, emailPago)
      onLlamarMozo(`Quiere pagar con ${metodo === 'tarjeta' ? 'tarjeta (POS)' : 'efectivo'} — Total: ${formatPrecio(montoFinal)}`)
    }
  }

  // Sólo pasa a modo post-pago (carta de sólo lectura + reseñas) quien cerró la
  // cuenta: si todavía falta que aporten otros comensales, esta persona ve el
  // saldo restante y puede seguir en la mesa.
  const cerrarFlujoDePago = (resultado: { saldado: boolean; restante: number }) => {
    if (resultado.saldado) {
      setModoPostPago()
      setPagoCompletado(true)
      setTimeout(() => irAResenas(), 1600)
    } else {
      setAporteRegistrado(resultado.restante)
    }
  }

  const finalizarPagoMPDemo = () => {
    setProcesandoMP(true)
    setTimeout(() => {
      const resultado = aplicarPago('mercadopago')
      setProcesandoMP(false)
      setMostrarMPCheckout(false)
      cerrarFlujoDePago(resultado)
    }, 1800)
  }

  const confirmarTransferenciaHecha = () => {
    const resultado = aplicarPago('transferencia')
    setMostrarTransferencia(false)
    cerrarFlujoDePago(resultado)
  }

  return (
    <div className="mesa-subview mesa-payment">
      <div className="mesa-subview__header">
        <button type="button" onClick={onVolver}><ArrowLeft size={16} />Volver</button>
        <div><p className="eyebrow">CIERRE DE LA EXPERIENCIA</p><h2>Pagar cuenta</h2></div>
      </div>

      {todosItems.length === 0 ? <div className="mesa-empty-selection"><ReceiptText size={24} /><h3>No hay consumos pendientes</h3><p>Cuando envíes un pedido a cocina, su resumen aparecerá acá.</p></div> : (
        <>
          <div className="premium-card mesa-payment-summary">
            <p style={{ fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Resumen ({pedidos.length} ronda{pedidos.length > 1 ? 's' : ''})</p>
            {todosItems.map((item: ItemPedido) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #1C1C1C', fontSize: 13 }}>
                <span style={{ color: item.dispositivo_id === sesionDispositivoId ? '#fff' : '#707070' }}>{item.cantidad}× {item.plato.nombre}{item.dispositivo_id === sesionDispositivoId ? <span style={{ color: 'var(--gold)', fontSize: 10 }}> (tuyo)</span> : ''}</span>
                <span style={{ color: '#A0A0A0' }}>{formatPrecio(item.precio_unitario * item.cantidad)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontWeight: 700, fontSize: 15 }}><span>Subtotal</span><span style={{ color: 'var(--gold)' }}>{formatPrecio(totalGeneral)}</span></div>
            {yaAportado > 0 && (
              <div className="mesa-payment-summary__balance">
                <span>Ya aportaron otros comensales</span><b>−{formatPrecio(yaAportado)}</b>
                <span>Falta para cerrar la mesa</span><b>{formatPrecio(restanteMesa)}</b>
              </div>
            )}
          </div>

          <p className="mesa-field-label">¿Cómo dividís la cuenta?</p>
          <div className="mesa-payment-options">
            {[
              { v: 'total', l: 'Pagar todo', s: formatPrecio(totalGeneral), Icon: WalletCards },
              { v: 'dividido', l: 'Solo lo mío', s: formatPrecio(miTotal), Icon: UserRound },
              { v: 'partes', l: 'En partes iguales', s: `${formatPrecio(Math.round(totalGeneral / Math.max(1, partes)))} c/u`, Icon: Users },
            ].map(o => (
              <button type="button" key={o.v} className={metodoPago === o.v ? 'active' : ''} onClick={() => setMetodoPago(o.v as 'total' | 'dividido' | 'partes')} aria-pressed={metodoPago === o.v}>
                <o.Icon size={18} />
                <p>{o.l}</p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#707070' }}>{o.s}</p>
              </button>
            ))}
          </div>

          {metodoPago === 'partes' && (
            <div className="mesa-split-control fade-in">
              <div>
                <p className="mesa-field-label" style={{ margin: 0 }}>¿Entre cuántas personas?</p>
                <small>Cada persona paga su parte desde su propio teléfono.</small>
              </div>
              <div className="mesa-split-stepper">
                <button type="button" onClick={() => setPartes(valor => Math.max(2, valor - 1))} aria-label="Una persona menos" disabled={partes <= 2}><Minus size={16} /></button>
                <strong aria-live="polite">{partes}</strong>
                <button type="button" onClick={() => setPartes(valor => Math.min(20, valor + 1))} aria-label="Una persona más" disabled={partes >= 20}><Plus size={16} /></button>
              </div>
            </div>
          )}

          {metodoPago && propinaConfig.habilitada && (
            <div className="fade-in" style={{ marginBottom: 20 }}>
              <p className="mesa-field-label"><Sparkles size={14} />¿Agregás propina?</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {propinaConfig.opciones.map((pct: number) => (
                  <button key={pct} onClick={() => { setPropinaPct(pct); setModoPropinaCustom(null) }} style={{ flex: 1, padding: '12px 4px', borderRadius: 12, cursor: 'pointer', background: propinaPct === pct && !modoPropinaCustom ? 'rgba(212,175,55,0.15)' : '#141414', border: propinaPct === pct && !modoPropinaCustom ? '1px solid rgba(212,175,55,0.4)' : '1px solid #2A2A2A' }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: propinaPct === pct && !modoPropinaCustom ? 'var(--gold)' : '#fff' }}>{pct}%</p>
                    <p style={{ margin: '2px 0 0', fontSize: 10, color: '#707070' }}>{formatPrecio(Math.round(baseCalculo * pct / 100))}</p>
                  </button>
                ))}
                <button onClick={() => { setPropinaPct(0); setModoPropinaCustom(null) }} style={{ flex: 1, padding: '12px 4px', borderRadius: 12, cursor: 'pointer', background: propinaPct === 0 && !modoPropinaCustom ? 'rgba(212,175,55,0.15)' : '#141414', border: propinaPct === 0 && !modoPropinaCustom ? '1px solid rgba(212,175,55,0.4)' : '1px solid #2A2A2A' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#707070' }}>Sin propina</p>
                </button>
              </div>
              {propinaConfig.permitir_personalizado && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setModoPropinaCustom(modoPropinaCustom === 'pct' ? null : 'pct')} style={{ flex: 1, padding: '9px', borderRadius: 10, background: modoPropinaCustom === 'pct' ? 'rgba(212,175,55,0.1)' : '#1C1C1C', border: modoPropinaCustom === 'pct' ? '1px solid rgba(212,175,55,0.3)' : '1px solid #2A2A2A', color: '#A0A0A0', fontSize: 12, cursor: 'pointer' }}>% personalizado</button>
                  <button onClick={() => setModoPropinaCustom(modoPropinaCustom === 'monto' ? null : 'monto')} style={{ flex: 1, padding: '9px', borderRadius: 10, background: modoPropinaCustom === 'monto' ? 'rgba(212,175,55,0.1)' : '#1C1C1C', border: modoPropinaCustom === 'monto' ? '1px solid rgba(212,175,55,0.3)' : '1px solid #2A2A2A', color: '#A0A0A0', fontSize: 12, cursor: 'pointer' }}>Monto fijo</button>
                </div>
              )}
              {modoPropinaCustom === 'pct' && <input type="number" value={propinaCustomPct} onChange={e => setPropinaCustomPct(e.target.value)} placeholder="Ej: 12" className="input-premium" style={{ marginTop: 8 }} />}
              {modoPropinaCustom === 'monto' && <input type="number" value={propinaCustomMonto} onChange={e => setPropinaCustomMonto(e.target.value)} placeholder="Ej: 1000" className="input-premium" style={{ marginTop: 8 }} />}
            </div>
          )}

          {metodoPago && (
            <div className="fade-in" style={{ marginBottom: 20 }}>
              <p className="mesa-field-label"><ReceiptText size={14} />Tu email para el eco-ticket</p>
              <input type="email" value={emailPago} onChange={e => { setEmailPago(e.target.value); setEmailError('') }} placeholder="tu@email.com" className="input-premium" />
              {emailError && <p style={{ color: '#EF4444', fontSize: 11, margin: '6px 0 0' }}>{emailError}</p>}
            </div>
          )}

          {metodoPago && (
            <>
              <div style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 14, padding: 14, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#A0A0A0', marginBottom: 4 }}><span>{metodoPago === 'partes' ? `Tu parte (1 de ${partes})` : metodoPago === 'dividido' ? 'Tu consumo' : 'Subtotal'}</span><span>{formatPrecio(baseCalculo)}</span></div>
                {propinaMonto > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#A0A0A0', marginBottom: 8 }}><span>Propina</span><span>{formatPrecio(propinaMonto)}</span></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(212,175,55,0.2)', paddingTop: 8 }}>
                  <span style={{ fontSize: 15 }}>Total a pagar</span>
                  <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)' }}>{formatPrecio(montoFinal)}</span>
                </div>
              </div>

              <p className="mesa-field-label">Elegí cómo pagar</p>
              <button type="button" className="mesa-payment-method mesa-payment-method--primary" onClick={() => validarYContinuar('mercadopago')} disabled={cargandoMP}>
                <WalletCards size={19} /><span><b>{cargandoMP ? 'Conectando con Mercado Pago…' : 'Pagar con Mercado Pago'}</b><small>Pago digital inmediato</small></span>
              </button>
              <button type="button" className="mesa-payment-method" onClick={() => validarYContinuar('transferencia')}>
                <Landmark size={19} /><span><b>Transferencia bancaria</b><small>Copiá los datos de la sucursal</small></span>
              </button>
              <button type="button" className="mesa-payment-method" onClick={() => validarYContinuar('tarjeta')}>
                <CreditCard size={19} /><span><b>Tarjeta o efectivo</b><small>El mozo se acerca con el POS o la cuenta</small></span>
              </button>
              <p style={{ textAlign: 'center', fontSize: 11, color: '#484848', marginTop: 8 }}>Tarjeta y efectivo requieren la validación de un mozo, para tu seguridad y la del local.</p>
            </>
          )}
        </>
      )}

      <MenuActionDialog
        open={mostrarMPCheckout}
        onClose={() => { if (!procesandoMP) setMostrarMPCheckout(false) }}
        Icon={WalletCards}
        eyebrow="PAGO DIGITAL"
        title={`Mercado Pago${mpEsDemo ? ' · demostración' : ''}`}
        description={procesandoMP ? 'Estamos procesando el pago de forma segura.' : `Total a pagar: ${formatPrecio(montoFinal)}`}
        tone="green"
        footer={!procesandoMP ? <button type="button" className="menu-dialog-button menu-dialog-button--primary" onClick={finalizarPagoMPDemo}>Confirmar pago de {formatPrecio(montoFinal)}</button> : undefined}
      >
        {procesandoMP ? <div className="menu-payment-loading"><span className="menu-spinner" /><p>Procesando tu pago…</p></div> : (
          <>
            {mpEsDemo && <div className="menu-inline-notice"><ShieldCheck size={17} /><p><b>Entorno de demostración</b><span>No se realizará un cobro real hasta configurar MP_ACCESS_TOKEN en el servidor.</span></p></div>}
            <div className="menu-payment-methods-preview">
              {[{ label: 'Tarjeta de crédito', Icon: CreditCard }, { label: 'Tarjeta de débito', Icon: CreditCard }, { label: 'Dinero en cuenta', Icon: WalletCards }, { label: 'Billetera digital', Icon: ShieldCheck }].map(method => <div key={method.label}><method.Icon size={16} /><span>{method.label}</span></div>)}
            </div>
          </>
        )}
      </MenuActionDialog>

      <MenuActionDialog
        open={mostrarTransferencia}
        onClose={() => setMostrarTransferencia(false)}
        Icon={Landmark}
        eyebrow="TRANSFERENCIA BANCARIA"
        title={`Transferí ${formatPrecio(montoFinal)}`}
        description="Usá los datos de la sucursal. El personal verificará la acreditación."
        tone="gold"
        footer={<button type="button" className="menu-dialog-button menu-dialog-button--primary" onClick={confirmarTransferenciaHecha}>Ya realicé la transferencia</button>}
      >
        <div className="menu-bank-details">
          {[['Titular', config.cbu_titular || 'A configurar'], ['Alias', config.alias || 'A configurar'], ['CBU/CVU', config.cbu || config.cvu || 'A configurar']].map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}
        </div>
      </MenuActionDialog>
    </div>
  )
}

interface ReviewsViewProps {
  pedidos: Pedido[]
  resenasEnviadas: Record<string, boolean>
  reviewPlatos: ReviewDraft
  setReviewPlatos: Dispatch<SetStateAction<ReviewDraft>>
  onEnviar: () => void
  fidelidadHabilitado: boolean
  puntosPorResena: number
  onVolver: () => void
}

function ReviewsView({ pedidos, resenasEnviadas, reviewPlatos, setReviewPlatos, onEnviar, fidelidadHabilitado, puntosPorResena, onVolver }: ReviewsViewProps) {
  const platosUnicos = [...new Map(
    pedidos
      .flatMap(pedido => pedido.items.map(item => ({ pedidoId: pedido.id, plato: item.plato })))
      .filter(({ pedidoId, plato }: { pedidoId: string; plato: Plato }) => !resenasEnviadas[`${pedidoId}:${plato.id}`])
      .map(({ plato }: { plato: Plato }) => [plato.id, plato]),
  ).values()] as Plato[]

  if (platosUnicos.length === 0) return (
    <div className="mesa-review-empty">
      <span><Check size={24} /></span>
      <h2>{pedidos.length ? 'Reseñas al día' : 'Pago pendiente de confirmación'}</h2>
      <p>{pedidos.length ? 'Ya calificaste todos los productos de esta cuenta.' : 'Cuando el pago quede confirmado vas a poder reseñar únicamente los platos de tu pedido.'}</p>
      <button type="button" className="btn-gold" onClick={onVolver}>Volver a la carta</button>
    </div>
  )

  return (
    <div className="mesa-reviews">
      <div className="mesa-reviews__header">
        <span><Sparkles size={24} /></span>
        <h2>¿Cómo estuvo?</h2>
        <p>Puntuá y contanos tu experiencia con cada plato.</p>
      </div>
      {platosUnicos.map(plato => {
        const val = reviewPlatos[plato.id] || { rating: 0, comentario: '' }
        return (
          <div key={plato.id} className="premium-card" style={{ borderRadius: 14, padding: 16, marginBottom: 12 }}>
            <p style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 600 }}>{plato.nombre}</p>
            <div className="mesa-review-input" role="radiogroup" aria-label={`Puntuación de ${plato.nombre}`}>
              {[1, 2, 3, 4, 5].map(star => (
                <button type="button" role="radio" aria-checked={val.rating === star} aria-label={`${star} de 5 estrellas`} key={star} onClick={() => setReviewPlatos(prev => ({ ...prev, [plato.id]: { ...val, rating: star } }))} className={val.rating >= star ? 'active' : ''}><Star size={28} fill="currentColor" /></button>
              ))}
            </div>
            {val.rating > 0 && (
              <textarea value={val.comentario} onChange={event => setReviewPlatos(prev => ({ ...prev, [plato.id]: { ...val, comentario: event.target.value } }))} placeholder="Contanos qué te pareció (opcional)..." rows={2} className="input-premium" style={{ resize: 'none' }} />
            )}
          </div>
        )
      })}
      {fidelidadHabilitado && (
        <div className="mesa-loyalty-note">
          <Sparkles size={16} /><p>Ganás <strong>+{puntosPorResena} puntos</strong> de fidelidad al enviar tu reseña.</p>
        </div>
      )}
      <button onClick={onEnviar} className="btn-gold" style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', fontSize: 15, cursor: 'pointer', marginTop: 8 }}>Publicar reseñas verificadas</button>
      <button onClick={onVolver} style={{ width: '100%', padding: 12, borderRadius: 14, border: 'none', background: 'transparent', color: '#707070', fontSize: 14, cursor: 'pointer', marginTop: 8 }}>Ahora no</button>
    </div>
  )
}

function NavItem({ label, Icon, active, onClick, badge = 0, disabled = false, gold = false, buttonRef, className = '' }: {
  label: string
  Icon: typeof BookOpen
  active: boolean
  onClick: () => void
  badge?: number
  disabled?: boolean
  gold?: boolean
  buttonRef?: Ref<HTMLButtonElement>
  className?: string
}) {
  return (
    <button ref={buttonRef} type="button" className={`${active ? 'active' : ''}${gold ? ' gold' : ''}${className ? ` ${className}` : ''}`} onClick={disabled ? undefined : onClick} disabled={disabled} aria-current={active ? 'page' : undefined}>
      <span>
        <Icon size={20} />
        {badge > 0 && <b>{badge}</b>}
      </span>
      <small>{label}</small>
    </button>
  )
}
