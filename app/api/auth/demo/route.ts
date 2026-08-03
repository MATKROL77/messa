import { NextResponse } from 'next/server'
import { crearToken, ORGANIZACION_POR_DEFECTO } from '@/lib/session'

/**
 * Abre una sesión de vitrina para el portfolio.
 *
 * No pide contraseña a propósito: es una demostración pública, pensada para
 * que cualquiera entre desde un enlace y toque el sistema. Lo que la hace
 * segura no es la puerta sino el techo — el rol 'vitrina' no puede escribir
 * nada en el servidor (ver `app/api/sync/route.ts`), así que aunque alguien
 * se ponga a borrar platos, el restaurante real no se entera.
 *
 * La sesión dura 2 horas: suficiente para que alguien recorra el panel con
 * calma, y corta como para que un dispositivo público no quede abierto.
 */
export async function POST() {
  if (!process.env.SESSION_SECRET) {
    return NextResponse.json({ ok: false, error: 'El servidor no tiene SESSION_SECRET configurado.' }, { status: 500 })
  }

  const token = crearToken({
    email: 'demo@messa.app',
    nombre: 'Visitante',
    rol: 'vitrina',
    organizacionId: ORGANIZACION_POR_DEFECTO,
    exp: Date.now() + 1000 * 60 * 60 * 2,
  })

  const res = NextResponse.json({ ok: true, rol: 'vitrina', nombre: 'Visitante', email: 'demo@messa.app' })
  res.cookies.set('mf_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 2,
  })
  return res
}
