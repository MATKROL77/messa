import type {
  Categoria, CierreDiario, ConfigDelivery, ConfigRestaurante, ElementoPlano,
  FidelidadConfig, Gasto, Insumo, Mesa, Plato, PropinaConfig, RecompensaFidelidad,
  Sucursal, Tema,
} from '@/types'

/**
 * Copia de seguridad del restaurante.
 *
 * Guarda lo que se construye a lo largo del tiempo —la carta, el inventario,
 * las reservas, el plano, la configuración— y deja afuera lo del turno en
 * curso: pedidos, estado de las mesas y llamados. Restaurar una copia de
 * anteayer no puede vaciar las mesas que están ocupadas ahora mismo.
 *
 * El archivo es JSON legible a propósito. Si algún día MESSA no existiera, el
 * dueño tiene que poder abrir su copia y ver sus datos.
 */

/** Sube cuando cambia la forma del archivo, para poder rechazar los ilegibles. */
export const VERSION_RESPALDO = 1

export interface Respaldo {
  version: number
  creado_en: string
  restaurante?: string
  datos: {
    platos?: Plato[]
    categoriasDisponibles?: Categoria[]
    tagsDisponibles?: string[]
    insumos?: Insumo[]
    reservas?: unknown[]
    gastos?: Gasto[]
    cierres?: CierreDiario[]
    mesas?: Mesa[]
    elementosPlano?: ElementoPlano[]
    sucursales?: Sucursal[]
    config?: ConfigRestaurante
    tema?: Tema
    propinaConfig?: PropinaConfig
    fidelidadConfig?: FidelidadConfig
    recompensasFidelidad?: RecompensaFidelidad[]
    deliveryIntegraciones?: ConfigDelivery[]
  }
}

/** Las claves que viajan en la copia. Una sola lista, usada al guardar y al leer. */
export const CLAVES_RESPALDO = [
  'platos', 'categoriasDisponibles', 'tagsDisponibles', 'insumos', 'reservas',
  'gastos', 'cierres', 'mesas', 'elementosPlano', 'sucursales', 'config', 'tema',
  'propinaConfig', 'fidelidadConfig', 'recompensasFidelidad', 'deliveryIntegraciones',
] as const

export function armarRespaldo(estado: object): Respaldo {
  const fuente = estado as Record<string, unknown>
  const datos: Record<string, unknown> = {}
  for (const clave of CLAVES_RESPALDO) {
    const valor = fuente[clave]
    if (valor !== undefined) datos[clave] = valor
  }
  return {
    version: VERSION_RESPALDO,
    creado_en: new Date().toISOString(),
    restaurante: (fuente.config as ConfigRestaurante | undefined)?.nombre,
    datos: datos as Respaldo['datos'],
  }
}

export function nombreDeArchivoRespaldo(): string {
  const ahora = new Date()
  const sello = ahora.toISOString().slice(0, 16).replace('T', '-').replace(':', '')
  return `messa-copia-${sello}.json`
}

/**
 * Lee un archivo elegido por el usuario. Tira un error con un mensaje que se
 * pueda mostrar en pantalla: acá "no se pudo" no alcanza, la persona necesita
 * saber si eligió el archivo equivocado o si la copia está rota.
 */
export function leerRespaldo(texto: string): Respaldo {
  let crudo: unknown
  try {
    crudo = JSON.parse(texto)
  } catch {
    throw new Error('El archivo no es una copia de MESSA')
  }
  if (!crudo || typeof crudo !== 'object') throw new Error('El archivo no es una copia de MESSA')

  const posible = crudo as Partial<Respaldo>
  if (typeof posible.version !== 'number' || !posible.datos || typeof posible.datos !== 'object') {
    throw new Error('El archivo no es una copia de MESSA')
  }
  if (posible.version > VERSION_RESPALDO) {
    throw new Error('La copia viene de una versión más nueva de MESSA')
  }
  return {
    version: posible.version,
    creado_en: typeof posible.creado_en === 'string' ? posible.creado_en : new Date().toISOString(),
    restaurante: typeof posible.restaurante === 'string' ? posible.restaurante : undefined,
    datos: posible.datos,
  }
}
