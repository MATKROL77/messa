'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Mesa, MesaEstado, Pedido, Plato, ItemPedido, Sesion, Insumo, ConfigRestaurante, CierreDiario, RolUsuario, PropinaConfig, Tema, LlamadoMozo, MetodoPago, Sucursal, Categoria, ConfigDelivery, Gasto, FidelidadConfig, RecompensaFidelidad, ReviewPlato } from '@/types'
import { getMesasMock, insumosIniciales, platosIniciales, configInicial, tagsIniciales, propinaConfigInicial, temaInicial, sucursalesIniciales, categoriasIniciales, deliveryIntegracionesIniciales, fidelidadConfigInicial, recompensasFidelidadIniciales } from '@/lib/data'
import { generarId, obtenerDispositivoId } from '@/lib/utils'

const MESSA_STORAGE_KEY = 'messa-store-v8'
const LEGACY_STORAGE_KEY = 'menuflow-store-v7'

// Conserva el estado operativo de instalaciones locales creadas antes del
// cambio de identidad. La clave anterior se usa únicamente como migración.
if (typeof window !== 'undefined') {
  try {
    if (!window.localStorage.getItem(MESSA_STORAGE_KEY)) {
      const legacyState = window.localStorage.getItem(LEGACY_STORAGE_KEY)
      if (legacyState) window.localStorage.setItem(MESSA_STORAGE_KEY, legacyState)
    }
  } catch {
    // El almacenamiento puede estar bloqueado por el navegador; Zustand
    // continuará con el estado inicial sin impedir que la aplicación cargue.
  }
}

export type PermisoAdmin = 'resumen' | 'carta' | 'salon' | 'pedidos' | 'inventario' | 'reservas' | 'finanzas' | 'cobros' | 'caja' | 'delivery' | 'fidelidad' | 'sucursales' | 'usuarios' | 'identidad'

const PERMISOS_ADMIN_DEFAULT: Record<RolUsuario, PermisoAdmin[]> = {
  creator: ['resumen', 'carta', 'salon', 'pedidos', 'inventario', 'reservas', 'finanzas', 'cobros', 'caja', 'delivery', 'fidelidad', 'sucursales', 'usuarios', 'identidad'],
  admin: ['resumen', 'carta', 'salon', 'pedidos', 'inventario', 'reservas', 'finanzas', 'cobros', 'caja', 'delivery', 'fidelidad', 'sucursales', 'usuarios', 'identidad'],
  editor: ['resumen', 'carta', 'inventario'],
  staff: ['resumen', 'salon', 'pedidos', 'reservas'],
}

const CATEGORIAS_MESSA_NUEVAS = new Set(['sushi', 'cafes'])

/**
 * Mantiene únicamente el catálogo editorial aprobado de MESSA. Conserva los
 * datos operativos editables de cada producto conocido, pero fuerza sus assets
 * y su identidad desde la fuente versionada para que una persistencia antigua
 * no pueda volver a introducir fotos rectangulares o productos retirados.
 */
const sincronizarPlatosMessa = (platos: Plato[]) => {
  const persistidos = new Map(platos.map(plato => [plato.id, plato]))

  return platosIniciales.map(aprobado => {
    const persistido = persistidos.get(aprobado.id)
    if (!persistido) return aprobado

    const modificadores = aprobado.modificadores.map(modificadorAprobado => {
      const modificadorPersistido = persistido.modificadores.find(modificador => modificador.id === modificadorAprobado.id)
      if (!modificadorPersistido) return modificadorAprobado
      return {
        ...modificadorAprobado,
        ...modificadorPersistido,
        opciones: modificadorPersistido.opciones.map(opcionPersistida => ({
          ...modificadorAprobado.opciones.find(opcion => opcion.id === opcionPersistida.id),
          ...opcionPersistida,
        })),
      }
    })

    return {
      ...aprobado,
      precio: persistido.precio,
      precio_pendiente: persistido.precio_pendiente,
      disponible: persistido.disponible,
      destacado: persistido.destacado,
      tiempo_preparacion_minutos: persistido.tiempo_preparacion_minutos,
      ingredientes: persistido.ingredientes,
      insumos_requeridos: persistido.insumos_requeridos,
      modificadores,
      tags: persistido.tags,
      notas_cocina: persistido.notas_cocina,
      rating: persistido.rating,
      total_reviews: persistido.total_reviews,
      reviews_muestra: persistido.reviews_muestra,
    }
  })
}
const sincronizarInsumosMessa = (insumos: Insumo[]) => [
  ...insumos,
  ...insumosIniciales.filter(inicial => !insumos.some(actual => actual.id === inicial.id)),
]
const sincronizarCategoriasMessa = (categorias: Categoria[]) => [
  ...categorias,
  ...categoriasIniciales.filter(categoria => CATEGORIAS_MESSA_NUEVAS.has(categoria.id) && !categorias.some(actual => actual.id === categoria.id)),
]

export interface Reserva {
  id: string; nombre: string; telefono: string; email: string; fecha: string
  hora: string; personas: number; estado: 'pendiente' | 'confirmada' | 'cancelada' | 'completada'
  notas?: string; sucursal_id?: string; created_at: string
}

interface Notificacion {
  id: string; tipo: 'info' | 'success' | 'warning' | 'error'; mensaje: string
  mesa_numero?: number; timestamp: string; leida: boolean
}

// La autenticación real vive ahora en /api/auth/* (server-side, bcrypt +
// cookie firmada). Este store solo cachea el resultado para no repetir la
// llamada en cada render — nunca contiene contraseñas ni valida nada por sí
// mismo. Ver lib/session.ts y lib/auth-config.ts.

