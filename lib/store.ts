'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Mesa, MesaEstado, Pedido, Plato, ItemPedido, Sesion, Insumo, ConfigRestaurante, CierreDiario, RolUsuario, PropinaConfig, Tema, LlamadoMozo, MetodoPago, Sucursal, Categoria, ConfigDelivery, Gasto, FidelidadConfig, RecompensaFidelidad, ReviewPlato, ElementoPlano, TipoElementoPlano, EventoBitacora } from '@/types'
import { getMesasMock, insumosIniciales, platosIniciales, configInicial, tagsIniciales, propinaConfigInicial, temaInicial, sucursalesIniciales, categoriasIniciales, deliveryIntegracionesIniciales, fidelidadConfigInicial, recompensasFidelidadIniciales, MESSA_DORADO, VERDE_HEREDADO } from '@/lib/data'
import { generarId, obtenerDispositivoId, formatPrecio } from '@/lib/utils'
import type { Respaldo } from '@/lib/respaldo'
import { normalizarTagRfid } from '@/lib/mesa-codigo'
import { withBasePath } from '@/lib/base-path'

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

export type PermisoAdmin = 'resumen' | 'carta' | 'salon' | 'pedidos' | 'inventario' | 'reservas' | 'finanzas' | 'cobros' | 'caja' | 'delivery' | 'fidelidad' | 'sucursales' | 'usuarios' | 'identidad' | 'bitacora' | 'plataforma'

const PERMISOS_ADMIN_DEFAULT: Record<RolUsuario, PermisoAdmin[]> = {
  creator: ['resumen', 'carta', 'salon', 'pedidos', 'inventario', 'reservas', 'finanzas', 'cobros', 'caja', 'delivery', 'fidelidad', 'sucursales', 'usuarios', 'identidad', 'bitacora', 'plataforma'],
  admin: ['resumen', 'carta', 'salon', 'pedidos', 'inventario', 'reservas', 'finanzas', 'cobros', 'caja', 'delivery', 'fidelidad', 'sucursales', 'usuarios', 'identidad', 'bitacora'],
  // El gerente maneja el turno completo —incluida la caja y la fidelidad— pero
  // no toca la identidad de la marca, las sucursales ni el equipo.
  gerente: ['resumen', 'carta', 'salon', 'pedidos', 'inventario', 'reservas', 'finanzas', 'cobros', 'caja', 'delivery', 'fidelidad'],
  editor: ['resumen', 'carta', 'inventario'],
  staff: ['resumen', 'salon', 'pedidos', 'reservas'],
  // La vitrina entra a todo el panel del restaurante. Lo único que NO ve es
  // la administración de la plataforma: ahí viven los datos de otros clientes.
  vitrina: ['resumen', 'carta', 'salon', 'pedidos', 'inventario', 'reservas', 'finanzas', 'cobros', 'caja', 'delivery', 'fidelidad', 'sucursales', 'usuarios', 'identidad', 'bitacora'],
}

const CATEGORIAS_MESSA_NUEVAS = new Set(['sushi', 'cafes'])

/**
 * Cuántas líneas de bitácora se guardan en el dispositivo. La base conserva
 * todas; esto es sólo para que el almacenamiento del navegador no crezca sin
 * freno en un local que trabaja todos los días.
 */
const TOPE_BITACORA = 400

/**
 * Mantiene únicamente el catálogo editorial aprobado de MESSA. Conserva los
 * datos operativos editables de cada producto conocido, pero fuerza sus assets
 * y su identidad desde la fuente versionada para que una persistencia antigua
 * no pueda volver a introducir fotos rectangulares o productos retirados.
 */
const sincronizarPlatosMessa = (platos: Plato[]) => {
  const persistidos = new Map(platos.map(plato => [plato.id, plato]))

  return ordenarPlatos(platosIniciales.map(aprobado => {
    const persistido = persistidos.get(aprobado.id)
    if (!persistido) return aprobado

    const modificadores = aprobado.modificadores.map(modificadorAprobado => {
      // Un plato que llega de otro dispositivo puede venir incompleto (una
      // versión anterior de la app, un guardado a medias). Antes eso lanzaba y
      // se perdía la carta entera; ahora se cae con elegancia al aprobado.
      const modificadorPersistido = (persistido.modificadores || []).find(modificador => modificador.id === modificadorAprobado.id)
      if (!modificadorPersistido) return modificadorAprobado
      return {
        ...modificadorAprobado,
        ...modificadorPersistido,
        opciones: (modificadorPersistido.opciones || []).map(opcionPersistida => ({
          ...modificadorAprobado.opciones.find(opcion => opcion.id === opcionPersistida.id),
          ...opcionPersistida,
        })),
      }
    })

    // Cada campo cae al valor aprobado si el que llegó no está definido: así un
    // payload parcial actualiza lo que trae y no borra el resto.
    const oSiNo = <T,>(valor: T | undefined, respaldo: T): T => (valor === undefined || valor === null ? respaldo : valor)
    return {
      ...aprobado,
      // El orden lo decide el editor desde el panel, no el catálogo versionado.
      // Antes se tomaba del aprobado y cualquier reordenamiento se perdía al
      // recargar: el sushi volvía solo al medio de los cafés.
      orden: oSiNo(persistido.orden, aprobado.orden),
      precio: oSiNo(persistido.precio, aprobado.precio),
      precio_pendiente: oSiNo(persistido.precio_pendiente, aprobado.precio_pendiente),
      disponible: oSiNo(persistido.disponible, aprobado.disponible),
      destacado: oSiNo(persistido.destacado, aprobado.destacado),
      tiempo_preparacion_minutos: oSiNo(persistido.tiempo_preparacion_minutos, aprobado.tiempo_preparacion_minutos),
      ingredientes: oSiNo(persistido.ingredientes, aprobado.ingredientes),
      insumos_requeridos: oSiNo(persistido.insumos_requeridos, aprobado.insumos_requeridos),
      modificadores,
      tags: oSiNo(persistido.tags, aprobado.tags),
      notas_cocina: oSiNo(persistido.notas_cocina, aprobado.notas_cocina),
      rating: oSiNo(persistido.rating, aprobado.rating),
      total_reviews: oSiNo(persistido.total_reviews, aprobado.total_reviews),
      reviews_muestra: oSiNo(persistido.reviews_muestra, aprobado.reviews_muestra),
    }
  }))
}

