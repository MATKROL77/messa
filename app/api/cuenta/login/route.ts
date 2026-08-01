import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { buscarCliente, aPublico, mensajeDeError, normalizarEmail } from '@/lib/clientes'
import { db, filtro } from '@/lib/supabase-admin'
import { crearTokenCliente, COOKIE_CLIENTE, DURACION_SESION_CLIENTE_MS } from '@/lib/sesion-cliente'

// Mismo esquema anti fuerza bruta que el login de staff: contador en memoria
// por IP. Es por instancia del Worker, así que un atacante distribuido lo
// esquiva; frena el caso real (alguien probando contraseñas desde su celular).
const intentos = new Map<string, { count: number; bloqueadoHasta: number }>()
const MAX_INTENTOS = 6
const BLOQUEO_MS = 60_000

// Hash descartable para que el tiempo de respuesta no delate si el email
// existe: sin esto, un email inexistente respondería más rápido que uno real.
const HASH_DUMMY = '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva'

export async function POST(req: NextRequest) {
  if (!process.env.SESSION_SECRET) {
    return NextResponse.json({ ok: false, error: 'El servidor no tiene SESSION_SECRET configurado.' }, { status: 500 })
  }

  const ip = req.headers.get('x-forwarded-for') || 'desconocido'
  const ahora = Date.now()
  const estado = intentos.get(ip)
  if (estado && ahora < estado.bloqueadoHasta) {
    const segundos = Math.ceil((estado.bloqueadoHasta - ahora) / 1000)
    return NextResponse.json({ ok: false, error: `Demasiados intentos. Esperá ${segundos}s.` }, { status: 429 })
  }

  let body: { email?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Solicitud inválida' }, { status: 400 })
  }

  const email = normalizarEmail(body.email || '')
  const password = body.password || ''

  try {
    const cliente = await buscarCliente(email)
    const valido = await bcrypt.compare(password, cliente?.password_hash || HASH_DUMMY)

    if (!cliente || !valido || !cliente.activo) {
      const nuevoCount = (estado?.count || 0) + 1
      if (nuevoCount >= MAX_INTENTOS) {
        intentos.set(ip, { count: 0, bloqueadoHasta: ahora + BLOQUEO_MS })
        return NextResponse.json({ ok: false, error: 'Demasiados intentos fallidos. Bloqueado por 60 segundos.' }, { status: 429 })
      }
      intentos.set(ip, { count: nuevoCount, bloqueadoHasta: 0 })
      return NextResponse.json({ ok: false, error: 'Email o contraseña incorrectos.' }, { status: 401 })
    }

    intentos.delete(ip)
    await db.actualizar('clientes', `?email=eq.${filtro(cliente.email)}`, { ultima_visita: new Date().toISOString() })

    const token = crearTokenCliente({
      email: cliente.email,
      nombre: cliente.nombre,
      rango: cliente.rango,
      exp: ahora + DURACION_SESION_CLIENTE_MS,
    })

    const res = NextResponse.json({ ok: true, cliente: aPublico(cliente) })
    res.cookies.set(COOKIE_CLIENTE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: DURACION_SESION_CLIENTE_MS / 1000,
    })
    return res
  } catch (error) {
    const { mensaje, status } = mensajeDeError(error)
    return NextResponse.json({ ok: false, error: mensaje }, { status })
  }
}