interface AppStore {
  dispositivoId: string
  sesion: Sesion | null
  esStaff: boolean
  notificaciones: Notificacion[]
  carrito: ItemPedido[]
  mesas: Mesa[]
  pedidos: Pedido[]
  reservas: Reserva[]
  platos: Plato[]
  insumos: Insumo[]
  config: ConfigRestaurante
  cierres: CierreDiario[]
  panera_aceptada: string | null
  paneraPromptShown: Record<string, boolean>
  tagsDisponibles: string[]
  categoriasDisponibles: Categoria[]
  sesionAdmin: { nombre: string; email: string; rol: RolUsuario } | null
  propinaConfig: PropinaConfig
  tema: Tema
  llamadosMozo: LlamadoMozo[]
  sucursales: Sucursal[]
  sucursalActualId: string
  deliveryIntegraciones: ConfigDelivery[]
  gastos: Gasto[]
  costoInsumosConsumidoHistorico: number
  fidelidadConfig: FidelidadConfig
  recompensasFidelidad: RecompensaFidelidad[]
  puntosClientes: Record<string, number>
  resenasEnviadas: Record<string, boolean>
  ultimaCuentaPagada: Record<string, string[]>
  permisosAdmin: Record<RolUsuario, PermisoAdmin[]>
  permisosVersion: number

  initStore: () => void
  iniciarSesionMesa: (mesaId: string, mesaNumero: number) => void
  iniciarSesionStaff: (mesaId: string, mesaNumero: number) => void
  iniciarModoVista: () => void
  abandonarMesa: () => void
  setModoPostPago: () => void
  setPaneraAceptada: (opcionId: string | null) => void

  agregarAlCarrito: (plato: Plato, ingRemovidos: string[], notas: string, cantidad?: number, modsElegidos?: string[]) => void
  quitarDelCarrito: (itemId: string) => void
  actualizarCantidad: (itemId: string, cantidad: number) => void
  limpiarCarrito: () => void

  confirmarPedido: (panera?: string | null) => Pedido | null
  marcarComoPagado: (mesaId: string, metodoPago: MetodoPago, propina: number, clienteEmail: string) => void
  prepararPagoManual: (mesaId: string, propina: number, clienteEmail: string) => void
  marcarPagoManualStaff: (mesaId: string, metodoPago: MetodoPago) => void
  confirmarTransferenciaStaff: (pedidoId: string) => void
  actualizarMesa: (mesaId: string, estado: MesaEstado) => void
  ocuparMesaManual: (mesaId: string) => void
  liberarMesa: (mesaId: string) => void
  marcarPedidoListo: (pedidoId: string) => void
  marcarPedidoEntregado: (pedidoId: string) => void
  cancelarPedido: (pedidoId: string) => void
  transferirMesa: (origenId: string, destinoId: string) => { ok: boolean; error?: string }
  actualizarNotaMesa: (mesaId: string, nota: string) => void

  decrementarInsumos: (items: ItemPedido[], sucursalId: string) => void
  actualizarInsumo: (insumoId: string, cantidad: number) => void
  agregarInsumo: (insumo: Omit<Insumo, 'id' | 'ultima_actualizacion'>) => void
  importarInsumosCSV: (csv: string, sucursalId: string) => { ok: number; errores: number }
  exportarInsumosCSV: (sucursalId: string) => string
  checkDisponibilidadPlatos: () => void

  actualizarPlato: (plato: Plato) => void
  agregarPlato: (plato: Omit<Plato, 'id' | 'rating' | 'total_reviews'>) => void
  eliminarPlato: (platoId: string) => void
  toggleDestacado: (platoId: string) => void
  toggleDisponible: (platoId: string) => void
  agregarTagDisponible: (tag: string) => void
  eliminarTagDisponible: (tag: string) => void
  agregarCategoria: (nombre: string, emoji: string) => void
  eliminarCategoria: (categoriaId: string) => { ok: boolean; error?: string }

  actualizarConfig: (config: Partial<ConfigRestaurante>) => void
  actualizarPropinaConfig: (cfg: Partial<PropinaConfig>) => void
  actualizarTema: (tema: Partial<Tema>) => void

  actualizarPosicionMesa: (mesaId: string, x: number, y: number) => void
  crearMesaLayout: (forma: Mesa['forma'], capacidad: number) => void
  eliminarMesaLayout: (mesaId: string) => { ok: boolean; error?: string }
  actualizarCapacidadMesa: (mesaId: string, capacidad: number, forma: Mesa['forma']) => void

  abrirCaja: () => void
  cerrarCaja: (sucursalId: string) => CierreDiario

  crearReserva: (r: Omit<Reserva, 'id' | 'created_at' | 'estado'>) => void
  cancelarReserva: (id: string) => void
  confirmarReserva: (id: string) => void

  agregarNotificacion: (tipo: Notificacion['tipo'], mensaje: string, mesa_numero?: number) => void
  marcarNotificacionLeida: (id: string) => void
  limpiarNotificaciones: () => void

  // Cachea lo que devolvió /api/auth/me o /api/auth/login — no valida nada,
  // solo evita repetir el fetch en cada componente.
  setSesionAdmin: (s: { nombre: string; email: string; rol: RolUsuario } | null) => void
  logoutAdmin: () => Promise<void>
  actualizarPermisoRol: (rol: RolUsuario, permiso: PermisoAdmin, habilitado: boolean) => void

  llamarMozo: (mesaId: string, mesaNumero: number, motivo: string) => void
  atenderLlamado: (llamadoId: string) => void

  // Sucursales
  setSucursalActual: (id: string) => void
  crearSucursal: (nombre: string, direccion: string, telefono: string) => void
  editarSucursal: (id: string, datos: Partial<Sucursal>) => void
  eliminarSucursal: (id: string) => { ok: boolean; error?: string }

  // Delivery
  actualizarDeliveryIntegracion: (id: string, datos: Partial<ConfigDelivery>) => void

  // Finanzas
  agregarGasto: (g: Omit<Gasto, 'id' | 'created_at'>) => void
  eliminarGasto: (id: string) => void

  // Fidelidad
  actualizarFidelidadConfig: (cfg: Partial<FidelidadConfig>) => void
  agregarRecompensa: (r: Omit<RecompensaFidelidad, 'id'>) => void
  eliminarRecompensa: (id: string) => void
  otorgarPuntos: (email: string, puntos: number) => void

