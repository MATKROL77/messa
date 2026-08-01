import { db, filtro, ErrorSupabase, baseDatosLista } from '@/lib/supabase-admin'
import { rangoPorPuntos, type RangoCliente } from '@/lib/rangos'

// Capa de acceso a las cuentas de comensales. Todo lo que toca la tabla
// `clientes` pasa por acá, para que las rutas de API no repitan filtros de
// PostgREST ni la lógica de recálculo de rango.

export interface ClienteDB {
  email: string
  password_hash: string
  nombre: string
  telefono: string | null
  puntos: number
  rango: RangoCliente
  activo: boolean
  created_at: string
  ultima_visita: string | null
}

/** Lo que se puede mandar al navegador: nunca incluye el hash. */
export interface ClientePublico {
  email: string
  nombre: string
  telefono: string | null
  puntos: number
  rango: RangoCliente
  created_at: string
  ultima_visita: string | null
}

export interface MovimientoPuntos {
  id: string
  cliente_email: string
  puntos: number
  motivo: string
  referencia: string | null
  created_at: string
}

export function aPublico(cliente: ClienteDB): ClientePublico {
  return {
    email: cliente.email,
    nombre: cliente.nombre,
    telefono: cliente.telefono,
    puntos: cliente.puntos,
    rango: cliente.rango,
    created_at: cliente.created_at,
    ultima_visita: cliente.ultima_visita,
  }
}

export function normalizarEmail(valor: string): string {
  return (valor || '').trim().toLowerCase()
}

export function buscarCliente(email: string): Promise<ClienteDB | null> {
  return db.primera<ClienteDB>('clientes', `?email=eq.${filtro(normalizarEmail(email))}&select=*`)
}

export function listarClientes(limite = 200): Promise<ClienteDB[]> {
  return db.seleccionar<ClienteDB>('clientes', `?select=*&order=puntos.desc&limit=${limite}`)
}

export function movimientosDe(email: string, limite = 25): Promise<MovimientoPuntos[]> {
  return db.seleccionar<MovimientoPuntos>(
    'movimientos_puntos',
    `?cliente_email=eq.${filtro(normalizarEmail(email))}&select=*&order=created_at.desc&limit=${limite}`,
  )
}

/**
 * Suma (o resta, con `puntos` negativo) puntos y deja el movimiento asentado.
 * Recalcula el rango a partir del saldo nuevo y nunca deja el saldo bajo cero.
 *
 * No es atómico: PostgREST no expone transacciones, así que entre la lectura y
 * la escritura podría colarse otra suma. En la práctica los canjes de un mismo
 * comensal no ocurren en paralelo; si eso cambiara, la solución es mover esto
 * a una función de Postgres invocada por RPC.
 */
export async function ajustarPuntos(
  email: string,
  puntos: number,
  motivo: string,
  referencia?: string,
): Promise<ClienteDB | null> {
  const cliente = await buscarCliente(email)
  if (!cliente) return null

  const saldo = Math.max(0, cliente.puntos + puntos)
  const actualizado = await db.actualizar<ClienteDB>('clientes', `?email=eq.${filtro(cliente.email)}`, {
    puntos: saldo,
    rango: rangoPorPuntos(saldo),
    ultima_visita: new Date().toISOString(),
  })

  // El movimiento es el registro auditable; si falla, el saldo ya cambió, así
  // que se loguea pero no se revierte el ajuste (perder el saldo del cliente
  // sería peor que perder una línea de historial).
  try {
    await db.insertar('movimientos_puntos', {
      id: `mov_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      cliente_email: cliente.email,
      puntos,
      motivo,
      referencia: referencia || null,
    })
  } catch (error) {
    console.error('No se pudo registrar el movimiento de puntos', error)
  }

  return actualizado
}

/**
 * Traduce un fallo de Supabase en una respuesta entendible. El caso importante
 * es "la migración todavía no se corrió": no es un bug, es un paso pendiente,
 * y el mensaje tiene que decir exactamente eso.
 */
export function mensajeDeError(error: unknown): { mensaje: string; status: number } {
  if (!baseDatosLista) {
    return { mensaje: 'Las cuentas de clientes necesitan la base de datos configurada en el servidor.', status: 503 }
  }
  if (error instanceof ErrorSupabase && error.tablaFaltante) {
    return {
      mensaje: 'Falta crear las tablas de cuentas. Corré supabase/migration_04_cuentas_y_rangos.sql en el SQL Editor de Supabase.',
      status: 503,
    }
  }
  console.error('Error de base de datos', error)
  return { mensaje: 'No pudimos completar la operación. Intentá de nuevo en unos segundos.', status: 500 }
}
