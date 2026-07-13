'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import { Plato, ItemPedido, Ingrediente, MetodoPago } from '@/types'
import { formatPrecio, tiempoTranscurrido, validarEmail } from '@/lib/utils'
import PlatoImg from '@/components/PlatoImg'

type VistaAll = 'menu' | 'carrito' | 'pago' | 'reviews'

export default function MesaPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const esModoStaff = searchParams.get('staff') === 'true'
  const mesaId = params.id as string
  const { sesion, esStaff, mesas, carrito, pedidos, platos, config, categoriasDisponibles, initStore, iniciarSesionMesa, iniciarSesionStaff, abandonarMesa, confirmarPedido, marcarComoPagado, setModoPostPago, agregarAlCarrito, quitarDelCarrito, actualizarCantidad, setPaneraAceptada, panera_aceptada, llamarMozo, propinaConfig, paneraPromptShown, fidelidadConfig, puntosClientes, enviarResena } = useStore()

  const mesa = mesas.find(m => m.id === mesaId)
  const [vista, setVista] = useState<VistaAll>('menu')
  const [categoriaActiva, setCategoriaActiva] = useState('todos')
  const [filtros, setFiltros] = useState<string[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [mostrarBusqueda, setMostrarBusqueda] = useState(false)
  const [platoActivo, setPlatoActivo] = useState<Plato | null>(null)
  const [ingRemovidos, setIngRemovidos] = useState<string[]>([])
  const [notas, setNotas] = useState('')
  const [mostrarNutri, setMostrarNutri] = useState(false)
  const [mostrarReviews, setMostrarReviews] = useState(false)
  const [confirmandoAbandono, setConfirmandoAbandono] = useState(false)
  const [pedidoEnviado, setPedidoEnviado] = useState(false)
  const [pagoCompletado, setPagoCompletado] = useState(false)
  const [reviewPlatos, setReviewPlatos] = useState<Record<string, { rating: number; comentario: string }>>({})
  const [emailPago, setEmailPago] = useState('')
  const [toast, setToast] = useState('')
  const [mostrarPanera, setMostrarPanera] = useState(false)
  const [mostrarLlamarMozo, setMostrarLlamarMozo] = useState(false)
  const [verificandoMP, setVerificandoMP] = useState(false)
  const toastRef = useRef<NodeJS.Timeout | null>(null)

  const pedidosMesa = pedidos.filter(p => p.mesa_id === mesaId && p.estado !== 'cancelado')
  const pedidosEnCocina = pedidosMesa.filter(p => ['en_cocina', 'entregado'].includes(p.estado))
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
      if (config.panera.habilitada && !paneraPromptShown[mesaId]) setTimeout(() => setMostrarPanera(true), 800)
    }
    const timer = (!yaHayPedido && !esModoStaff) ? setTimeout(() => { router.push('/vista') }, 15 * 60 * 1000) : null
    return () => { if (timer) clearTimeout(timer) }
    // eslint-disable-next-line
  }, [mesaId, esModoStaff])

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
      showToast(mpStatus === 'pending' ? 'Tu pago está pendiente de acreditación' : 'El pago no se completó — podés reintentar')
      router.replace(`/mesa/${mesaId}`)
      return
    }

    setVerificandoMP(true)
    const propinaUrl = parseFloat(searchParams.get('propina') || '0') || 0
    const emailUrl = searchParams.get('email') || ''

    fetch(`/api/mercadopago/verificar-pago?payment_id=${paymentId}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.aprobado) {
          marcarComoPagado(mesaId, 'mercadopago', propinaUrl, emailUrl)
          setModoPostPago()
          setPagoCompletado(true)
          setVista('reviews')
          showToast('✅ Pago verificado con Mercado Pago')
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
    if (opcion && opcion.precio > 0) showToast(`${opcion.nombre} agregada (${formatPrecio(opcion.precio)}) ✓`)
    else if (opcion) showToast(`${opcion.nombre} ✓`)
  }

  const toggleFiltro = (f: string) => setFiltros(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])
  const toggleIng = (ing: Ingrediente) => { if (!ing.removible) return; setIngRemovidos(prev => prev.includes(ing.id) ? prev.filter(x => x !== ing.id) : [...prev, ing.id]) }
  const abrirDetalle = (plato: Plato) => { setPlatoActivo(plato); setIngRemovidos([]); setNotas(''); setMostrarNutri(false); setMostrarReviews(false) }

  const handleAgregarAlCarrito = (plato: Plato) => {
    if (esPostPago || sesion?.modo === 'curioso') { showToast('No podés agregar platos en este modo'); return }
    agregarAlCarrito(plato, ingRemovidos, notas)
    setPlatoActivo(null)
    showToast(`${plato.nombre} agregado ✓`)
  }

  const handleConfirmarPedido = () => {
    if (carrito.length === 0) return
    const pedido = confirmarPedido(panera_aceptada)
    if (pedido) { setPedidoEnviado(true); showToast(esModoStaff ? '¡Pedido enviado a cocina! 🍳' : '¡Pedido enviado a cocina! 🍳'); setTimeout(() => { setPedidoEnviado(false); setVista('menu') }, 2600) }
  }

  const handleAbandonarMesa = () => { if (yaHayPedido) { showToast('Hay pedido activo. Avisá al personal.'); return }; abandonarMesa(); router.push('/vista') }

  const handleLlamarMozo = (motivo: string) => {
    llamarMozo(mesaId, mesaNumero, motivo)
    setMostrarLlamarMozo(false)
    showToast('🔔 El mozo fue notificado')
  }

  const handleEnviarResenas = () => {
    Object.entries(reviewPlatos).forEach(([platoId, r]) => {
      if (r.rating > 0) enviarResena(platoId, r.rating, r.comentario, emailPago)
    })
    const puntos = fidelidadConfig.habilitado && emailPago ? (puntosClientes[emailPago.toLowerCase()] || 0) : 0
    showToast(fidelidadConfig.habilitado ? `¡Gracias! 🙏 Ahora tenés ${puntos} puntos` : '¡Gracias por tus reseñas! 🙏')
    setTimeout(() => setVista('menu'), 2200)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', paddingBottom: 90 }}>
      {toast && <div className="fade-in" style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', background: '#1C1C1C', border: '1px solid #383838', borderRadius: 100, padding: '10px 20px', fontSize: 13, color: '#fff', zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>{toast}</div>}

      {verificandoMP && (
        <div className="overlay" style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, border: '4px solid #2A2A2A', borderTopColor: 'var(--gold)', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
            <style>{'@keyframes spin { to { transform: rotate(360deg) } }'}</style>
            <p style={{ color: '#fff', fontSize: 14 }}>Verificando tu pago con Mercado Pago...</p>
          </div>
        </div>
      )}

      {esModoStaff && (
        <div style={{ background: 'rgba(59,130,246,0.12)', borderBottom: '1px solid rgba(59,130,246,0.3)', padding: '8px 16px', textAlign: 'center' }}>
          <span style={{ fontSize: 12, color: '#3B82F6', fontWeight: 600 }}>🧑‍💼 Modo Staff — pedido en nombre de Mesa {mesaNumero}</span>
        </div>
      )}

      {mostrarPanera && (
        <div className="overlay" style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="fade-in" style={{ background: '#1C1C1C', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 24, padding: 28, width: '100%', maxWidth: 340 }}>
            <p style={{ fontSize: 44, margin: '0 0 10px', textAlign: 'center' }}>🥖</p>
            <h2 className="font-titulos" style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 700, textAlign: 'center' }}>¡Bienvenidos!</h2>
            <p style={{ margin: '0 0 18px', fontSize: 14, color: '#A0A0A0', textAlign: 'center' }}>{config.panera.titulo}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {config.panera.opciones.map(op => (
                <button key={op.id} onClick={() => handlePanera(op.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', borderRadius: 14, background: '#1C1C1C', border: '1px solid #2A2A2A', color: '#fff', fontSize: 14, cursor: 'pointer', textAlign: 'left' }}>
                  <span>{op.nombre}</span>
                  <span style={{ color: op.precio > 0 ? 'var(--gold)' : '#22C55E', fontWeight: 700, fontSize: 13, flexShrink: 0, marginLeft: 10 }}>{op.precio > 0 ? formatPrecio(op.precio) : 'Gratis'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ background: 'var(--bg)', borderBottom: '1px solid #1C1C1C', padding: '14px 16px', position: 'sticky', top: esModoStaff ? 34 : 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: mostrarBusqueda ? 10 : 0 }}>
          <div>
            <h1 className="font-titulos" style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{config.nombre}</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#707070', marginTop: 2 }}>Mesa {mesaNumero} · {cantPersonas} {cantPersonas === 1 ? 'comensal' : 'comensales'}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {esPostPago ? <Badge color="#22C55E" label="✓ Pagado" /> : yaHayPedido ? <Badge color="#F59E0B" label="● Pedido activo" /> : <Badge color="#EF4444" label="● Activa" />}
            <button onClick={() => setMostrarBusqueda(!mostrarBusqueda)} style={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 10, padding: 8, cursor: 'pointer', fontSize: 16 }}>🔍</button>
          </div>
        </div>
        {mostrarBusqueda && <input autoFocus value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar platos, ingredientes..." className="input-premium" />}
      </div>

      {vista === 'menu' && (
        <>
          <div style={{ padding: '10px 16px 0', display: 'flex', gap: 8, overflowX: 'auto', whiteSpace: 'nowrap' }}>
            {todosLosTags.map(f => <FiltroChip key={f} label={f} active={filtros.includes(f)} onClick={() => toggleFiltro(f)} />)}
          </div>
          <div style={{ padding: '8px 16px', display: 'flex', gap: 8, overflowX: 'auto', whiteSpace: 'nowrap' }}>
            <CatBtn active={categoriaActiva === 'todos'} onClick={() => setCategoriaActiva('todos')} label="🍴 Todos" />
            {categoriasDisponibles.map(c => <CatBtn key={c.id} active={categoriaActiva === c.id} onClick={() => setCategoriaActiva(c.id)} label={`${c.emoji} ${c.nombre}`} />)}
          </div>

          {platosDestacados.length > 0 && categoriaActiva === 'todos' && !busqueda && (
            <div style={{ padding: '0 16px 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 14 }}>⭐</span>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>Recomendaciones del Chef</p>
              </div>
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                {platosDestacados.map(plato => (
                  <div key={plato.id} className="card-hover" onClick={() => abrirDetalle(plato)} style={{ flexShrink: 0, width: 160, background: '#141414', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 14, overflow: 'hidden', cursor: 'pointer' }}>
                    <div style={{ position: 'relative', height: 100 }}>
                      <PlatoImg src={plato.imagen_url} alt={plato.nombre} />
                      <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(212,175,55,0.9)', borderRadius: 100, padding: '2px 7px', fontSize: 9, color: '#000', fontWeight: 700 }}>⭐ CHEF</div>
                    </div>
                    <div style={{ padding: '8px 10px' }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, lineHeight: 1.3, marginBottom: 3 }}>{plato.nombre}</p>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--gold)', fontWeight: 700 }}>{formatPrecio(plato.precio)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ height: 1, background: '#1C1C1C', margin: '12px 0 4px' }} />
            </div>
          )}

          <div style={{ padding: '0 16px' }}>
            {platosFiltrados.length === 0 && <div style={{ textAlign: 'center', padding: '60px 20px', color: '#707070' }}><p style={{ fontSize: 36 }}>🍽️</p><p>Sin resultados</p></div>}
            {platosFiltrados.map(plato => <PlatoCard key={plato.id} plato={plato} onTap={() => abrirDetalle(plato)} />)}
          </div>

          {yaHayPedido && (
            <div style={{ padding: '0 16px', marginBottom: 16 }}>
              <div style={{ background: '#141414', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 14, padding: 16 }}>
                <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#F59E0B' }}>🍳 {pedidosEnCocina.length > 1 ? `${pedidosEnCocina.length} rondas enviadas` : 'Pedido en cocina'}</p>
                {pedidosEnCocina.flatMap(p => p.items).map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#B0B0B0', padding: '3px 0' }}>
                    <span>{item.cantidad}× {item.plato.nombre}{item.dispositivo_id.startsWith('staff') && <span style={{ color: '#3B82F6', fontSize: 10 }}> (mozo)</span>}</span><span>{formatPrecio(item.precio_unitario * item.cantidad)}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #2A2A2A', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#707070' }}>Última ronda {tiempoTranscurrido(pedidosEnCocina[pedidosEnCocina.length - 1]?.created_at)}</span>
                  {!esModoStaff && <button onClick={() => setVista('pago')} style={{ background: 'transparent', border: 'none', color: 'var(--gold)', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>Pagar cuenta →</button>}
                </div>
              </div>
              {!esModoStaff && <p style={{ textAlign: 'center', fontSize: 11, color: '#484848', margin: '8px 0 0' }}>¿Querés pedir algo más? Agregalo cuando quieras — se suma a tu cuenta.</p>}
            </div>
          )}
          {!yaHayPedido && !esPostPago && !esModoStaff && (
            <div style={{ textAlign: 'center', padding: '0 16px 16px' }}>
              <button onClick={() => setConfirmandoAbandono(true)} style={{ background: 'transparent', border: 'none', color: '#707070', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>Abandonar mesa</button>
            </div>
          )}
        </>
      )}

      {vista === 'carrito' && <CarritoView carrito={carrito} sesionDispositivoId={sesion?.dispositivo_id || ''} onRemover={quitarDelCarrito} onActualizar={actualizarCantidad} onVolver={() => setVista('menu')} onPedir={handleConfirmarPedido} onIrPago={() => setVista('pago')} pedidoEnviado={pedidoEnviado} paneraAceptada={panera_aceptada} paneraConfig={config.panera} esModoStaff={esModoStaff} />}
      {vista === 'pago' && !esModoStaff && <PagoView pedidos={pedidosEnCocina} propinaConfig={propinaConfig} pagoCompletado={pagoCompletado} setPagoCompletado={setPagoCompletado} onVolver={() => setVista('menu')} sesionDispositivoId={sesion?.dispositivo_id || ''} mesaId={mesaId} mesaNumero={mesaNumero} config={config} marcarComoPagado={marcarComoPagado} setModoPostPago={setModoPostPago} irAResenas={() => setVista('reviews')} onLlamarMozo={handleLlamarMozo} emailPago={emailPago} setEmailPago={setEmailPago} />}
      {vista === 'reviews' && !esModoStaff && <ReviewsView pedidos={pedidosEnCocina} reviewPlatos={reviewPlatos} setReviewPlatos={setReviewPlatos} onEnviar={handleEnviarResenas} fidelidadHabilitado={fidelidadConfig.habilitado} puntosPorResena={fidelidadConfig.puntos_por_resena} />}

      {vista === 'menu' && !esPostPago && !esModoStaff && (
        <button onClick={() => setMostrarLlamarMozo(true)} style={{ position: 'fixed', bottom: 96, right: 16, width: 52, height: 52, borderRadius: '50%', background: '#1C1C1C', border: '1px solid rgba(212,175,55,0.35)', color: 'var(--gold)', fontSize: 22, cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', zIndex: 90 }}>🔔</button>
      )}

      {vista !== 'pago' && (
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'var(--bg)', borderTop: '1px solid #1C1C1C', display: 'flex', padding: '10px 0 20px', zIndex: 100 }}>
          <NavItem label="Carta" emoji="📋" active={vista === 'menu'} onClick={() => setVista('menu')} />
          <NavItem label={carrito.length > 0 ? `Cocina (${carrito.length})` : 'Cocina'} emoji="🍳" active={vista === 'carrito'} onClick={() => setVista('carrito')} badge={carrito.length} disabled={esPostPago} />
          {yaHayPedido && !esModoStaff && <NavItem label="Pagar" emoji="💳" active={(vista as string) === 'pago'} onClick={() => setVista('pago')} gold />}
        </div>
      )}

      {platoActivo && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setPlatoActivo(null) }} style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div className="slide-up" style={{ width: '100%', maxWidth: 480, margin: '0 auto', background: '#141414', borderRadius: '20px 20px 0 0', maxHeight: '90vh', overflowY: 'auto' }}>
            <DetalleContent plato={platoActivo} ingRemovidos={ingRemovidos} toggleIng={toggleIng} notas={notas} setNotas={setNotas} mostrarNutri={mostrarNutri} setMostrarNutri={setMostrarNutri} mostrarReviews={mostrarReviews} setMostrarReviews={setMostrarReviews} onAgregar={() => handleAgregarAlCarrito(platoActivo)} onMaridar={(m: any) => { const p = platos.find(x => x.id === m.plato_id); if (p) { agregarAlCarrito(p, [], ''); showToast(`${m.nombre} agregado ✓`) } }} onCerrar={() => setPlatoActivo(null)} esPostPago={esPostPago} mostrarNutricion={config.mostrar_nutricion} />
          </div>
        </div>
      )}

      {confirmandoAbandono && (
        <div className="overlay" style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="fade-in" style={{ background: '#1C1C1C', border: '1px solid #383838', borderRadius: 20, padding: 28, width: '100%', maxWidth: 320, textAlign: 'center' }}>
            <p style={{ fontSize: 32, margin: '0 0 12px' }}>🚪</p>
            <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>¿Abandonar mesa?</h3>
            <p style={{ color: '#707070', fontSize: 14, margin: '0 0 24px' }}>Tu sesión se cerrará. No tenés pedidos activos.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmandoAbandono(false)} style={{ flex: 1, padding: 12, borderRadius: 12, background: '#2A2A2A', border: 'none', color: '#fff', cursor: 'pointer' }}>Quedarme</button>
              <button onClick={handleAbandonarMesa} style={{ flex: 1, padding: 12, borderRadius: 12, background: '#EF4444', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Salir</button>
            </div>
          </div>
        </div>
      )}

      {mostrarLlamarMozo && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setMostrarLlamarMozo(false) }} style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="fade-in" style={{ background: '#1C1C1C', border: '1px solid #383838', borderRadius: 20, padding: 24, width: '100%', maxWidth: 320 }}>
            <p style={{ fontSize: 32, margin: '0 0 10px', textAlign: 'center' }}>🔔</p>
            <h3 style={{ margin: '0 0 16px', fontSize: 17, textAlign: 'center' }}>Llamar al mozo</h3>
            {['Necesito ayuda con el pedido', 'Falta algo en la mesa', 'Quiero pagar en efectivo', 'Quiero pagar con tarjeta (POS)', 'Otra consulta'].map(m => (
              <button key={m} onClick={() => handleLlamarMozo(m)} style={{ width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 12, background: '#1C1C1C', border: '1px solid #2A2A2A', color: '#fff', fontSize: 13, cursor: 'pointer', marginBottom: 8 }}>{m}</button>
            ))}
            <button onClick={() => setMostrarLlamarMozo(false)} style={{ width: '100%', padding: 12, borderRadius: 12, background: 'transparent', border: 'none', color: '#707070', fontSize: 13, cursor: 'pointer', marginTop: 4 }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Badge({ color, label }: { color: string; label: string }) {
  return <span style={{ background: `${color}15`, color, border: `1px solid ${color}40`, borderRadius: 100, padding: '4px 10px', fontSize: 11, fontWeight: 500 }}>{label}</span>
}
function CatBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button onClick={onClick} style={{ borderRadius: 100, padding: '6px 14px', fontSize: 13, cursor: 'pointer', flexShrink: 0, background: active ? 'rgba(212,175,55,0.15)' : '#1C1C1C', color: active ? 'var(--gold)' : '#A0A0A0', border: active ? '1px solid rgba(212,175,55,0.4)' : '1px solid #2A2A2A', fontWeight: active ? 600 : 400 }}>{label}</button>
}
function FiltroChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} style={{ borderRadius: 100, padding: '5px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0, background: active ? 'rgba(212,175,55,0.15)' : '#1C1C1C', color: active ? 'var(--gold)' : '#A0A0A0', border: active ? '1px solid rgba(212,175,55,0.4)' : '1px solid #2A2A2A' }}>{label}</button>
}

function PlatoCard({ plato, onTap }: { plato: Plato; onTap: () => void }) {
  return (
    <div className="card-hover premium-card" onClick={onTap} style={{ borderRadius: 16, marginBottom: 12, overflow: 'hidden', cursor: 'pointer' }}>
      <div style={{ position: 'relative', height: 180 }}>
        <PlatoImg src={plato.imagen_url} alt={plato.nombre} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 5, flexWrap: 'wrap', maxWidth: '75%' }}>
          {plato.tags.map(t => <span key={t} style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: 100, padding: '3px 7px', fontSize: 9, backdropFilter: 'blur(4px)', fontWeight: 500 }}>{t}</span>)}
        </div>
        {plato.destacado && <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(212,175,55,0.9)', borderRadius: 100, padding: '3px 8px', fontSize: 10, color: '#000', fontWeight: 700 }}>⭐ CHEF</div>}
        <div style={{ position: 'absolute', bottom: 10, right: 10, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.6)', borderRadius: 100, padding: '3px 8px', backdropFilter: 'blur(4px)' }}>
          <span style={{ fontSize: 11, color: 'var(--gold)' }}>★</span><span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>{plato.rating}</span>
        </div>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, flex: 1, paddingRight: 8, lineHeight: 1.3 }}>{plato.nombre}</h3>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold)', whiteSpace: 'nowrap' }}>{formatPrecio(plato.precio)}</span>
        </div>
        <p style={{ margin: '0 0 10px', fontSize: 12, color: '#707070', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{plato.descripcion}</p>
        <button onClick={e => { e.stopPropagation(); onTap() }} className="btn-gold" style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', fontSize: 13, cursor: 'pointer' }}>+ Agregar a la cocina</button>
      </div>
    </div>
  )
}

function DetalleContent({ plato, ingRemovidos, toggleIng, notas, setNotas, mostrarNutri, setMostrarNutri, mostrarReviews, setMostrarReviews, onAgregar, onMaridar, onCerrar, esPostPago, mostrarNutricion }: any) {
  return (
    <>
      <div style={{ position: 'relative', height: 240, flexShrink: 0 }}>
        <PlatoImg src={plato.imagen_url} alt={plato.nombre} style={{ borderRadius: '20px 20px 0 0' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #141414 0%, transparent 60%)', borderRadius: '20px 20px 0 0' }} />
        <button onClick={onCerrar} style={{ position: 'absolute', top: 14, left: 14, width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ padding: '16px 20px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <h2 className="font-titulos" style={{ margin: 0, fontSize: 22, fontWeight: 700, flex: 1, paddingRight: 12, lineHeight: 1.2 }}>{plato.nombre}</h2>
          <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)' }}>{formatPrecio(plato.precio)}</span>
        </div>
        <button onClick={() => setMostrarReviews(!mostrarReviews)} style={{ display: 'flex', gap: 8, marginBottom: 12, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
          <span style={{ fontSize: 13, color: 'var(--gold)' }}>★ {plato.rating}</span>
          <span style={{ fontSize: 12, color: '#707070', textDecoration: 'underline' }}>({plato.total_reviews} reseñas)</span>
        </button>
        {mostrarReviews && plato.reviews_muestra?.length > 0 && (
          <div className="fade-in" style={{ background: '#1C1C1C', borderRadius: 12, padding: 12, marginBottom: 16 }}>
            {plato.reviews_muestra.map((r: any) => (
              <div key={r.id} style={{ padding: '8px 0', borderBottom: '1px solid #2A2A2A' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#A0A0A0' }}>{r.autor}</span>
                  <span style={{ fontSize: 11, color: 'var(--gold)' }}>{'★'.repeat(r.rating)}</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: '#707070', lineHeight: 1.5 }}>{r.comentario}</p>
              </div>
            ))}
          </div>
        )}
        <p style={{ color: '#A0A0A0', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>{plato.descripcion}</p>

        {plato.modificadores?.map((mod: any) => (
          <div key={mod.id} style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>{mod.nombre} {mod.obligatorio ? '*' : ''}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {mod.opciones.map((op: any) => <button key={op.id} style={{ borderRadius: 100, padding: '6px 14px', fontSize: 13, cursor: 'pointer', background: '#1C1C1C', color: '#fff', border: '1px solid #2A2A2A' }}>{op.nombre}{op.precio_extra > 0 ? ` +${formatPrecio(op.precio_extra)}` : ''}</button>)}
            </div>
          </div>
        ))}

        {plato.ingredientes?.length > 0 && (
          <>
            <p style={{ fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Personalizá · tocá para quitar</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
              {plato.ingredientes.map((ing: Ingrediente) => (
                <button key={ing.id} onClick={() => toggleIng(ing)} style={{ borderRadius: 100, padding: '6px 14px', fontSize: 13, cursor: ing.removible ? 'pointer' : 'default', background: ingRemovidos.includes(ing.id) ? 'rgba(239,68,68,0.12)' : '#1C1C1C', color: ingRemovidos.includes(ing.id) ? '#EF4444' : ing.removible ? '#fff' : '#707070', border: ingRemovidos.includes(ing.id) ? '1px solid rgba(239,68,68,0.3)' : '1px solid #2A2A2A', textDecoration: ingRemovidos.includes(ing.id) ? 'line-through' : 'none', opacity: !ing.removible ? 0.5 : 1 }}>{ing.nombre}</button>
              ))}
            </div>
          </>
        )}

        <textarea value={notas} onChange={(e: any) => setNotas(e.target.value)} placeholder="Notas adicionales (alergias, punto de cocción...)" rows={2} className="input-premium" style={{ resize: 'none', marginBottom: 16 }} />

        {plato.maridaje?.length > 0 && (
          <div style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--gold)', fontWeight: 600 }}>✦ Maridaje sugerido · {plato.maridaje[0].porcentaje_conversion}% de mesas lo piden</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div><p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{plato.maridaje[0].emoji} {plato.maridaje[0].nombre}</p><p style={{ margin: 0, fontSize: 12, color: '#707070' }}>{formatPrecio(plato.maridaje[0].precio)}</p></div>
              <button onClick={() => onMaridar(plato.maridaje[0])} style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 10, padding: '7px 12px', color: 'var(--gold)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>+ Agregar</button>
            </div>
          </div>
        )}

        {mostrarNutricion && plato.calorias && (
          <div style={{ marginBottom: 20 }}>
            <button onClick={() => setMostrarNutri(!mostrarNutri)} style={{ background: 'transparent', border: 'none', color: '#707070', fontSize: 13, cursor: 'pointer', padding: 0 }}>{mostrarNutri ? '▲' : '▼'} Información nutricional</button>
            {mostrarNutri && (
              <div className="fade-in" style={{ background: '#1C1C1C', borderRadius: 12, padding: 14, marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[['🔥', 'Calorías', `${plato.calorias} kcal`], ['💪', 'Proteínas', `${plato.proteinas}g`], ['🌾', 'Carbos', `${plato.carbohidratos}g`], ['🥑', 'Grasas', `${plato.grasas}g`]].map(([e, l, v]) => (
                  <div key={l as string} style={{ textAlign: 'center' }}><p style={{ margin: 0, fontSize: 11, color: '#707070' }}>{e} {l}</p><p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{v}</p></div>
                ))}
              </div>
            )}
          </div>
        )}

        {!esPostPago ? <button onClick={onAgregar} className="btn-gold" style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', fontSize: 15, cursor: 'pointer' }}>Agregar a la cocina — {formatPrecio(plato.precio)}</button> : <div style={{ textAlign: 'center', color: '#707070', fontSize: 14 }}>Cuenta pagada — Modo exploración</div>}
      </div>
    </>
  )
}

function CarritoView({ carrito, sesionDispositivoId, onRemover, onActualizar, onVolver, onPedir, onIrPago, pedidoEnviado, paneraAceptada, paneraConfig, esModoStaff }: any) {
  const miCarrito = carrito.filter((i: ItemPedido) => i.dispositivo_id === sesionDispositivoId)
  const otros = carrito.filter((i: ItemPedido) => i.dispositivo_id !== sesionDispositivoId)
  const miTotal = miCarrito.reduce((acc: number, i: ItemPedido) => acc + i.precio_unitario * i.cantidad, 0)
  const totalMesa = carrito.reduce((acc: number, i: ItemPedido) => acc + i.precio_unitario * i.cantidad, 0)
  const opcionPanera = paneraConfig.opciones.find((o: any) => o.id === paneraAceptada)
  const paneraExtra = opcionPanera ? opcionPanera.precio : 0

  if (pedidoEnviado) return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: 40 }}><div className="fade-in"><p style={{ fontSize: 64, margin: '0 0 16px' }}>🍳</p><h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>¡Pedido enviado!</h2><p style={{ color: '#707070', fontSize: 15 }}>La orden está en camino a la cocina</p></div></div>

  return (
    <div style={{ padding: '0 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0 12px' }}>
        <button onClick={onVolver} style={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 10, padding: '8px 12px', color: '#fff', cursor: 'pointer', fontSize: 14 }}>← Carta</button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{esModoStaff ? 'Pedido para la mesa' : 'Tu cocina'}</h2>
      </div>
      {opcionPanera && <div style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 12, padding: '10px 14px', marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13 }}>🥖 {opcionPanera.nombre}</span><span style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 600 }}>{paneraExtra > 0 ? formatPrecio(paneraExtra) : 'Gratis'}</span></div>}
      {carrito.length === 0 && !opcionPanera && <div style={{ textAlign: 'center', padding: '60px 20px', color: '#707070' }}><p style={{ fontSize: 40 }}>🧑‍🍳</p><p>{esModoStaff ? 'Elegí platos del menú para agregar al pedido' : 'Tu cocina está vacía'}</p></div>}
      {miCarrito.length > 0 && <>{!esModoStaff && <p style={{ fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Tu pedido</p>}{miCarrito.map((item: ItemPedido) => <ItemRow key={item.id} item={item} onRemover={onRemover} onActualizar={onActualizar} />)}</>}
      {otros.length > 0 && <><p style={{ fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '16px 0 10px' }}>Otros comensales</p>{otros.map((item: ItemPedido) => <div key={item.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid #1C1C1C', opacity: 0.6 }}><span style={{ flex: 1, fontSize: 13, color: '#A0A0A0' }}>{item.cantidad}× {item.plato.nombre}</span><span style={{ fontSize: 13, color: '#707070' }}>{formatPrecio(item.precio_unitario * item.cantidad)}</span></div>)}</>}
      {(carrito.length > 0 || opcionPanera) && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #2A2A2A' }}>
          {!esModoStaff && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: 13, color: '#707070' }}>Tu cuenta</span><span style={{ fontSize: 14, fontWeight: 600 }}>{formatPrecio(miTotal + paneraExtra)}</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}><span style={{ fontSize: 14, fontWeight: 600 }}>Total mesa</span><span style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold)' }}>{formatPrecio(totalMesa + paneraExtra)}</span></div>
          {carrito.length > 0 && <button onClick={onPedir} className="btn-gold" style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', fontSize: 15, cursor: 'pointer', marginBottom: 10 }}>Confirmar {carrito.length > 0 ? 'esta ronda' : 'pedido'} a cocina</button>}
          {!esModoStaff && <button onClick={onIrPago} style={{ width: '100%', padding: 14, borderRadius: 14, border: '1px solid rgba(212,175,55,0.4)', background: 'transparent', color: 'var(--gold)', fontSize: 15, cursor: 'pointer', fontWeight: 600 }}>Ir a pagar</button>}
        </div>
      )}
    </div>
  )
}

function ItemRow({ item, onRemover, onActualizar }: { item: ItemPedido; onRemover: (id: string) => void; onActualizar: (id: string, c: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: '1px solid #1C1C1C' }}>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{item.plato.nombre}</p>
        {item.ingredientes_removidos.length > 0 && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#EF4444' }}>Sin: {item.ingredientes_removidos.join(', ')}</p>}
        {item.notas && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#707070' }}>📝 {item.notas}</p>}
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--gold)', fontWeight: 600 }}>{formatPrecio(item.precio_unitario * item.cantidad)}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => onActualizar(item.id, item.cantidad - 1)} style={{ width: 28, height: 28, borderRadius: '50%', background: '#2A2A2A', border: 'none', color: '#fff', fontSize: 16, cursor: 'pointer' }}>−</button>
        <span style={{ fontSize: 14, fontWeight: 600, minWidth: 16, textAlign: 'center' }}>{item.cantidad}</span>
        <button onClick={() => onActualizar(item.id, item.cantidad + 1)} style={{ width: 28, height: 28, borderRadius: '50%', background: '#2A2A2A', border: 'none', color: '#fff', fontSize: 16, cursor: 'pointer' }}>+</button>
        <button onClick={() => onRemover(item.id)} style={{ background: 'transparent', border: 'none', color: '#707070', fontSize: 16, cursor: 'pointer', padding: '0 4px' }}>🗑</button>
      </div>
    </div>
  )
}

function PagoView({ pedidos, propinaConfig, pagoCompletado, setPagoCompletado, onVolver, sesionDispositivoId, mesaId, mesaNumero, config, marcarComoPagado, setModoPostPago, irAResenas, onLlamarMozo, emailPago, setEmailPago }: any) {
  const todosItems: ItemPedido[] = pedidos.flatMap((p: any) => p.items)
  const misItems = todosItems.filter((i: ItemPedido) => i.dispositivo_id === sesionDispositivoId)
  const totalGeneral = todosItems.reduce((acc: number, i: ItemPedido) => acc + i.precio_unitario * i.cantidad, 0)
  const miTotal = misItems.reduce((acc: number, i: ItemPedido) => acc + i.precio_unitario * i.cantidad, 0)

  const [metodoPago, setMetodoPago] = useState<'total' | 'dividido' | null>(null)
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

  const baseCalculo = metodoPago === 'dividido' ? miTotal : totalGeneral
  const propinaMonto = modoPropinaCustom === 'monto' ? (parseFloat(propinaCustomMonto) || 0)
    : modoPropinaCustom === 'pct' ? Math.round(baseCalculo * (parseFloat(propinaCustomPct) || 0) / 100)
    : propinaPct ? Math.round(baseCalculo * propinaPct / 100) : 0
  const montoFinal = baseCalculo + propinaMonto

  if (pagoCompletado) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: 40 }}>
      <div className="fade-in">
        <p style={{ fontSize: 64, margin: '0 0 16px' }}>✅</p>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>¡Pago exitoso!</h2>
        <p style={{ color: '#707070', fontSize: 15 }}>El eco-ticket fue enviado a<br /><strong style={{ color: '#A0A0A0' }}>{emailPago}</strong></p>
      </div>
    </div>
  )

  const validarYContinuar = async (metodo: MetodoPago) => {
    if (!emailPago.trim() || !validarEmail(emailPago)) { setEmailError('Ingresá un email válido para recibir tu eco-ticket'); return }
    setEmailError('')
    if (metodo === 'mercadopago') {
      setCargandoMP(true)
      try {
        const res = await fetch('/api/mercadopago/crear-preferencia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ monto: montoFinal, descripcion: `Mesa ${mesaNumero}`, mesa_id: mesaId, mesa_numero: mesaNumero, propina: propinaMonto, email: emailPago }),
        })
        const data = await res.json()
        if (!data.demo && data.init_point) {
          // Pago real: salimos de la app hacia el checkout oficial de Mercado Pago.
          window.location.href = data.init_point
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
    else onLlamarMozo(`Quiere pagar con ${metodo === 'tarjeta' ? 'tarjeta (POS)' : 'efectivo'} — Total: ${formatPrecio(montoFinal)}`)
  }

  const finalizarPagoMPDemo = () => {
    setProcesandoMP(true)
    setTimeout(() => {
      marcarComoPagado(mesaId, 'mercadopago', propinaMonto, emailPago)
      setModoPostPago()
      setProcesandoMP(false)
      setMostrarMPCheckout(false)
      setPagoCompletado(true)
      setTimeout(() => irAResenas(), 1600)
    }, 1800)
  }

  const confirmarTransferenciaHecha = () => {
    marcarComoPagado(mesaId, 'transferencia', propinaMonto, emailPago)
    setModoPostPago()
    setMostrarTransferencia(false)
    setPagoCompletado(true)
    setTimeout(() => irAResenas(), 1600)
  }

  return (
    <div style={{ padding: '0 16px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0 20px' }}>
        <button onClick={onVolver} style={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 10, padding: '8px 12px', color: '#fff', cursor: 'pointer', fontSize: 14 }}>← Volver</button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Pagar cuenta</h2>
      </div>

      {todosItems.length === 0 ? <div style={{ textAlign: 'center', color: '#707070', padding: '40px 20px' }}><p>No hay pedidos confirmados aún.</p></div> : (
        <>
          <div className="premium-card" style={{ borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Resumen ({pedidos.length} ronda{pedidos.length > 1 ? 's' : ''})</p>
            {todosItems.map((item: ItemPedido) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #1C1C1C', fontSize: 13 }}>
                <span style={{ color: item.dispositivo_id === sesionDispositivoId ? '#fff' : '#707070' }}>{item.cantidad}× {item.plato.nombre}{item.dispositivo_id === sesionDispositivoId ? <span style={{ color: 'var(--gold)', fontSize: 10 }}> (tuyo)</span> : ''}</span>
                <span style={{ color: '#A0A0A0' }}>{formatPrecio(item.precio_unitario * item.cantidad)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontWeight: 700, fontSize: 15 }}><span>Subtotal</span><span style={{ color: 'var(--gold)' }}>{formatPrecio(totalGeneral)}</span></div>
          </div>

          <p style={{ fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>¿Cómo dividís la cuenta?</p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {[{ v: 'total', l: '💳 Pagar todo', s: formatPrecio(totalGeneral) }, { v: 'dividido', l: '🤝 Solo lo mío', s: formatPrecio(miTotal) }].map(o => (
              <button key={o.v} onClick={() => setMetodoPago(o.v as any)} style={{ flex: 1, padding: 14, borderRadius: 14, cursor: 'pointer', textAlign: 'center', background: metodoPago === o.v ? 'rgba(212,175,55,0.12)' : '#141414', border: metodoPago === o.v ? '1px solid rgba(212,175,55,0.5)' : '1px solid #2A2A2A' }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: metodoPago === o.v ? 'var(--gold)' : '#fff' }}>{o.l}</p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#707070' }}>{o.s}</p>
              </button>
            ))}
          </div>

          {metodoPago && propinaConfig.habilitada && (
            <div className="fade-in" style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>💛 ¿Agregás propina?</p>
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
              <p style={{ fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Tu email — para el eco-ticket</p>
              <input type="email" value={emailPago} onChange={e => { setEmailPago(e.target.value); setEmailError('') }} placeholder="tu@email.com" className="input-premium" />
              {emailError && <p style={{ color: '#EF4444', fontSize: 11, margin: '6px 0 0' }}>{emailError}</p>}
            </div>
          )}

          {metodoPago && (
            <>
              <div style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 14, padding: 14, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#A0A0A0', marginBottom: 4 }}><span>Subtotal</span><span>{formatPrecio(baseCalculo)}</span></div>
                {propinaMonto > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#A0A0A0', marginBottom: 8 }}><span>Propina</span><span>{formatPrecio(propinaMonto)}</span></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(212,175,55,0.2)', paddingTop: 8 }}>
                  <span style={{ fontSize: 15 }}>Total a pagar</span>
                  <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)' }}>{formatPrecio(montoFinal)}</span>
                </div>
              </div>

              <p style={{ fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Elegí cómo pagar</p>
              <button onClick={() => validarYContinuar('mercadopago')} disabled={cargandoMP} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 14, background: '#009ee3', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: cargandoMP ? 'default' : 'pointer', marginBottom: 10, opacity: cargandoMP ? 0.7 : 1 }}>
                <span style={{ fontSize: 20 }}>📱</span> {cargandoMP ? 'Conectando con Mercado Pago...' : 'Pagar con Mercado Pago'}
              </button>
              <button onClick={() => validarYContinuar('transferencia')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 14, background: '#1C1C1C', border: '1px solid #2A2A2A', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>🏦</span> Transferencia bancaria
              </button>
              <button onClick={() => validarYContinuar('tarjeta')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 14, background: '#1C1C1C', border: '1px solid #2A2A2A', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>💳</span> Tarjeta / Efectivo con el mozo
              </button>
              <p style={{ textAlign: 'center', fontSize: 11, color: '#484848', marginTop: 8 }}>Tarjeta y efectivo requieren la validación de un mozo, para tu seguridad y la del local.</p>
            </>
          )}
        </>
      )}

      {mostrarMPCheckout && (
        <div className="overlay" style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="fade-in" style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 340, overflow: 'hidden' }}>
            <div style={{ background: '#009ee3', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>📱</span>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Mercado Pago {mpEsDemo && '(demo)'}</span>
              {!procesandoMP && <button onClick={() => setMostrarMPCheckout(false)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>✕</button>}
            </div>
            <div style={{ padding: 24, textAlign: 'center' }}>
              {mpEsDemo && !procesandoMP && (
                <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 10, padding: '8px 12px', marginBottom: 16, textAlign: 'left' }}>
                  <p style={{ margin: 0, fontSize: 11, color: '#92400E' }}>⚠️ No hay Access Token de Mercado Pago configurado en el servidor — este es un checkout de demostración, no cobra de verdad.</p>
                </div>
              )}
              {procesandoMP ? (
                <>
                  <div style={{ width: 40, height: 40, border: '4px solid #e0e0e0', borderTopColor: '#009ee3', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
                  <style>{'@keyframes spin { to { transform: rotate(360deg) } }'}</style>
                  <p style={{ color: '#333', fontSize: 14 }}>Procesando tu pago...</p>
                </>
              ) : (
                <>
                  <p style={{ color: '#666', fontSize: 12, margin: '0 0 4px' }}>Vas a pagar</p>
                  <p style={{ color: '#000', fontSize: 32, fontWeight: 700, margin: '0 0 20px' }}>{formatPrecio(montoFinal)}</p>
                  <div style={{ textAlign: 'left', background: '#f5f5f5', borderRadius: 12, padding: 14, marginBottom: 20 }}>
                    <p style={{ margin: '0 0 8px', fontSize: 12, color: '#666', fontWeight: 600 }}>Elegí un medio de pago</p>
                    {['💳 Tarjeta de crédito', '💳 Tarjeta de débito', '💰 Dinero en cuenta', '🍎 Apple Pay / Google Pay'].map(m => (
                      <div key={m} style={{ padding: '8px 0', fontSize: 13, color: '#333', borderBottom: '1px solid #e5e5e5' }}>{m}</div>
                    ))}
                  </div>
                  <button onClick={finalizarPagoMPDemo} style={{ width: '100%', padding: 14, borderRadius: 12, background: '#009ee3', border: 'none', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Pagar {formatPrecio(montoFinal)}</button>
                  <p style={{ fontSize: 10, color: '#999', marginTop: 12 }}>Cargá tu Access Token real de Mercado Pago como variable de entorno del servidor (MP_ACCESS_TOKEN) para procesar pagos reales.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {mostrarTransferencia && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setMostrarTransferencia(false) }} style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="fade-in" style={{ background: '#1C1C1C', borderRadius: 20, width: '100%', maxWidth: 340, padding: 24 }}>
            <p style={{ fontSize: 32, textAlign: 'center', margin: '0 0 10px' }}>🏦</p>
            <h3 style={{ textAlign: 'center', margin: '0 0 16px', fontSize: 17 }}>Transferí {formatPrecio(montoFinal)}</h3>
            <div style={{ background: '#141414', borderRadius: 12, padding: 14, marginBottom: 16 }}>
              {[['Titular', config.cbu_titular || 'A configurar'], ['Alias', config.alias || 'A configurar'], ['CBU/CVU', config.cbu || config.cvu || 'A configurar']].map(([l, v]) => (
                <div key={l} style={{ marginBottom: 8 }}><p style={{ margin: 0, fontSize: 11, color: '#707070' }}>{l}</p><p style={{ margin: 0, fontSize: 13, color: '#fff', fontWeight: 500 }}>{v}</p></div>
              ))}
            </div>
            <button onClick={confirmarTransferenciaHecha} className="btn-gold" style={{ width: '100%', padding: 13, borderRadius: 12, border: 'none', fontSize: 14, cursor: 'pointer', marginBottom: 8 }}>Ya transferí</button>
            <p style={{ textAlign: 'center', fontSize: 11, color: '#707070' }}>El personal verificará la acreditación antes de que te retires.</p>
          </div>
        </div>
      )}
    </div>
  )
}

function ReviewsView({ pedidos, reviewPlatos, setReviewPlatos, onEnviar, fidelidadHabilitado, puntosPorResena }: any) {
  const platosUnicos = [...new Map(pedidos.flatMap((p: any) => p.items).map((i: ItemPedido) => [i.plato.id, i.plato])).values()] as Plato[]
  return (
    <div style={{ padding: '16px 16px 40px' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <p style={{ fontSize: 40, margin: '0 0 8px' }}>🌟</p>
        <h2 className="font-titulos" style={{ margin: '0 0 6px', fontSize: 22 }}>¿Cómo estuvo?</h2>
        <p style={{ color: '#707070', fontSize: 14, margin: 0 }}>Puntuá y contanos tu experiencia con cada plato</p>
      </div>
      {platosUnicos.map(plato => {
        const val = reviewPlatos[plato.id] || { rating: 0, comentario: '' }
        return (
          <div key={plato.id} className="premium-card" style={{ borderRadius: 14, padding: 16, marginBottom: 12 }}>
            <p style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 600 }}>{plato.nombre}</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => setReviewPlatos((prev: any) => ({ ...prev, [plato.id]: { ...val, rating: star } }))} style={{ background: 'transparent', border: 'none', fontSize: 28, cursor: 'pointer', opacity: val.rating >= star ? 1 : 0.25, color: 'var(--gold)' }}>★</button>
              ))}
            </div>
            {val.rating > 0 && (
              <textarea value={val.comentario} onChange={e => setReviewPlatos((prev: any) => ({ ...prev, [plato.id]: { ...val, comentario: e.target.value } }))} placeholder="Contanos qué te pareció (opcional)..." rows={2} className="input-premium" style={{ resize: 'none' }} />
            )}
          </div>
        )
      })}
      {fidelidadHabilitado && (
        <div style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 14, padding: 14, marginBottom: 16, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--gold)' }}>🏆 Ganás <strong>+{puntosPorResena} puntos</strong> de fidelidad al enviar tu reseña</p>
        </div>
      )}
      <button onClick={onEnviar} className="btn-gold" style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', fontSize: 15, cursor: 'pointer', marginTop: 8 }}>Enviar reseñas</button>
      <button onClick={onEnviar} style={{ width: '100%', padding: 12, borderRadius: 14, border: 'none', background: 'transparent', color: '#707070', fontSize: 14, cursor: 'pointer', marginTop: 8 }}>Omitir</button>
    </div>
  )
}

function NavItem({ label, emoji, active, onClick, badge, disabled, gold }: any) {
  return (
    <button onClick={disabled ? undefined : onClick} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.3 : 1, color: gold ? 'var(--gold)' : active ? 'var(--gold)' : '#707070', position: 'relative', padding: '4px 0' }}>
      <span style={{ fontSize: 22, position: 'relative' }}>
        {emoji}
        {badge > 0 && <span style={{ position: 'absolute', top: -4, right: -8, background: 'var(--gold)', color: '#000', borderRadius: '50%', width: 16, height: 16, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{badge}</span>}
      </span>
      <span style={{ fontSize: 10, fontWeight: active || gold ? 600 : 400 }}>{label}</span>
    </button>
  )
}