  // Reseñas
  enviarResena: (pedidoId: string, platoId: string, rating: number, comentario: string, autorEmail?: string) => { ok: boolean; error?: string }
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      dispositivoId: '',
      sesion: null,
      esStaff: false,
      notificaciones: [],
      carrito: [],
      mesas: getMesasMock() as Mesa[],
      pedidos: [],
      reservas: [
        { id: 'r1', nombre: 'Martín Gómez', telefono: '11 4567-8901', email: 'martin@gmail.com', fecha: new Date().toISOString().split('T')[0], hora: '21:00', personas: 4, estado: 'confirmada', sucursal_id: 'suc1', created_at: new Date().toISOString() },
        { id: 'r2', nombre: 'Laura Fernández', telefono: '11 9876-5432', email: 'laura@gmail.com', fecha: new Date().toISOString().split('T')[0], hora: '21:30', personas: 2, estado: 'pendiente', sucursal_id: 'suc1', created_at: new Date().toISOString() },
        { id: 'r3', nombre: 'Pablo Rodríguez', telefono: '11 5555-1234', email: 'pablo@gmail.com', fecha: new Date().toISOString().split('T')[0], hora: '22:00', personas: 6, estado: 'confirmada', sucursal_id: 'suc1', created_at: new Date().toISOString() },
      ],
      platos: platosIniciales,
      insumos: insumosIniciales,
      config: configInicial,
      cierres: [],
      panera_aceptada: null,
      paneraPromptShown: {},
      tagsDisponibles: tagsIniciales,
      categoriasDisponibles: categoriasIniciales,
      sesionAdmin: null,
      propinaConfig: propinaConfigInicial,
      tema: temaInicial,
      llamadosMozo: [],
      sucursales: sucursalesIniciales,
      sucursalActualId: 'suc1',
      deliveryIntegraciones: deliveryIntegracionesIniciales,
      gastos: [],
      costoInsumosConsumidoHistorico: 0,
      fidelidadConfig: fidelidadConfigInicial,
      recompensasFidelidad: recompensasFidelidadIniciales,
      puntosClientes: {},
      resenasEnviadas: {},
      ultimaCuentaPagada: {},
      permisosAdmin: PERMISOS_ADMIN_DEFAULT,
      permisosVersion: 1,

        initStore: () => {
          set(state => ({
            dispositivoId: obtenerDispositivoId(),
            tema: state.tema.nombre_marca === 'MenuFlow' ? { ...state.tema, nombre_marca: 'MESSA' } : state.tema,
            platos: sincronizarPlatosMessa(state.platos),
            insumos: sincronizarInsumosMessa(state.insumos),
            categoriasDisponibles: sincronizarCategoriasMessa(state.categoriasDisponibles),
            permisosAdmin: state.permisosVersion < 2
              ? { ...state.permisosAdmin, admin: PERMISOS_ADMIN_DEFAULT.admin }
              : state.permisosAdmin,
            permisosVersion: 2,
          }))
        },

      iniciarSesionMesa: (mesaId, mesaNumero) => {
        const devId = get().dispositivoId || obtenerDispositivoId()
        const updatedMesas = get().mesas.map(m =>
          m.id === mesaId ? { ...m, estado: (m.estado === 'libre' ? 'ocupada' : m.estado) as MesaEstado, dispositivos: [...new Set([...m.dispositivos, devId])], updated_at: new Date().toISOString() } : m
        )
        set({ dispositivoId: devId, esStaff: false, sesion: { mesa_id: mesaId, mesa_numero: mesaNumero, dispositivo_id: devId, modo: 'comensal' }, mesas: updatedMesas, panera_aceptada: null })
      },

      iniciarSesionStaff: (mesaId, mesaNumero) => {
        set({ esStaff: true, sesion: { mesa_id: mesaId, mesa_numero: mesaNumero, dispositivo_id: 'staff-' + mesaId, modo: 'comensal' } })
      },

        iniciarModoVista: () => {
          const devId = obtenerDispositivoId()
          set(state => ({
            dispositivoId: devId,
            esStaff: false,
            sesion: { mesa_id: 'vista', mesa_numero: 0, dispositivo_id: devId, modo: 'curioso' },
            tema: state.tema.nombre_marca === 'MenuFlow' ? { ...state.tema, nombre_marca: 'MESSA' } : state.tema,
            platos: sincronizarPlatosMessa(state.platos),
            categoriasDisponibles: sincronizarCategoriasMessa(state.categoriasDisponibles),
          }))
        },

      abandonarMesa: () => {
        const { sesion, mesas, dispositivoId, esStaff } = get()
        if (!sesion || sesion.mesa_id === 'vista' || esStaff) { set({ sesion: null, carrito: [] }); return }
        const updatedMesas = mesas.map(m => {
          if (m.id !== sesion.mesa_id) return m
          const dispositivos = m.dispositivos.filter(d => d !== dispositivoId)
          return { ...m, estado: (dispositivos.length === 0 ? 'libre' : m.estado) as MesaEstado, dispositivos, updated_at: new Date().toISOString() }
        })
        set({ sesion: null, carrito: [], mesas: updatedMesas })
      },

      setModoPostPago: () => set(s => ({ sesion: s.sesion ? { ...s.sesion, modo: 'post_pago' } : null, carrito: [] })),
      setPaneraAceptada: (opcionId) => set({ panera_aceptada: opcionId }),

      agregarAlCarrito: (plato, ingRemovidos, notas, cantidad = 1, modsElegidos = []) => {
        const { dispositivoId, esStaff, sesion } = get()
        const devId = esStaff ? (sesion?.dispositivo_id || 'staff') : dispositivoId
        const extra = plato.modificadores
          .flatMap(modificador => modificador.opciones)
          .filter(opcion => modsElegidos.includes(opcion.id))
          .reduce((total, opcion) => total + opcion.precio_extra, 0)
        const item: ItemPedido = {
          id: generarId(),
          plato,
          cantidad,
          ingredientes_removidos: ingRemovidos,
          modificadores_elegidos: modsElegidos,
          notas,
          precio_unitario: plato.precio + extra,
          dispositivo_id: devId,
        }
        set(s => ({ carrito: [...s.carrito, item] }))
      },