/**
 * Deja los platos en el orden que eligió el editor.
 *
 * Se ordena acá, en el store, y no en cada pantalla: la carta pública, la
 * mesa y el panel tienen que mostrar exactamente la misma secuencia. Si cada
 * una ordenara por su cuenta, alcanzaría con que una se olvidara para que el
 * dueño acomode la carta y la gente la siga viendo desordenada.
 */
const ordenarPlatos = (platos: Plato[]) =>
  [...platos].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
const sincronizarInsumosMessa = (insumos: Insumo[]) => [
  ...insumos,
  ...insumosIniciales.filter(inicial => !insumos.some(actual => actual.id === inicial.id)),
]
/**
 * Lleva un tema persistido a la identidad actual: nombre de marca viejo y el
 * verde que se usaba como color primario antes de que el dorado pasara a ser
 * el color por defecto de MESSA. Si el dueño eligió cualquier otro color, se
 * respeta tal cual.
 */
const migrarTema = (tema: Tema): Tema => ({
  ...tema,
  nombre_marca: tema.nombre_marca === 'MenuFlow' ? 'MESSA' : tema.nombre_marca,
  color_primario: tema.color_primario.toLowerCase() === VERDE_HEREDADO.toLowerCase() ? MESSA_DORADO : tema.color_primario,
})

/**
 * Normaliza la versión de código de cada mesa. Las instalaciones anteriores a
 * los QR con código arrancan en la versión 0, que es la que el servidor deriva
 * por defecto.
 */
const sincronizarCodigosDeMesa = (mesas: Mesa[]) => {
  if (mesas.every(mesa => typeof mesa.codigo_version === 'number')) return mesas
  return mesas.map(mesa => typeof mesa.codigo_version === 'number' ? mesa : { ...mesa, codigo_version: 0 })
}

const sincronizarCategoriasMessa = (categorias: Categoria[]) => [
  ...categorias,
  ...categoriasIniciales.filter(categoria => CATEGORIAS_MESSA_NUEVAS.has(categoria.id) && !categorias.some(actual => actual.id === categoria.id)),
]

export interface Reserva {
  id: string; nombre: string; telefono: string; email: string; fecha: string
  hora: string; personas: number; estado: 'pendiente' | 'confirmada' | 'cancelada' | 'completada'
  notas?: string; sucursal_id?: string; created_at: string
  /**
   * Mesa asignada. Sin esto una reserva era sólo una fila en una lista: el
   * mozo no tenía forma de saber, parado frente a la mesa 7, que estaba
   * reservada para las 21:00.
   */
  mesa_id?: string
}

interface Notificacion {
  id: string; tipo: 'info' | 'success' | 'warning' | 'error'; mensaje: string
  mesa_numero?: number; timestamp: string; leida: boolean
}

/**
 * Cada aporte a una cuenta compartida. Antes, elegir "solo lo mío" cobraba la
 * parte de una persona pero cerraba la mesa entera como pagada; ahora los
 * aportes se acumulan y la mesa recién se da por saldada cuando la suma cubre
 * el total.
 */
export interface PagoParcial {
  id: string
  mesa_id: string
  monto: number
  propina: number
  metodo: MetodoPago
  dispositivo_id: string
  cliente_email: string
  created_at: string
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
  /**
   * El restaurante (no la sucursal). Para el equipo, el servidor la toma de
   * su sesión firmada e ignora lo que mande el navegador; acá se guarda para
   * que el comensal —que no tiene sesión— pueda decir de qué local es su QR.
   */
  organizacionActualId: string
  /** Fija a qué restaurante pertenece este dispositivo (lo pone /r/<slug>). */
  setOrganizacionActual: (id: string) => void
  deliveryIntegraciones: ConfigDelivery[]
  gastos: Gasto[]
  costoInsumosConsumidoHistorico: number
  fidelidadConfig: FidelidadConfig
  recompensasFidelidad: RecompensaFidelidad[]
  puntosClientes: Record<string, number>
  resenasEnviadas: Record<string, boolean>
  ultimaCuentaPagada: Record<string, string[]>
  pagosParciales: Record<string, PagoParcial[]>
  permisosAdmin: Record<RolUsuario, PermisoAdmin[]>
  permisosVersion: number

  initStore: () => void
  iniciarSesionMesa: (mesaId: string, mesaNumero: number) => void
  iniciarSesionStaff: (mesaId: string, mesaNumero: number) => void
  iniciarModoVista: () => void
  abandonarMesa: () => void
  setModoPostPago: () => void
  /** Vuelve al modo comensal después de pagar, para seguir pidiendo. */
  reabrirMesa: () => void
  setPaneraAceptada: (opcionId: string | null) => void

  agregarAlCarrito: (plato: Plato, ingRemovidos: string[], notas: string, cantidad?: number, modsElegidos?: string[]) => void
  quitarDelCarrito: (itemId: string) => void
  actualizarCantidad: (itemId: string, cantidad: number) => void
  limpiarCarrito: () => void

  confirmarPedido: (panera?: string | null) => Pedido | null
  marcarComoPagado: (mesaId: string, metodoPago: MetodoPago, propina: number, clienteEmail: string) => void
  registrarPagoParcial: (mesaId: string, monto: number, propina: number, metodoPago: MetodoPago, clienteEmail: string) => { saldado: boolean; restante: number }
  saldoPendienteMesa: (mesaId: string) => { total: number; cubierto: number; restante: number }
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

