import { NextRequest, NextResponse } from 'next/server'
import { buscarCliente, movimientosDe, aPublico, mensajeDeError } from '@/lib/clientes'
import { verificarTokenCliente, COOKIE_CLIENTE } from '@/lib/sesion-cliente'

export async function GET(req: NextRequest) {
  const sesion = verificarTokenCliente(req.cookies.get(COOKIE_CLIENTE)?.value)
  if (!sesion) return NextResponse.json({ ok: false }, { status: 401 })

  try {
    // Se relee de la base en vez de confiar en el token: los puntos y el rango
    // cambian cuando el comensal paga, y la cookie dura 30 días.
    const cliente = await buscarCliente(sesion.email)
    if (!cliente || !cliente.activo) {
      const res = NextResponse.json({ ok: false }, { status: 401 })
      res.cookies.set(COOKIE_CLIENTE, '', { httpOnly: true, path: '/', maxAge: 0 })
      return res
    }
    return NextResponse.json({ ok: true, cliente: aPublico(cliente), movimientos: await movimientosDe(cliente.email) })
  } catch (error) {
    const { mensaje, status } = mensajeDeError(error)
    return NextResponse.json({ ok: false, error: mensaje }, { status })
  }
}