      quitarDelCarrito: (id) => set(s => ({ carrito: s.carrito.filter(i => i.id !== id) })),
      actualizarCantidad: (id, cantidad) => {
        if (cantidad <= 0) { get().quitarDelCarrito(id); return }
        set(s => ({ carrito: s.carrito.map(i => i.id === id ? { ...i, cantidad } : i) }))
      },
      limpiarCarrito: () => set({ carrito: [] }),

      confirmarPedido: (panera = null) => {
        const { sesion, carrito, dispositivoId, mesas, esStaff } = get()
        if (!sesion || carrito.length === 0) return null
        const mesaActual = mesas.find(m => m.id === sesion.mesa_id)
        const sucursalId = mesaActual?.sucursal_id || get().sucursalActualId
        const pedido: Pedido = {
          id: generarId(), mesa_id: sesion.mesa_id, mesa_numero: sesion.mesa_numero,
          items: [...carrito], estado: 'en_cocina',
          total: carrito.reduce((acc, i) => acc + i.precio_unitario * i.cantidad, 0),
          propina: 0, dispositivo_id: esStaff ? 'staff' : dispositivoId, sucursal_id: sucursalId, origen: 'mesa',
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(), panera: panera || undefined
        }
        const updatedMesas = mesas.map(m => m.id === sesion.mesa_id ? { ...m, estado: 'pedido' as MesaEstado, updated_at: new Date().toISOString() } : m)
        get().decrementarInsumos(carrito, sucursalId)
        set(s => ({ pedidos: [...s.pedidos, pedido], carrito: [], mesas: updatedMesas }))
        get().checkDisponibilidadPlatos()
        return pedido
      },

      marcarComoPagado: (mesaId, metodoPago, propina, clienteEmail) => {
        let primerPedido = true
        let totalCobrado = 0
        const pedidosCobrados: string[] = []
        const updatedPedidos = get().pedidos.map(p => {
          if (p.mesa_id === mesaId && p.estado !== 'cancelado' && p.estado !== 'pagado') {
            const esPrimero = primerPedido; primerPedido = false
            totalCobrado += p.total + (esPrimero ? propina : 0)
            pedidosCobrados.push(p.id)
            return { ...p, estado: 'pagado' as const, metodo_pago: metodoPago, propina: esPrimero ? propina : 0, cliente_email: clienteEmail, confirmado_staff: metodoPago !== 'transferencia', updated_at: new Date().toISOString() }
          }
          return p
        })
        const updatedMesas = get().mesas.map(m => m.id === mesaId ? { ...m, estado: 'pagada' as MesaEstado, updated_at: new Date().toISOString() } : m)
        set(s => ({ pedidos: updatedPedidos, mesas: updatedMesas, ultimaCuentaPagada: pedidosCobrados.length ? { ...s.ultimaCuentaPagada, [mesaId]: pedidosCobrados } : s.ultimaCuentaPagada }))
        if (clienteEmail && get().fidelidadConfig.habilitado) {
          const puntos = Math.floor((totalCobrado / 1000) * get().fidelidadConfig.puntos_por_1000_gastado)
          if (puntos > 0) get().otorgarPuntos(clienteEmail, puntos)
        }
        const numero = get().mesas.find(m => m.id === mesaId)?.numero
        if (metodoPago === 'transferencia') get().agregarNotificacion('warning', 'Transferencia recibida — verificar acreditación', numero)
        else get().agregarNotificacion('success', `Pago confirmado (${metodoPago}) — mesa lista para liberar`, numero)
      },

      prepararPagoManual: (mesaId, propina, clienteEmail) => {
        let primerPedido = true
        set(s => ({
          pedidos: s.pedidos.map(pedido => {
            if (pedido.mesa_id !== mesaId || pedido.estado === 'cancelado' || pedido.estado === 'pagado') return pedido
            const esPrimero = primerPedido
            primerPedido = false
            return {
              ...pedido,
              propina: esPrimero ? propina : 0,
              cliente_email: clienteEmail.trim().toLowerCase(),
              updated_at: new Date().toISOString(),
            }
          }),
        }))
      },

      marcarPagoManualStaff: (mesaId, metodoPago) => {
        const pedidosCobrados: string[] = []
        let totalCobrado = 0
        let clienteEmail = ''
        const updatedPedidos = get().pedidos.map(p => {
          if (p.mesa_id !== mesaId || p.estado === 'cancelado' || p.estado === 'pagado') return p
          pedidosCobrados.push(p.id)
          totalCobrado += p.total + p.propina
          if (!clienteEmail && p.cliente_email) clienteEmail = p.cliente_email
          return { ...p, estado: 'pagado' as const, metodo_pago: metodoPago, confirmado_staff: true, updated_at: new Date().toISOString() }
        })
        const updatedMesas = get().mesas.map(m => m.id === mesaId ? { ...m, estado: 'pagada' as MesaEstado, updated_at: new Date().toISOString() } : m)
        set(s => ({
          pedidos: updatedPedidos,
          mesas: updatedMesas,
          ultimaCuentaPagada: pedidosCobrados.length
            ? { ...s.ultimaCuentaPagada, [mesaId]: pedidosCobrados }
            : s.ultimaCuentaPagada,
        }))
        if (pedidosCobrados.length && clienteEmail && get().fidelidadConfig.habilitado) {
          const puntos = Math.floor((totalCobrado / 1000) * get().fidelidadConfig.puntos_por_1000_gastado)
          if (puntos > 0) get().otorgarPuntos(clienteEmail, puntos)
        }
        const numero = get().mesas.find(m => m.id === mesaId)?.numero
        get().agregarNotificacion('success', `Pago en ${metodoPago} confirmado por personal`, numero)
      },

      confirmarTransferenciaStaff: (pedidoId) => {
        set(s => ({ pedidos: s.pedidos.map(p => p.id === pedidoId ? { ...p, confirmado_staff: true } : p) }))
        get().agregarNotificacion('success', 'Transferencia verificada por el personal')
      },