  // Acceso por QR / RFID
  regenerarCodigoMesa: (mesaId: string) => void
  regenerarCodigosSucursal: (sucursalId: string) => number
  asignarRfidMesa: (mesaId: string, tag: string) => { ok: boolean; error?: string }
  buscarMesaPorRfid: (tag: string) => Mesa | null
  aplicarCodigosDelServidor: (codigos: Record<string, string>) => void

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
  /** Mueve un plato a la posición de otro, respetando el orden del editor. */
  reordenarPlato: (platoId: string, destinoId: string) => void
  toggleDisponible: (platoId: string) => void
  agregarTagDisponible: (tag: string) => void
  eliminarTagDisponible: (tag: string) => void
  agregarCategoria: (nombre: string, emoji: string) => void
  eliminarCategoria: (categoriaId: string) => { ok: boolean; error?: string }

  actualizarConfig: (config: Partial<ConfigRestaurante>) => void
  actualizarPropinaConfig: (cfg: Partial<PropinaConfig>) => void
  actualizarTema: (tema: Partial<Tema>) => void

  actualizarPosicionMesa: (mesaId: string, x: number, y: number) => void
  /** Cambios de layout de una mesa: tamaño, nombre, forma, capacidad. */
  actualizarMesaLayout: (mesaId: string, cambios: Partial<Pick<Mesa, 'nombre' | 'ancho' | 'alto' | 'forma' | 'capacidad' | 'pos_x' | 'pos_y'>>) => void
  /** Comensales sentados que carga el equipo a mano. */
  actualizarComensalesMesa: (mesaId: string, comensales: number) => void
  elementosPlano: ElementoPlano[]
  crearElementoPlano: (tipo: TipoElementoPlano, texto?: string) => void
  asignarMesaAReserva: (reservaId: string, mesaId: string | null) => void
  /**
   * Bitácora: quién hizo qué. Sólo se agrega, nunca se edita ni se borra.
   * Se guardan las últimas `TOPE_BITACORA` en el dispositivo; la base
   * conserva todas.
   */
  bitacora: EventoBitacora[]
  registrarEnBitacora: (evento: Pick<EventoBitacora, 'accion' | 'detalle' | 'area'> & { nivel?: EventoBitacora['nivel'] }) => void
  /** Vuelve a una copia de seguridad. No toca el turno en curso. */
  restaurarRespaldo: (respaldo: Respaldo) => void
  /** Funde en el estado local lo que cambió en otros dispositivos. */
  aplicarEstadoRemoto: (cambios: { id: string; tipo: string; payload: unknown; updated_at: string }[]) => void
  /** Reemplaza un dominio completo (carta, stock, agenda…) con la versión remota. */
  aplicarPaqueteRemoto: (tipo: string, payload: Record<string, unknown>) => void
  /** Arma el paquete de un dominio para mandarlo al resto de los dispositivos. */
  armarPaquete: (tipo: string) => Record<string, unknown> | null
  actualizarElementoPlano: (id: string, cambios: Partial<Omit<ElementoPlano, 'id' | 'sucursal_id' | 'created_at'>>) => void
  eliminarElementoPlano: (id: string) => void
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
      organizacionActualId: 'org-messa',
      deliveryIntegraciones: deliveryIntegracionesIniciales,
      gastos: [],
      costoInsumosConsumidoHistorico: 0,
      fidelidadConfig: fidelidadConfigInicial,
      recompensasFidelidad: recompensasFidelidadIniciales,
      puntosClientes: {},
      resenasEnviadas: {},
      ultimaCuentaPagada: {},
      pagosParciales: {},
      elementosPlano: [],
      permisosAdmin: PERMISOS_ADMIN_DEFAULT,
      permisosVersion: 5,

