'use client'

import { codigosCoinciden } from '@/lib/mesa-codigo'
import { codigoDeVistaPrevia, MODO_VISTA_PREVIA } from '@/lib/mesa-codigo-preview'
import { withBasePath } from '@/lib/base-path'
import type { Mesa } from '@/types'

/**
 * Cliente del control de acceso a las mesas.
 *
 * La verificación real ocurre en `/api/mesa/acceso`: el navegador no conoce la
 * clave con la que se derivan los códigos, así que no puede fabricarse el de
 * otra mesa. Si esa ruta no está disponible (por ejemplo en una publicación
 * estática de vista previa) se cae a comparar contra el código que la propia
 * instalación guardó, que sirve para probar la experiencia aunque no sea una
 * verificación del servidor.
 *
 * Además recuerda en el dispositivo qué mesas ya validó, para que refrescar la
 * página —o volver desde el checkout de Mercado Pago— no obligue a escanear el
 * QR de nuevo. Eso es una comodidad, no una credencial: el código se vuelve a
 * validar en cada apertura.
 */

const CLAVE = 'messa-acceso-mesas'
const VIGENCIA_MS = 1000 * 60 * 60 * 8 // un turno largo de servicio

type Concedidos = Record<string, { codigo: string; ts: number }>

function leer(): Concedidos {
  if (typeof window === 'undefined') return {}
  try {
    const crudo = window.localStorage.getItem(CLAVE)
    if (!crudo) return {}
    const datos = JSON.parse(crudo) as Concedidos
    const ahora = Date.now()
    return Object.fromEntries(Object.entries(datos).filter(([, valor]) => ahora - valor.ts < VIGENCIA_MS))
  } catch {
    return {}
  }
}

function escribir(datos: Concedidos) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(datos))
  } catch {
    // El almacenamiento puede estar bloqueado (modo privado). El comensal
    // simplemente vuelve a escanear el QR; nada más se rompe.
  }
}

export function recordarAcceso(mesaId: string, codigo: string) {
  escribir({ ...leer(), [mesaId]: { codigo, ts: Date.now() } })
}

export function accesoRecordado(mesaId: string): string | null {
  return leer()[mesaId]?.codigo ?? null
}

export function olvidarAcceso(mesaId: string) {
  const datos = leer()
  delete datos[mesaId]
  escribir(datos)
}

interface RespuestaAcceso {
  ok?: boolean
  mesaId?: string
  version?: number
  error?: string
}

/** Valida un código contra una mesa concreta. */
export async function validarCodigoDeMesa(mesaId: string, codigo: string, mesas: Mesa[]): Promise<boolean> {
  if (MODO_VISTA_PREVIA) {
    const mesa = mesas.find(item => item.id === mesaId)
    return Boolean(mesa) && codigosCoinciden(codigoDeVistaPrevia(mesaId, mesa?.codigo_version || 0), codigo)
  }
  try {
    const respuesta = await fetch(withBasePath('/api/mesa/acceso'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mesaId, codigo }),
    })
    if (respuesta.status === 403 || respuesta.status === 429) return false
    if (respuesta.ok) {
      const datos = await respuesta.json() as RespuestaAcceso
      if (datos.ok) return true
    }
  } catch {
    // Sin servidor disponible: seguimos con la comparación local de abajo.
  }
  const mesa = mesas.find(item => item.id === mesaId)
  return codigosCoinciden(mesa?.codigo_acceso, codigo)
}

/** Resuelve a qué mesa pertenece un código (entrada por `/m/<codigo>`). */
export async function resolverMesaPorCodigo(codigo: string, mesas: Mesa[]): Promise<string | null> {
  if (MODO_VISTA_PREVIA) {
    return mesas.find(mesa => codigosCoinciden(codigoDeVistaPrevia(mesa.id, mesa.codigo_version || 0), codigo))?.id ?? null
  }
  try {
    const respuesta = await fetch(withBasePath('/api/mesa/acceso'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo, mesaIds: mesas.map(mesa => mesa.id) }),
    })
    if (respuesta.ok) {
      const datos = await respuesta.json() as RespuestaAcceso
      if (datos.ok && datos.mesaId) return datos.mesaId
    }
    if (respuesta.status === 403) return null
  } catch {
    // Sin servidor disponible: seguimos con la comparación local de abajo.
  }
  return mesas.find(mesa => codigosCoinciden(mesa.codigo_acceso, codigo))?.id ?? null
}