      actualizarMesa: (mesaId, estado) => set(s => ({ mesas: s.mesas.map(m => m.id === mesaId ? { ...m, estado, updated_at: new Date().toISOString() } : m) })),

      ocuparMesaManual: (mesaId) => {
        set(s => ({ mesas: s.mesas.map(m => m.id === mesaId ? { ...m, estado: 'ocupada' as MesaEstado, updated_at: new Date().toISOString() } : m) }))
        const numero = get().mesas.find(m => m.id === mesaId)?.numero
        get().agregarNotificacion('info', 'Mesa marcada como ocupada por el personal', numero)
      },

      liberarMesa: (mesaId) => {
        const numero = get().mesas.find(m => m.id === mesaId)?.numero
        set(s => ({
          mesas: s.mesas.map(m => m.id === mesaId ? { ...m, estado: 'libre' as MesaEstado, dispositivos: [], nota_staff: '', updated_at: new Date().toISOString() } : m),
          paneraPromptShown: { ...s.paneraPromptShown, [mesaId]: false },
        }))
        get().agregarNotificacion('info', `Mesa liberada por el personal`, numero)
      },

      marcarPedidoListo: (pedidoId) => {
        set(s => ({ pedidos: s.pedidos.map(p => p.id === pedidoId ? { ...p, estado: 'listo' as const, updated_at: new Date().toISOString() } : p) }))
      },

      marcarPedidoEntregado: (pedidoId) => {
        set(s => ({ pedidos: s.pedidos.map(p => p.id === pedidoId ? { ...p, estado: 'entregado' as const, updated_at: new Date().toISOString() } : p) }))
      },

      cancelarPedido: (pedidoId) => {
        const pedido = get().pedidos.find(p => p.id === pedidoId)
        set(s => ({
          pedidos: s.pedidos.map(p => p.id === pedidoId ? { ...p, estado: 'cancelado' as const, updated_at: new Date().toISOString() } : p),
          mesas: s.mesas.map(m => m.id === pedido?.mesa_id ? { ...m, estado: 'libre' as MesaEstado, dispositivos: [], updated_at: new Date().toISOString() } : m)
        }))
      },

      transferirMesa: (origenId, destinoId) => {
        const { mesas, pedidos } = get()
        const origen = mesas.find(m => m.id === origenId)
        const destino = mesas.find(m => m.id === destinoId)
        if (!origen || !destino) return { ok: false, error: 'Mesa no encontrada' }
        if (destino.estado !== 'libre') return { ok: false, error: 'La mesa de destino debe estar libre' }
        const updatedPedidos = pedidos.map(p => p.mesa_id === origenId && p.estado !== 'cancelado' && p.estado !== 'pagado' ? { ...p, mesa_id: destinoId, mesa_numero: destino.numero } : p)
        const updatedMesas = mesas.map(m => {
          if (m.id === destinoId) return { ...m, estado: origen.estado, dispositivos: origen.dispositivos, nota_staff: origen.nota_staff, updated_at: new Date().toISOString() }
          if (m.id === origenId) return { ...m, estado: 'libre' as MesaEstado, dispositivos: [], nota_staff: '', updated_at: new Date().toISOString() }
          return m
        })
        set({ pedidos: updatedPedidos, mesas: updatedMesas })
        get().agregarNotificacion('info', `Mesa ${origen.numero} trasladada a Mesa ${destino.numero}`)
        return { ok: true }
      },

      actualizarNotaMesa: (mesaId, nota) => set(s => ({ mesas: s.mesas.map(m => m.id === mesaId ? { ...m, nota_staff: nota } : m) })),

      decrementarInsumos: (items, sucursalId) => {
        const { insumos } = get()
        const nuevosInsumos = [...insumos]
        let costoTotal = 0
        const indiceEnSucursal = (insumoId: string) => {
          const exacto = nuevosInsumos.findIndex(insumo => insumo.id === insumoId && insumo.sucursal_id === sucursalId)
          if (exacto >= 0) return exacto
          const referencia = nuevosInsumos.find(insumo => insumo.id === insumoId)
          return referencia ? nuevosInsumos.findIndex(insumo => insumo.nombre === referencia.nombre && insumo.sucursal_id === sucursalId) : -1
        }
        items.forEach(item => {
          item.plato.insumos_requeridos?.forEach(req => {
            const idx = indiceEnSucursal(req.insumo_id)
            if (idx >= 0) {
              const cantidadUsada = req.cantidad_por_porcion * item.cantidad
              costoTotal += cantidadUsada * nuevosInsumos[idx].costo_unitario
              nuevosInsumos[idx] = { ...nuevosInsumos[idx], cantidad: Math.max(0, nuevosInsumos[idx].cantidad - cantidadUsada), ultima_actualizacion: new Date().toISOString() }
              if (nuevosInsumos[idx].cantidad <= nuevosInsumos[idx].cantidad_critica && nuevosInsumos[idx].cantidad > 0) {
                get().agregarNotificacion('warning', `Stock crítico: ${nuevosInsumos[idx].nombre} (${nuevosInsumos[idx].cantidad.toFixed(1)} ${nuevosInsumos[idx].unidad} restantes)`)
              }
              if (nuevosInsumos[idx].cantidad <= 0) {
                get().agregarNotificacion('error', `Sin stock: ${nuevosInsumos[idx].nombre} — algunos platos serán ocultados`)
              }
            }
          })
          item.plato.modificadores
            .flatMap(modificador => modificador.opciones)
            .filter(opcion => item.modificadores_elegidos.includes(opcion.id))
            .flatMap(opcion => opcion.insumos_requeridos || [])
            .forEach(req => {
              const idx = indiceEnSucursal(req.insumo_id)
              if (idx < 0) return
              const cantidadUsada = req.cantidad_por_porcion * item.cantidad
              costoTotal += cantidadUsada * nuevosInsumos[idx].costo_unitario
              nuevosInsumos[idx] = {
                ...nuevosInsumos[idx],
                cantidad: Math.max(0, nuevosInsumos[idx].cantidad - cantidadUsada),
                ultima_actualizacion: new Date().toISOString(),
              }
            })
        })
        set(s => ({ insumos: nuevosInsumos, costoInsumosConsumidoHistorico: s.costoInsumosConsumidoHistorico + costoTotal }))
      },