        initStore: () => {
          set(state => ({
            dispositivoId: obtenerDispositivoId(),
            tema: migrarTema(state.tema),
            platos: sincronizarPlatosMessa(state.platos),
            insumos: sincronizarInsumosMessa(state.insumos),
            categoriasDisponibles: sincronizarCategoriasMessa(state.categoriasDisponibles),
            mesas: sincronizarCodigosDeMesa(state.mesas),
            // v2 devolvió al admin los módulos que una persistencia vieja le
            // había recortado. v3 incorpora el rango 'gerente', que no existía
            // cuando se guardó la matriz: sin esto, un navegador con datos
            // previos deja al gerente sin ningún acceso.
            permisosAdmin: {
              ...state.permisosAdmin,
              ...(state.permisosVersion < 2 ? { admin: PERMISOS_ADMIN_DEFAULT.admin } : {}),
              // v4 trae la bitácora: se la damos a quien ya tenía control total.
              ...(state.permisosVersion < 4 ? { creator: PERMISOS_ADMIN_DEFAULT.creator, admin: PERMISOS_ADMIN_DEFAULT.admin } : {}),
              // Los rangos que se agregaron después de guardar la matriz se
              // reponen siempre, no por número de versión: un navegador con
              // datos viejos los dejaría sin ningún acceso, y el síntoma
              // ("no tenés permisos") no dice de dónde viene.
              gerente: state.permisosAdmin?.gerente || PERMISOS_ADMIN_DEFAULT.gerente,
              vitrina: state.permisosAdmin?.vitrina || PERMISOS_ADMIN_DEFAULT.vitrina,
            },
            // Antes quedaba clavado en 3 y las migraciones de la 4 se repetían
            // en cada arranque. Ahora sí avanza.
            permisosVersion: 5,
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
            tema: migrarTema(state.tema),
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

      /**
       * Vuelve a abrir la mesa después de pagar.
       *
       * Pagar no es irse. Una sobremesa termina en café y postre la mitad de
       * las veces, y hasta ahora la cuenta pagada dejaba la carta en modo
       * lectura: el comensal tenía que llamar al mozo para pedir algo más,
       * que es exactamente lo que esta app venía a evitar. Lo que sigue es una
       * cuenta nueva; la anterior ya está cerrada y no se toca.
       */
      reabrirMesa: () => set(s => (
        s.sesion && s.sesion.modo === 'post_pago'
          ? { sesion: { ...s.sesion, modo: 'comensal' as const }, carrito: [] }
          : {}
      )),
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
        const huboAportesParciales = (get().pagosParciales[mesaId] || []).length > 0
        set(s => ({ pedidos: updatedPedidos, mesas: updatedMesas, ultimaCuentaPagada: pedidosCobrados.length ? { ...s.ultimaCuentaPagada, [mesaId]: pedidosCobrados } : s.ultimaCuentaPagada }))
        // Si la cuenta se pagó en partes, cada aporte ya sumó sus propios
        // puntos; volver a otorgarlos sobre el total los duplicaría.
        if (clienteEmail && !huboAportesParciales && get().fidelidadConfig.habilitado) {
          const puntos = Math.floor((totalCobrado / 1000) * get().fidelidadConfig.puntos_por_1000_gastado)
          if (puntos > 0) get().otorgarPuntos(clienteEmail, puntos)
        }
        const numero = get().mesas.find(m => m.id === mesaId)?.numero
        if (metodoPago === 'transferencia') get().agregarNotificacion('warning', 'Transferencia recibida — verificar acreditación', numero)
        else get().agregarNotificacion('success', `Pago confirmado (${metodoPago}) — mesa lista para liberar`, numero)
      },

      saldoPendienteMesa: (mesaId) => {
        const total = get().pedidos
          .filter(p => p.mesa_id === mesaId && p.estado !== 'cancelado' && p.estado !== 'pagado')
          .reduce((acumulado, pedido) => acumulado + pedido.total, 0)
        const cubierto = (get().pagosParciales[mesaId] || []).reduce((acumulado, pago) => acumulado + pago.monto, 0)
        return { total, cubierto, restante: Math.max(0, total - cubierto) }
      },

      registrarPagoParcial: (mesaId, monto, propina, metodoPago, clienteEmail) => {
        const pago: PagoParcial = {
          id: generarId(),
          mesa_id: mesaId,
          monto,
          propina,
          metodo: metodoPago,
          dispositivo_id: get().dispositivoId,
          cliente_email: clienteEmail.trim().toLowerCase(),
          created_at: new Date().toISOString(),
        }
        set(s => ({ pagosParciales: { ...s.pagosParciales, [mesaId]: [...(s.pagosParciales[mesaId] || []), pago] } }))

        // Los puntos se otorgan aporte por aporte, así cada comensal suma por lo
        // que realmente pagó. `marcarComoPagado` lo detecta y no vuelve a
        // sumarlos al cerrar la cuenta.
        if (clienteEmail && get().fidelidadConfig.habilitado) {
          const puntos = Math.floor(((monto + propina) / 1000) * get().fidelidadConfig.puntos_por_1000_gastado)
          if (puntos > 0) get().otorgarPuntos(clienteEmail, puntos)
        }

        const numero = get().mesas.find(m => m.id === mesaId)?.numero
        const { total, cubierto } = get().saldoPendienteMesa(mesaId)
        // Un peso de tolerancia: los redondeos de "partes iguales" no deberían
        // dejar la mesa abierta por diferencias de centavos.
        const restante = Math.max(0, total - cubierto)

        if (restante <= 1) {
          get().marcarComoPagado(mesaId, metodoPago, propina, clienteEmail)
          return { saldado: true, restante: 0 }
        }

        get().actualizarMesa(mesaId, 'pagando')
        get().agregarNotificacion('info', `Aporte de ${Math.round(monto).toLocaleString('es-AR')} recibido — faltan ${Math.round(restante).toLocaleString('es-AR')}`, numero)
        return { saldado: false, restante }
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
          // La próxima mesa arranca con la cuenta en cero, sin arrastrar los
          // aportes parciales del grupo anterior.
          pagosParciales: { ...s.pagosParciales, [mesaId]: [] },
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
        // Anular un pedido saca plata de la caja del día: queda registrado con
        // el monto, porque es la maniobra clásica para tapar un faltante.
        get().registrarEnBitacora({
          area: 'pedidos',
          nivel: 'alerta',
          accion: 'Anuló un pedido',
          detalle: pedido ? `Mesa ${pedido.mesa_numero} · ${formatPrecio(pedido.total)}` : 'Pedido no encontrado',
        })
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

      // ── ACCESO POR QR / RFID ──
      // El código de cada mesa lo deriva el servidor a partir de su id y de
      // `codigo_version` (ver lib/mesa-codigo-server.ts). Acá sólo se guarda la
      // versión vigente y una copia del código para poder dibujar el QR y la
      // hoja de impresión sin volver a pedirlo.
      regenerarCodigoMesa: (mesaId) => {
        set(s => ({
          mesas: s.mesas.map(m => m.id === mesaId
            ? { ...m, codigo_version: (m.codigo_version || 0) + 1, codigo_acceso: undefined, updated_at: new Date().toISOString() }
            : m),
        }))
        const numero = get().mesas.find(m => m.id === mesaId)?.numero
        get().agregarNotificacion('warning', 'Código de mesa regenerado — hay que reimprimir su QR', numero)
      },

      regenerarCodigosSucursal: (sucursalId) => {
        const alcanzadas = get().mesas.filter(m => m.sucursal_id === sucursalId)
        set(s => ({
          mesas: s.mesas.map(m => m.sucursal_id === sucursalId
            ? { ...m, codigo_version: (m.codigo_version || 0) + 1, codigo_acceso: undefined, updated_at: new Date().toISOString() }
            : m),
        }))
        get().agregarNotificacion('warning', `${alcanzadas.length} códigos regenerados — reimprimí todos los QR de la sucursal`)
        return alcanzadas.length
      },

      asignarRfidMesa: (mesaId, tag) => {
        const limpio = normalizarTagRfid(tag)
        if (limpio && limpio.length < 4) return { ok: false, error: 'El identificador del tag es demasiado corto' }
        const ocupado = get().mesas.find(m => m.id !== mesaId && m.rfid_tag && m.rfid_tag === limpio)
        if (ocupado) return { ok: false, error: `Ese tag ya está vinculado a la Mesa ${ocupado.numero}` }
        set(s => ({ mesas: s.mesas.map(m => m.id === mesaId ? { ...m, rfid_tag: limpio || undefined, updated_at: new Date().toISOString() } : m) }))
        return { ok: true }
      },

      buscarMesaPorRfid: (tag) => {
        const limpio = normalizarTagRfid(tag)
        return limpio ? get().mesas.find(m => m.rfid_tag === limpio) || null : null
      },

      aplicarCodigosDelServidor: (codigos) => {
        set(s => ({
          mesas: s.mesas.map(m => codigos[m.id] && codigos[m.id] !== m.codigo_acceso
            ? { ...m, codigo_acceso: codigos[m.id] }
            : m),
        }))
      },

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

      actualizarPlato: (plato) => {
        const anterior = get().platos.find(p => p.id === plato.id)
        set(s => ({ platos: s.platos.map(p => p.id === plato.id ? { ...plato, precio_pendiente: plato.precio > 0 ? false : plato.precio_pendiente } : p) }))
        // Sólo se anota el cambio de precio. Corregir una descripción no le
        // interesa a nadie; que un plato pase de 8.400 a 3.000, sí.
        if (anterior && anterior.precio !== plato.precio) {
          get().registrarEnBitacora({
            area: 'carta',
            nivel: 'aviso',
            accion: 'Cambió un precio',
            detalle: `${plato.nombre}: ${formatPrecio(anterior.precio)} → ${formatPrecio(plato.precio)}`,
          })
        }
      },
      agregarPlato: (platoData) => {
        const plato: Plato = { ...platoData, id: 'p' + generarId(), rating: 0, total_reviews: 0 }
        set(s => ({ platos: [...s.platos, plato] }))
        get().registrarEnBitacora({ area: 'carta', accion: 'Agregó un plato', detalle: `${plato.nombre} · ${formatPrecio(plato.precio)}` })
      },
      eliminarPlato: (platoId) => {
        const plato = get().platos.find(p => p.id === platoId)
        set(s => ({ platos: s.platos.filter(p => p.id !== platoId) }))
        get().registrarEnBitacora({ area: 'carta', nivel: 'aviso', accion: 'Retiró un plato de la carta', detalle: plato?.nombre || platoId })
      },
      toggleDestacado: (platoId) => set(s => ({ platos: s.platos.map(p => p.id === platoId ? { ...p, destacado: !p.destacado } : p) })),

      reordenarPlato: (platoId, destinoId) => {
        if (platoId === destinoId) return
        set(s => {
          const ordenados = ordenarPlatos(s.platos)
          const desde = ordenados.findIndex(p => p.id === platoId)
          const hasta = ordenados.findIndex(p => p.id === destinoId)
          if (desde < 0 || hasta < 0) return {}
          const [movido] = ordenados.splice(desde, 1)
          ordenados.splice(hasta, 0, movido)
          // Se renumera todo de diez en diez: deja lugar para insertar entre
          // dos platos sin tener que reescribir la lista entera cada vez.
          return { platos: ordenados.map((p, i) => ({ ...p, orden: (i + 1) * 10 })) }
        })
      },
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
        const nueva: Mesa = { id: 'm' + generarId(), numero: siguienteNumero, estado: 'libre', dispositivos: [], pos_x: 50, pos_y: 50, forma, capacidad, sucursal_id: sucursalActualId, codigo_version: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
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

      actualizarMesaLayout: (mesaId, cambios) => set(s => ({
        mesas: s.mesas.map(m => m.id === mesaId ? {
          ...m,
          ...cambios,
          // El tamaño se acota para que una mesa no pueda desbordar el plano ni
          // volverse tan chica que deje de poder tocarse en un celular.
          ...(cambios.ancho !== undefined ? { ancho: Math.max(5, Math.min(45, cambios.ancho)) } : {}),
          ...(cambios.alto !== undefined ? { alto: Math.max(5, Math.min(45, cambios.alto)) } : {}),
          ...(cambios.capacidad !== undefined ? { capacidad: Math.max(1, Math.min(30, Math.round(cambios.capacidad))) } : {}),
          ...(cambios.nombre !== undefined ? { nombre: cambios.nombre.trim().slice(0, 28) } : {}),
          updated_at: new Date().toISOString(),
        } : m),
      })),

      actualizarComensalesMesa: (mesaId, comensales) => set(s => ({
        mesas: s.mesas.map(m => m.id === mesaId
          ? { ...m, comensales: Math.max(0, Math.min(40, Math.round(comensales))), updated_at: new Date().toISOString() }
          : m),
      })),

      crearElementoPlano: (tipo, texto) => {
        const { sucursalActualId } = get()
        // Cada tipo entra con la proporción que tiene sentido para lo que
        // representa: una pared es larga y fina, una columna es un cuadrado.
        const medidas: Record<TipoElementoPlano, { ancho: number; alto: number }> = {
          pared: { ancho: 32, alto: 3 },
          barra: { ancho: 26, alto: 7 },
          columna: { ancho: 7, alto: 7 },
          puerta: { ancho: 12, alto: 3 },
          planta: { ancho: 7, alto: 7 },
          etiqueta: { ancho: 18, alto: 7 },
        }
        const elemento: ElementoPlano = {
          id: 'el' + generarId(),
          sucursal_id: sucursalActualId,
          tipo,
          texto: tipo === 'etiqueta' ? (texto || 'Cocina') : texto,
          pos_x: 50,
          pos_y: 50,
          ...medidas[tipo],
          rotacion: 0,
          created_at: new Date().toISOString(),
        }
        set(s => ({ elementosPlano: [...s.elementosPlano, elemento] }))
      },

      actualizarElementoPlano: (id, cambios) => set(s => ({
        elementosPlano: s.elementosPlano.map(el => el.id === id ? {
          ...el,
          ...cambios,
          ...(cambios.pos_x !== undefined ? { pos_x: Math.max(0, Math.min(100, cambios.pos_x)) } : {}),
          ...(cambios.pos_y !== undefined ? { pos_y: Math.max(0, Math.min(100, cambios.pos_y)) } : {}),
          ...(cambios.ancho !== undefined ? { ancho: Math.max(3, Math.min(100, cambios.ancho)) } : {}),
          ...(cambios.alto !== undefined ? { alto: Math.max(2, Math.min(100, cambios.alto)) } : {}),
        } : el),
      })),

      eliminarElementoPlano: (id) => set(s => ({ elementosPlano: s.elementosPlano.filter(el => el.id !== id) })),

      asignarMesaAReserva: (reservaId, mesaId) => set(s => ({
        reservas: s.reservas.map(r => r.id === reservaId ? { ...r, mesa_id: mesaId || undefined } : r),
      })),

      armarPaquete: (tipo) => {
        const s = get()
        // Cada dominio agrupa exactamente lo que se edita junto en una pantalla.
        if (tipo === 'carta') return { platos: s.platos, categoriasDisponibles: s.categoriasDisponibles, tagsDisponibles: s.tagsDisponibles }
        if (tipo === 'stock') return { insumos: s.insumos }
        if (tipo === 'agenda') return { reservas: s.reservas }
        if (tipo === 'finanzas') return { gastos: s.gastos, cierres: s.cierres, costoInsumosConsumidoHistorico: s.costoInsumosConsumidoHistorico }
        if (tipo === 'ajustes') return {
          config: s.config, tema: s.tema, propinaConfig: s.propinaConfig,
          fidelidadConfig: s.fidelidadConfig, recompensasFidelidad: s.recompensasFidelidad,
          permisosAdmin: s.permisosAdmin, deliveryIntegraciones: s.deliveryIntegraciones,
          sucursales: s.sucursales,
        }
        return null
      },

      aplicarPaqueteRemoto: (tipo, payload) => {
        if (!payload || typeof payload !== 'object') return
        try {
        set(() => {
          if (tipo === 'carta') {
            const platos = Array.isArray(payload.platos) ? payload.platos as Plato[] : undefined
            return {
              // El catálogo aprobado se vuelve a imponer sobre lo que llega: si
              // un dispositivo viejo mandara platos retirados, no reaparecen.
              ...(platos ? { platos: sincronizarPlatosMessa(platos) } : {}),
              ...(Array.isArray(payload.categoriasDisponibles) ? { categoriasDisponibles: payload.categoriasDisponibles as Categoria[] } : {}),
              ...(Array.isArray(payload.tagsDisponibles) ? { tagsDisponibles: payload.tagsDisponibles as string[] } : {}),
            }
          }
          if (tipo === 'stock') return Array.isArray(payload.insumos) ? { insumos: payload.insumos as Insumo[] } : {}
          if (tipo === 'agenda') return Array.isArray(payload.reservas) ? { reservas: payload.reservas as Reserva[] } : {}
          if (tipo === 'finanzas') return {
            ...(Array.isArray(payload.gastos) ? { gastos: payload.gastos as Gasto[] } : {}),
            ...(Array.isArray(payload.cierres) ? { cierres: payload.cierres as CierreDiario[] } : {}),
            ...(typeof payload.costoInsumosConsumidoHistorico === 'number' ? { costoInsumosConsumidoHistorico: payload.costoInsumosConsumidoHistorico } : {}),
          }
          if (tipo === 'ajustes') return {
            ...(payload.config ? { config: payload.config as ConfigRestaurante } : {}),
            ...(payload.tema ? { tema: migrarTema(payload.tema as Tema) } : {}),
            ...(payload.propinaConfig ? { propinaConfig: payload.propinaConfig as PropinaConfig } : {}),
            ...(payload.fidelidadConfig ? { fidelidadConfig: payload.fidelidadConfig as FidelidadConfig } : {}),
            ...(Array.isArray(payload.recompensasFidelidad) ? { recompensasFidelidad: payload.recompensasFidelidad as RecompensaFidelidad[] } : {}),
            // Se funde SOBRE los de fábrica, no los reemplaza: un rango
            // agregado en una versión nueva no existe en la copia guardada, y
            // sustituir la matriz entera lo dejaría sin ningún acceso. El
            // síntoma —"no tenés permisos"— no dice de dónde viene.
            ...(payload.permisosAdmin ? {
              permisosAdmin: {
                ...PERMISOS_ADMIN_DEFAULT,
                ...(payload.permisosAdmin as Record<RolUsuario, PermisoAdmin[]>),
              },
            } : {}),
            ...(Array.isArray(payload.deliveryIntegraciones) ? { deliveryIntegraciones: payload.deliveryIntegraciones as ConfigDelivery[] } : {}),
            ...(Array.isArray(payload.sucursales) ? { sucursales: payload.sucursales as Sucursal[] } : {}),
          }
          return {}
        })
        } catch (error) {
          // Un paquete corrupto de otro dispositivo no puede dejar la pantalla
          // en blanco: se descarta y se sigue con lo que había.
          console.error(`No se pudo aplicar el paquete "${tipo}"`, error)
        }
      },

      bitacora: [],

      registrarEnBitacora: ({ accion, detalle, area, nivel = 'normal' }) => {
        const s = get()
        const quien = s.sesionAdmin
        const evento: EventoBitacora = {
          id: generarId(),
          accion,
          detalle,
          area,
          nivel,
          // Si no hay sesión el cambio vino de un comensal en su mesa: se deja
          // constancia igual, porque "no sé quién fue" también es información.
          actor_nombre: quien?.nombre || 'Comensal',
          actor_email: quien?.email || '',
          actor_rol: quien?.rol || 'comensal',
          sucursal_id: s.sucursalActualId,
          created_at: new Date().toISOString(),
        }
        set(estado => ({ bitacora: [evento, ...estado.bitacora].slice(0, TOPE_BITACORA) }))
      },

      restaurarRespaldo: (respaldo) => {
        const { datos } = respaldo
        set(s => ({
          // Cada campo se aplica sólo si vino con la forma correcta: una copia
          // vieja o recortada no puede dejar la app sin carta ni sin config.
          ...(Array.isArray(datos.platos) ? { platos: sincronizarPlatosMessa(datos.platos as Plato[]) } : {}),
          ...(Array.isArray(datos.categoriasDisponibles) ? { categoriasDisponibles: datos.categoriasDisponibles as Categoria[] } : {}),
          ...(Array.isArray(datos.tagsDisponibles) ? { tagsDisponibles: datos.tagsDisponibles as string[] } : {}),
          ...(Array.isArray(datos.insumos) ? { insumos: datos.insumos as Insumo[] } : {}),
          ...(Array.isArray(datos.reservas) ? { reservas: datos.reservas as Reserva[] } : {}),
          ...(Array.isArray(datos.gastos) ? { gastos: datos.gastos as Gasto[] } : {}),
          ...(Array.isArray(datos.cierres) ? { cierres: datos.cierres as CierreDiario[] } : {}),
          ...(Array.isArray(datos.elementosPlano) ? { elementosPlano: datos.elementosPlano as ElementoPlano[] } : {}),
          ...(Array.isArray(datos.sucursales) ? { sucursales: datos.sucursales as Sucursal[] } : {}),
          ...(datos.config ? { config: datos.config as ConfigRestaurante } : {}),
          ...(datos.tema ? { tema: migrarTema(datos.tema as Tema) } : {}),
          ...(datos.propinaConfig ? { propinaConfig: datos.propinaConfig as PropinaConfig } : {}),
          ...(datos.fidelidadConfig ? { fidelidadConfig: datos.fidelidadConfig as FidelidadConfig } : {}),
          ...(Array.isArray(datos.recompensasFidelidad) ? { recompensasFidelidad: datos.recompensasFidelidad as RecompensaFidelidad[] } : {}),
          ...(Array.isArray(datos.deliveryIntegraciones) ? { deliveryIntegraciones: datos.deliveryIntegraciones as ConfigDelivery[] } : {}),
          // El plano de las mesas se recupera, pero NO su estado: si ahora hay
          // gente sentada, una copia de anteayer no puede dejarlas libres.
          ...(Array.isArray(datos.mesas) ? {
            mesas: s.mesas.map(actual => {
              const guardada = (datos.mesas as Mesa[]).find(m => m.id === actual.id)
              if (!guardada) return actual
              const { nombre, pos_x, pos_y, ancho, alto, forma, capacidad } = guardada
              return { ...actual, nombre, pos_x, pos_y, ancho, alto, forma, capacidad }
            }),
          } : {}),
        }))
        get().registrarEnBitacora({
          area: 'sistema',
          nivel: 'alerta',
          accion: 'Restauró una copia de seguridad',
          detalle: `Copia del ${new Date(respaldo.creado_en).toLocaleString('es-AR')}`,
        })
      },

      aplicarEstadoRemoto: (cambios) => {
        if (!cambios.length) return
        set(s => {
          // Índices por id para no recorrer el array entero por cada cambio.
          const mesas = new Map(s.mesas.map(m => [m.id, m]))
          const pedidos = new Map(s.pedidos.map(p => [p.id, p]))
          const llamados = new Map(s.llamadosMozo.map(l => [l.id, l]))
          const elementos = new Map(s.elementosPlano.map(e => [e.id, e]))
          const bitacora = new Map(s.bitacora.map(e => [e.id, e]))
          let tocoMesas = false, tocoPedidos = false, tocoLlamados = false, tocoElementos = false, tocoBitacora = false

          const masNuevo = (local: { updated_at?: string; created_at?: string } | undefined, remotoSello: string) => {
            if (!local) return true
            const localSello = local.updated_at || local.created_at || ''
            // Ante empate gana lo local: si los dos relojes marcan lo mismo, el
            // dispositivo que está usando la persona no debería parpadear.
            return remotoSello > localSello
          }

          for (const cambio of cambios) {
            if (cambio.tipo === 'mesa') {
              const remoto = cambio.payload as Mesa
              if (!masNuevo(mesas.get(cambio.id), cambio.updated_at)) continue
              mesas.set(cambio.id, remoto)
              tocoMesas = true
            } else if (cambio.tipo === 'pedido') {
              const remoto = cambio.payload as Pedido
              if (!masNuevo(pedidos.get(cambio.id), cambio.updated_at)) continue
              pedidos.set(cambio.id, remoto)
              tocoPedidos = true
            } else if (cambio.tipo === 'bitacora') {
              // Sólo se agrega. Una línea que ya está no se toca nunca: el
              // valor de la bitácora es justamente que nadie la pueda reescribir.
              if (bitacora.has(cambio.id)) continue
              bitacora.set(cambio.id, cambio.payload as EventoBitacora)
              tocoBitacora = true
            } else if (cambio.tipo === 'elemento') {
              const remoto = cambio.payload as ElementoPlano
              const local = elementos.get(cambio.id)
              if (local && cambio.updated_at <= (local.created_at || '')) continue
              elementos.set(cambio.id, remoto)
              tocoElementos = true
            } else {
              const remoto = cambio.payload as LlamadoMozo
              const local = llamados.get(cambio.id)
              // Un llamado ya atendido no vuelve a estar pendiente: si dos
              // dispositivos lo tocaron, "atendido" es el estado final.
              if (local?.atendido && !remoto.atendido) continue
              if (local && !masNuevo({ created_at: local.created_at }, cambio.updated_at) && local.atendido === remoto.atendido) continue
              llamados.set(cambio.id, remoto)
              tocoLlamados = true
            }
          }

          return {
            ...(tocoMesas ? { mesas: [...mesas.values()] } : {}),
            ...(tocoPedidos ? { pedidos: [...pedidos.values()] } : {}),
            ...(tocoLlamados ? { llamadosMozo: [...llamados.values()] } : {}),
            ...(tocoElementos ? { elementosPlano: [...elementos.values()] } : {}),
            ...(tocoBitacora ? {
              bitacora: [...bitacora.values()]
                .sort((a, b) => b.created_at.localeCompare(a.created_at))
                .slice(0, TOPE_BITACORA),
            } : {}),
          }
        })
      },

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
        get().registrarEnBitacora({
          area: 'caja',
          accion: 'Cerró la caja',
          detalle: `${formatPrecio(totalVentas)} en ${pedidosHoy.length} pedidos · ${mesasAtendidas} mesas`,
        })
        return cierre
      },

      crearReserva: (r) => { const reserva: Reserva = { ...r, id: generarId(), estado: 'pendiente', created_at: new Date().toISOString() }; set(s => ({ reservas: [...s.reservas, reserva] })) },
      cancelarReserva: (id) => {
        const reserva = get().reservas.find(r => r.id === id)
        set(s => ({ reservas: s.reservas.map(r => r.id === id ? { ...r, estado: 'cancelada' as const } : r) }))
        get().registrarEnBitacora({
          area: 'reservas',
          accion: 'Canceló una reserva',
          detalle: reserva ? `${reserva.nombre} · ${reserva.fecha} ${reserva.hora} · ${reserva.personas} personas` : id,
        })
      },
      confirmarReserva: (id) => set(s => ({ reservas: s.reservas.map(r => r.id === id ? { ...r, estado: 'confirmada' as const } : r) })),

      agregarNotificacion: (tipo, mensaje, mesa_numero) => {
        const n = { id: generarId(), tipo, mensaje, mesa_numero, timestamp: new Date().toISOString(), leida: false }
        set(s => ({ notificaciones: [n, ...s.notificaciones].slice(0, 100) }))
      },
      marcarNotificacionLeida: (id) => set(s => ({ notificaciones: s.notificaciones.map(n => n.id === id ? { ...n, leida: true } : n) })),
      limpiarNotificaciones: () => set({ notificaciones: [] }),

      setOrganizacionActual: (id) => set(estado => (
        estado.organizacionActualId === id
          ? {}
          // Cambiar de restaurante invalida todo lo que había en el
          // dispositivo: la carta, las mesas y el carrito son de otro local.
          : { organizacionActualId: id, carrito: [], sesion: null }
      )),
      setSesionAdmin: (s) => set({ sesionAdmin: s }),

      logoutAdmin: async () => {
        try { await fetch(withBasePath('/api/auth/logout'), { method: 'POST' }) } catch { /* red caída: igual limpiamos el estado local */ }
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
      agregarGasto: (g) => {
        const gasto: Gasto = { ...g, id: generarId(), created_at: new Date().toISOString() }
        set(s => ({ gastos: [...s.gastos, gasto] }))
        get().registrarEnBitacora({ area: 'caja', accion: 'Registró un gasto', detalle: `${gasto.descripcion} · ${formatPrecio(gasto.monto)}` })
      },
      eliminarGasto: (id) => {
        const gasto = get().gastos.find(g => g.id === id)
        set(s => ({ gastos: s.gastos.filter(g => g.id !== id) }))
        // Borrar un gasto ya cargado cambia el resultado del día: va como aviso.
        get().registrarEnBitacora({
          area: 'caja',
          nivel: 'aviso',
          accion: 'Borró un gasto',
          detalle: gasto ? `${gasto.descripcion} · ${formatPrecio(gasto.monto)}` : id,
        })
      },

      // ── FIDELIDAD ──
      actualizarFidelidadConfig: (cfg) => set(s => ({ fidelidadConfig: { ...s.fidelidadConfig, ...cfg } })),
      agregarRecompensa: (r) => { const rec: RecompensaFidelidad = { ...r, id: generarId() }; set(s => ({ recompensasFidelidad: [...s.recompensasFidelidad, rec] })) },
      eliminarRecompensa: (id) => set(s => ({ recompensasFidelidad: s.recompensasFidelidad.filter(r => r.id !== id) })),
      // Acepta valores negativos para poder canjear una recompensa desde el
      // panel, pero el saldo nunca queda por debajo de cero.
      otorgarPuntos: (email, puntos) => {
        const key = email.trim().toLowerCase()
        if (!key) return
        set(s => ({ puntosClientes: { ...s.puntosClientes, [key]: Math.max(0, (s.puntosClientes[key] || 0) + puntos) } }))
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
    { name: MESSA_STORAGE_KEY, partialize: s => ({ dispositivoId: s.dispositivoId, sesion: s.sesion, carrito: s.carrito, mesas: s.mesas, pedidos: s.pedidos, reservas: s.reservas, platos: s.platos, insumos: s.insumos, config: s.config, cierres: s.cierres, notificaciones: s.notificaciones, tagsDisponibles: s.tagsDisponibles, categoriasDisponibles: s.categoriasDisponibles, propinaConfig: s.propinaConfig, tema: s.tema, llamadosMozo: s.llamadosMozo, sucursales: s.sucursales, sucursalActualId: s.sucursalActualId, deliveryIntegraciones: s.deliveryIntegraciones, gastos: s.gastos, costoInsumosConsumidoHistorico: s.costoInsumosConsumidoHistorico, fidelidadConfig: s.fidelidadConfig, recompensasFidelidad: s.recompensasFidelidad, puntosClientes: s.puntosClientes, resenasEnviadas: s.resenasEnviadas, ultimaCuentaPagada: s.ultimaCuentaPagada, pagosParciales: s.pagosParciales, elementosPlano: s.elementosPlano, permisosAdmin: s.permisosAdmin, permisosVersion: s.permisosVersion, paneraPromptShown: s.paneraPromptShown, panera_aceptada: s.panera_aceptada }) }
  )
)
