import { NextRequest, NextResponse } from 'next/server'
import { ajustarPuntos, aPublico, mensajeDeError } from '@/lib/clientes'
import { verificarTokenCliente, COOKIE_CLIENTE } from '@/lib/sesion-cliente'
import { verificarToken } from '@/lib/session'
import { resolverVersion, hayClaveDeCodigos } from '@/lib/mesa-codigo-server'

/**
 * Acredita los puntos de una cuenta al cerrar una cuenta en la mesa.
 *
 * Quién puede llamarla:
 *   · un comensal logueado que además presente el código válido de la mesa en
 *     la que está sentado — el código sólo se obtiene escaneando el QR físico;
 *   · el staff logueado, para el caso en que el cobro lo cierre el mozo.
 *
 * Límite conocido y asumido: los pedidos todavía viven en el navegador de cada
 * dispositivo, así que el servidor no puede verificar contra la base cuánto
 * gastó realmente esa mesa. Por eso el monto se topea (TOPE_MONTO) y se limita
 * la frecuencia por cuenta. Cuando los pedidos pasen a Supabase, esto tiene que
 * leer el total del pedido y dejar de confiar en el monto que manda el cliente.
 */

const TOPE_MONTO = 500_000
const VENTANA_MS = 60_000
const MAX_ACREDITACIONES = 4
const acreditaciones = new Map<string, { count: number; reinicio: number }>()

function excedido(clave: string): boolean {
  const ahora = Date.now()
  const estado = acreditaciones.get(clave)
  if (!estado || ahora > estado.reinicio) {
    acreditaciones.set(clave, { count: 1, reinicio: ahora + VENTANA_MS })
    return false
  }
  estado.count += 1
  return estado.count > MAX_ACREDITACIONES
}

export async function POST(req: NextRequest) {
  const sesionCliente = verificarTokenCliente(req.cookies.get(COOKIE_CLIENTE)?.value)
  const sesionStaff = verificarToken(req.cookies.get('mf_session')?.value)

  let body: { monto?: number; mesaId?: string; codigo?: string; puntosPor1000?: number; referencia?: string; email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Solicitud inválida' }, { status: 400 })
  }

  // El staff puede acreditarle a cualquier cuenta; un comensal, sólo a la suya.
  const email = sesionStaff ? (body.email || sesionCliente?.email || '') : sesionCliente?.email || ''
  if (!email) return NextResponse.json({ ok: false, error: 'Iniciá sesión para acumular puntos.' }, { status: 401 })

  if (!sesionStaff) {
    // Comensal: tiene que probar que está en la mesa presentando el código del QR.
    if (!hayClaveDeCodigos()) return NextResponse.json({ ok: false, error: 'sin-clave' }, { status: 503 })
    const mesaId = (body.mesaId || '').trim()
    const codigo = (body.codigo || '').trim()
    if (!mesaId || !codigo || resolverVersion(mesaId, codigo) === null) {
      return NextResponse.json({ ok: false, error: 'El código de la mesa no es válido.' }, { status: 403 })
    }
    if (excedido(email)) {
      return NextResponse.json({ ok: false, error: 'Demasiadas acreditaciones seguidas. Esperá un minuto.' }, { status: 429 })
    }
  }

  const monto = Math.min(TOPE_MONTO, Math.max(0, Number(body.monto) || 0))
  const tasa = Math.min(100, Math.max(0, Number(body.puntosPor1000) || 0))
  const puntos = Math.floor((monto / 1000) * tasa)

  if (puntos <= 0) return NextResponse.json({ ok: true, puntos: 0, cliente: null })

  try {
    const cliente = await ajustarPuntos(email, puntos, 'Consumo en el restaurante', body.referencia)
    if (!cliente) return NextResponse.json({ ok: false, error: 'No encontramos esa cuenta.' }, { status: 404 })
    return NextResponse.json({ ok: true, puntos, cliente: aPublico(cliente) })
  } catch (error) {
    const { mensaje, status } = mensajeDeError(error)
    return NextResponse.json({ ok: false, error: mensaje }, { status })
  }
}