      actualizarInsumo: (insumoId, cantidad) => {
        set(s => ({ insumos: s.insumos.map(i => i.id === insumoId ? { ...i, cantidad, ultima_actualizacion: new Date().toISOString() } : i) }))
        get().checkDisponibilidadPlatos()
      },

      agregarInsumo: (insumoData) => {
        const insumo: Insumo = { ...insumoData, id: 'ins' + generarId(), ultima_actualizacion: new Date().toISOString() }
        set(s => ({ insumos: [...s.insumos, insumo] }))
      },

      importarInsumosCSV: (csv, sucursalId) => {
        const lineas = csv.trim().split('\n').slice(1)
        let ok = 0; let errores = 0
        const nuevosInsumos = [...get().insumos]
        lineas.forEach(linea => {
          const cols = linea.split(',')
          if (cols.length < 3) { errores++; return }
          const [nombre, cantStr, unidad, criticaStr, proveedor] = cols.map(c => c.trim())
          const cantidad = parseFloat(cantStr)
          const cantidad_critica = parseFloat(criticaStr || '0')
          if (isNaN(cantidad)) { errores++; return }
          const idx = nuevosInsumos.findIndex(i => i.nombre.toLowerCase() === nombre.toLowerCase() && i.sucursal_id === sucursalId)
          if (idx >= 0) {
            nuevosInsumos[idx] = { ...nuevosInsumos[idx], cantidad, cantidad_critica: isNaN(cantidad_critica) ? nuevosInsumos[idx].cantidad_critica : cantidad_critica, proveedor: proveedor || nuevosInsumos[idx].proveedor, ultima_actualizacion: new Date().toISOString() }
          } else {
            nuevosInsumos.push({ id: 'ins' + generarId(), nombre, cantidad, unidad: (unidad as Insumo['unidad']) || 'unidad', cantidad_critica: isNaN(cantidad_critica) ? 0 : cantidad_critica, cantidad_pedido_sugerido: cantidad * 2, proveedor, costo_unitario: 0, activo: true, sucursal_id: sucursalId, ultima_actualizacion: new Date().toISOString() })
          }
          ok++
        })
        set({ insumos: nuevosInsumos })
        get().checkDisponibilidadPlatos()
        return { ok, errores }
      },

      exportarInsumosCSV: (sucursalId) => {
        const insumosFiltrados = get().insumos.filter(i => i.sucursal_id === sucursalId)
        const header = 'nombre,cantidad,unidad,cantidad_critica,proveedor,costo_unitario'
        const rows = insumosFiltrados.map(i => `${i.nombre},${i.cantidad},${i.unidad},${i.cantidad_critica},${i.proveedor || ''},${i.costo_unitario}`).join('\n')
        return header + '\n' + rows
      },

      checkDisponibilidadPlatos: () => {
        const { insumos, platos } = get()
        const updatedPlatos = platos.map(plato => {
          const sinStock = plato.insumos_requeridos?.some(req => {
            const relacionados = insumos.filter(i => i.id === req.insumo_id)
            return relacionados.length > 0 && relacionados.every(i => i.cantidad <= 0)
          })
          return { ...plato, disponible: !sinStock }
        })
        set({ platos: updatedPlatos })
      },

      actualizarPlato: (plato) => set(s => ({ platos: s.platos.map(p => p.id === plato.id ? { ...plato, precio_pendiente: plato.precio > 0 ? false : plato.precio_pendiente } : p) })),
      agregarPlato: (platoData) => {
        const plato: Plato = { ...platoData, id: 'p' + generarId(), rating: 0, total_reviews: 0 }
        set(s => ({ platos: [...s.platos, plato] }))
      },
      eliminarPlato: (platoId) => set(s => ({ platos: s.platos.filter(p => p.id !== platoId) })),
      toggleDestacado: (platoId) => set(s => ({ platos: s.platos.map(p => p.id === platoId ? { ...p, destacado: !p.destacado } : p) })),
      toggleDisponible: (platoId) => set(s => ({ platos: s.platos.map(p => p.id === platoId ? { ...p, disponible: !p.disponible } : p) })),

      agregarTagDisponible: (tag) => {
        const limpio = tag.trim()
        if (!limpio) return
        set(s => s.tagsDisponibles.some(t => t.toLowerCase() === limpio.toLowerCase()) ? s : { tagsDisponibles: [...s.tagsDisponibles, limpio] })
      },
      eliminarTagDisponible: (tag) => set(s => ({ tagsDisponibles: s.tagsDisponibles.filter(t => t !== tag) })),

      agregarCategoria: (nombre, emoji) => {
        const id = nombre.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        if (!id) return
        set(s => s.categoriasDisponibles.some(c => c.id === id) ? s : { categoriasDisponibles: [...s.categoriasDisponibles, { id, nombre: nombre.trim(), emoji, orden: s.categoriasDisponibles.length + 1 }] })
      },
      eliminarCategoria: (categoriaId) => {
        const enUso = get().platos.some(p => p.categoria_id === categoriaId)
        if (enUso) return { ok: false, error: 'Hay platos usando esta categoría — reasignalos primero' }
        set(s => ({ categoriasDisponibles: s.categoriasDisponibles.filter(c => c.id !== categoriaId) }))
        return { ok: true }
      },

      actualizarConfig: (config) => set(s => ({ config: { ...s.config, ...config } })),
      actualizarPropinaConfig: (cfg) => set(s => ({ propinaConfig: { ...s.propinaConfig, ...cfg } })),
      actualizarTema: (tema) => set(s => ({ tema: { ...s.tema, ...tema } })),

      actualizarPosicionMesa: (mesaId, x, y) => {
        const xClamp = Math.max(4, Math.min(96, x))
        const yClamp = Math.max(4, Math.min(96, y))
        set(s => ({ mesas: s.mesas.map(m => m.id === mesaId ? { ...m, pos_x: xClamp, pos_y: yClamp } : m) }))
      },

