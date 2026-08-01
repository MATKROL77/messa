import { NextRequest, NextResponse } from 'next/server'
import { verificarToken } from '@/lib/session'
import { listarClientes, ajustarPuntos, aPublico, mensajeDeError, normalizarEmail } from '@/lib/clientes'

// Padrón de comensales para el módulo de Fidelidad del backoffice.
// Sólo se ve con sesión de staff; los ajustes manuales de puntos quedan
// limitados a los rangos de gestión.

function autorizar(req: NextRequest) {
  const sesion = verificarToken(req.cookies.get('mf_session')?.value)
  if (!sesion) return { sesion: null, puedeVer: false, puedeAjustar: false }
  return {
    sesion,
    puedeVer: true,
    puedeAjustar: sesion.rol === 'creator' || sesion.rol === 'admin' || sesion.rol === 'gerente',
  }
}

export async function GET(req: NextRequest) {
  const { puedeVer, puedeAjustar } = autorizar(req)
  if (!puedeVer) return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 })
  try {
    const clientes = await listarClientes()
    return NextResponse.json({ ok: true, clientes: clientes.map(aPublico), puedeAjustar })
  } catch (error) {
    const { mensaje, status } = mensajeDeError(error)
    return NextResponse.json({ ok: false, error: mensaje }, { status })
  }
}

/** Ajuste manual: canje de una recompensa, corrección, o puntos de cortesía. */
export async function POST(req: NextRequest) {
  const { sesion, puedeAjustar } = autorizar(req)
  if (!puedeAjustar) return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 })

  let body: { email?: string; puntos?: number; motivo?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Solicitud inválida' }, { status: 400 })
  }

  const email = normalizarEmail(body.email || '')
  const puntos = Math.trunc(Number(body.puntos) || 0)
  const motivo = (body.motivo || '').trim() || 'Ajuste manual'

  if (!email) return NextResponse.json({ ok: false, error: 'Falta el email.' }, { status: 400 })
  if (!puntos) return NextResponse.json({ ok: false, error: 'Indicá cuántos puntos sumar o restar.' }, { status: 400 })
  if (Math.abs(puntos) > 100_000) return NextResponse.json({ ok: false, error: 'El ajuste es demasiado grande.' }, { status: 400 })

  try {
    const cliente = await ajustarPuntos(email, puntos, motivo, `staff:${sesion?.email || ''}`)
    if (!cliente) return NextResponse.json({ ok: false, error: 'No encontramos esa cuenta.' }, { status: 404 })
    return NextResponse.json({ ok: true, cliente: aPublico(cliente) })
  } catch (error) {
    const { mensaje, status } = mensajeDeError(error)
    return NextResponse.json({ ok: false, error: mensaje }, { status })
  }
}
