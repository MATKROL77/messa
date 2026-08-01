import { createHmac, timingSafeEqual } from 'crypto'
import type { RangoCliente } from '@/lib/rangos'

// Sesión de COMENSAL — separada de la del staff a propósito.
//
// Son dos cookies distintas (`mf_cliente` vs `mf_session`) firmadas con
// dominios distintos ("cliente:" vs el payload de staff), así que un token de
// cliente jamás puede pasar por uno de staff aunque compartan el secreto. Un
// comensal logueado en su celular y un mozo logueado en la misma tablet
// conviven sin pisarse.

export const COOKIE_CLIENTE = 'mf_cliente'
export const DURACION_SESION_CLIENTE_MS = 1000 * 60 * 60 * 24 * 30 // 30 días

export interface SesionCliente {
  email: string
  nombre: string
  rango: RangoCliente
  exp: number
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET no está configurado.')
  return secret
}

function firmar(data: string): string {
  return createHmac('sha256', getSecret()).update(`cliente:${data}`).digest('base64url')
}

export function crearTokenCliente(payload: SesionCliente): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${data}.${firmar(data)}`
}

export function verificarTokenCliente(token: string | undefined | null): SesionCliente | null {
  if (!token) return null
  const [data, firma] = token.split('.')
  if (!data || !firma) return null
  try {
    const esperada = Buffer.from(firmar(data))
    const recibida = Buffer.from(firma)
    if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null
    const payload: SesionCliente = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'))
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}