      crearMesaLayout: (forma, capacidad) => {
        const { mesas, sucursalActualId } = get()
        const mesasSucursal = mesas.filter(m => m.sucursal_id === sucursalActualId)
        const siguienteNumero = Math.max(0, ...mesasSucursal.map(m => m.numero)) + 1
        const nueva: Mesa = { id: 'm' + generarId(), numero: siguienteNumero, estado: 'libre', dispositivos: [], pos_x: 50, pos_y: 50, forma, capacidad, sucursal_id: sucursalActualId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        set(s => ({ mesas: [...s.mesas, nueva] }))
      },

      eliminarMesaLayout: (mesaId) => {
        const mesa = get().mesas.find(m => m.id === mesaId)
        if (!mesa) return { ok: false, error: 'Mesa no encontrada' }
        if (mesa.estado !== 'libre') return { ok: false, error: 'Solo se pueden eliminar mesas libres' }
        set(s => ({ mesas: s.mesas.filter(m => m.id !== mesaId) }))
        return { ok: true }
      },

      actualizarCapacidadMesa: (mesaId, capacidad, forma) => set(s => ({ mesas: s.mesas.map(m => m.id === mesaId ? { ...m, capacidad, forma } : m) })),

      abrirCaja: () => set(s => ({ config: { ...s.config, caja_abierta: true, fecha_apertura_caja: new Date().toISOString() } })),

      cerrarCaja: (sucursalId) => {
        const { pedidos, config, platos } = get()
        const hoy = new Date().toISOString().split('T')[0]
        const pedidosHoy = pedidos.filter(p => p.created_at.startsWith(hoy) && p.estado === 'pagado' && p.sucursal_id === sucursalId)
        const totalVentas = pedidosHoy.reduce((acc, p) => acc + p.total, 0)
        const totalPropinas = pedidosHoy.reduce((acc, p) => acc + (p.propina || 0), 0)
        const ventasPorCategoria: Record<string, number> = {}
        const ventasPorMetodo: Record<string, number> = { tarjeta: 0, transferencia: 0, mercadopago: 0, efectivo: 0 }
        pedidosHoy.forEach(p => {
          const metodo = p.metodo_pago || 'efectivo'
          ventasPorMetodo[metodo] = (ventasPorMetodo[metodo] || 0) + p.total + (p.propina || 0)
          p.items.forEach(item => {
            const cat = platos.find(pl => pl.id === item.plato.id)?.categoria_id || 'otros'
            ventasPorCategoria[cat] = (ventasPorCategoria[cat] || 0) + item.precio_unitario * item.cantidad
          })
        })
        const mesasAtendidas = [...new Set(pedidosHoy.map(p => p.mesa_id))].length
        const cierre: CierreDiario = {
          id: generarId(), fecha: hoy, hora_apertura: config.fecha_apertura_caja,
          hora_cierre: new Date().toISOString(), total_ventas: totalVentas, total_propinas: totalPropinas,
          total_pedidos: pedidosHoy.length, total_mesas_atendidas: mesasAtendidas,
          ticket_promedio: pedidosHoy.length > 0 ? totalVentas / pedidosHoy.length : 0,
          ventas_por_categoria: ventasPorCategoria, ventas_por_metodo: ventasPorMetodo,
          created_at: new Date().toISOString()
        }
        set(s => ({ cierres: [...s.cierres, cierre], config: { ...s.config, caja_abierta: false, fecha_apertura_caja: '' } }))
        return cierre
      },

      crearReserva: (r) => { const reserva: Reserva = { ...r, id: generarId(), estado: 'pendiente', created_at: new Date().toISOString() }; set(s => ({ reservas: [...s.reservas, reserva] })) },
      cancelarReserva: (id) => set(s => ({ reservas: s.reservas.map(r => r.id === id ? { ...r, estado: 'cancelada' as const } : r) })),
      confirmarReserva: (id) => set(s => ({ reservas: s.reservas.map(r => r.id === id ? { ...r, estado: 'confirmada' as const } : r) })),

      agregarNotificacion: (tipo, mensaje, mesa_numero) => {
        const n = { id: generarId(), tipo, mensaje, mesa_numero, timestamp: new Date().toISOString(), leida: false }
        set(s => ({ notificaciones: [n, ...s.notificaciones].slice(0, 100) }))
      },
      marcarNotificacionLeida: (id) => set(s => ({ notificaciones: s.notificaciones.map(n => n.id === id ? { ...n, leida: true } : n) })),
      limpiarNotificaciones: () => set({ notificaciones: [] }),

      setSesionAdmin: (s) => set({ sesionAdmin: s }),

      logoutAdmin: async () => {
        try { await fetch('/api/auth/logout', { method: 'POST' }) } catch { /* red caída: igual limpiamos el estado local */ }
        set({ sesionAdmin: null })
      },
      actualizarPermisoRol: (rol, permiso, habilitado) => {
        if (rol === 'creator') return
        set(state => {
          const actuales = state.permisosAdmin[rol] || PERMISOS_ADMIN_DEFAULT[rol]
          const siguientes = habilitado ? [...new Set([...actuales, permiso])] : actuales.filter(item => item !== permiso)
          return { permisosAdmin: { ...state.permisosAdmin, [rol]: siguientes } }
        })
      },

      llamarMozo: (mesaId, mesaNumero, motivo) => {
        const llamado: LlamadoMozo = { id: generarId(), mesa_id: mesaId, mesa_numero: mesaNumero, motivo, atendido: false, created_at: new Date().toISOString() }
        set(s => ({ llamadosMozo: [llamado, ...s.llamadosMozo] }))
        get().agregarNotificacion('info', `Mesa ${mesaNumero} llama al mozo: ${motivo}`, mesaNumero)
      },
      atenderLlamado: (llamadoId) => set(s => ({ llamadosMozo: s.llamadosMozo.map(l => l.id === llamadoId ? { ...l, atendido: true } : l) })),

      // ── SUCURSALES ──
      setSucursalActual: (id) => set({ sucursalActualId: id }),
      crearSucursal: (nombre, direccion, telefono) => {
        const nueva: Sucursal = { id: 'suc' + generarId(), nombre, direccion, telefono, activa: true, created_at: new Date().toISOString() }
        set(s => ({ sucursales: [...s.sucursales, nueva] }))
      },
      editarSucursal: (id, datos) => set(s => ({ sucursales: s.sucursales.map(suc => suc.id === id ? { ...suc, ...datos } : suc) })),
      eliminarSucursal: (id) => {
        if (get().sucursales.length <= 1) return { ok: false, error: 'Debe existir al menos una sucursal' }
        if (get().mesas.some(m => m.sucursal_id === id && m.estado !== 'libre')) return { ok: false, error: 'Hay mesas activas en esta sucursal' }
        set(s => ({ sucursales: s.sucursales.filter(suc => suc.id !== id), sucursalActualId: s.sucursalActualId === id ? s.sucursales[0].id : s.sucursalActualId }))
        return { ok: true }
      },

      // ── DELIVERY ──
      actualizarDeliveryIntegracion: (id, datos) => set(s => ({ deliveryIntegraciones: s.deliveryIntegraciones.map(d => d.id === id ? { ...d, ...datos } : d) })),

      // ── FINANZAS ──
      agregarGasto: (g) => { const gasto: Gasto = { ...g, id: generarId(), created_at: new Date().toISOString() }; set(s => ({ gastos: [...s.gastos, gasto] })) },
      eliminarGasto: (id) => set(s => ({ gastos: s.gastos.filter(g => g.id !== id) })),

      // ── FIDELIDAD ──
      actualizarFidelidadConfig: (cfg) => set(s => ({ fidelidadConfig: { ...s.fidelidadConfig, ...cfg } })),
      agregarRecompensa: (r) => { const rec: RecompensaFidelidad = { ...r, id: generarId() }; set(s => ({ recompensasFidelidad: [...s.recompensasFidelidad, rec] })) },
      eliminarRecompensa: (id) => set(s => ({ recompensasFidelidad: s.recompensasFidelidad.filter(r => r.id !== id) })),
      otorgarPuntos: (email, puntos) => {
        const key = email.trim().toLowerCase()
        set(s => ({ puntosClientes: { ...s.puntosClientes, [key]: (s.puntosClientes[key] || 0) + puntos } }))
      },

      // ── RESEÑAS ──
      enviarResena: (pedidoId, platoId, rating, comentario, autorEmail) => {
        const { platos, pedidos, fidelidadConfig, resenasEnviadas } = get()
        const pedido = pedidos.find(item => item.id === pedidoId)
        if (!pedido || pedido.estado !== 'pagado' || pedido.confirmado_staff === false) return { ok: false, error: 'La reseña se habilita después de confirmar el pago.' }
        if (!pedido.items.some(item => item.plato.id === platoId)) return { ok: false, error: 'Este producto no pertenece al pedido pagado.' }
        const clave = `${pedidoId}:${platoId}`
        if (resenasEnviadas[clave]) return { ok: false, error: 'Ya reseñaste este producto.' }
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, error: 'Elegí una puntuación de 1 a 5 estrellas.' }
        const plato = platos.find(p => p.id === platoId)
        if (!plato) return { ok: false, error: 'El producto ya no está disponible.' }
        const nuevoTotal = plato.total_reviews + 1
        const nuevoRating = Math.round(((plato.rating * plato.total_reviews + rating) / nuevoTotal) * 10) / 10
        const nuevaResena: ReviewPlato = { id: generarId(), pedido_id: pedidoId, autor: 'Comensal verificado', rating, comentario: comentario.trim(), created_at: new Date().toISOString() }
        const reviews_muestra = [nuevaResena, ...(plato.reviews_muestra || [])].slice(0, 20)
        const clavesDeLaCuenta = pedidos
          .filter(item => item.mesa_id === pedido.mesa_id && item.estado === 'pagado' && item.confirmado_staff !== false && item.items.some(linea => linea.plato.id === platoId))
          .map(item => `${item.id}:${platoId}`)
        set(s => ({
          platos: s.platos.map(p => p.id === platoId ? { ...p, rating: nuevoRating, total_reviews: nuevoTotal, reviews_muestra } : p),
          resenasEnviadas: clavesDeLaCuenta.reduce((resultado, claveCuenta) => ({ ...resultado, [claveCuenta]: true }), { ...s.resenasEnviadas, [clave]: true }),
        }))
        if (autorEmail && fidelidadConfig.habilitado && fidelidadConfig.puntos_por_resena > 0) {
          get().otorgarPuntos(autorEmail, fidelidadConfig.puntos_por_resena)
        }
        return { ok: true }
      },
    }),
    { name: MESSA_STORAGE_KEY, partialize: s => ({ dispositivoId: s.dispositivoId, sesion: s.sesion, carrito: s.carrito, mesas: s.mesas, pedidos: s.pedidos, reservas: s.reservas, platos: s.platos, insumos: s.insumos, config: s.config, cierres: s.cierres, notificaciones: s.notificaciones, tagsDisponibles: s.tagsDisponibles, categoriasDisponibles: s.categoriasDisponibles, propinaConfig: s.propinaConfig, tema: s.tema, llamadosMozo: s.llamadosMozo, sucursales: s.sucursales, sucursalActualId: s.sucursalActualId, deliveryIntegraciones: s.deliveryIntegraciones, gastos: s.gastos, costoInsumosConsumidoHistorico: s.costoInsumosConsumidoHistorico, fidelidadConfig: s.fidelidadConfig, recompensasFidelidad: s.recompensasFidelidad, puntosClientes: s.puntosClientes, resenasEnviadas: s.resenasEnviadas, ultimaCuentaPagada: s.ultimaCuentaPagada, permisosAdmin: s.permisosAdmin, permisosVersion: s.permisosVersion, paneraPromptShown: s.paneraPromptShown, panera_aceptada: s.panera_aceptada }) }
  )
)
