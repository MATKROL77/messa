import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { obtenerCuentasFijas } from '@/lib/auth-config'
import { crearToken } from '@/lib/session'

// Rate limiting simple en memoria (por instancia — ver nota en LEEME.md sobre
// límites de esto en un entorno serverless con múltiples instancias; para un
// límite robusto entre instancias hace falta KV o una base de datos).
const intentos = new Map<string, { count: number; bloqueadoHasta: number }>()
const MAX_INTENTOS = 5
const BLOQUEO_MS = 60_000

export async function POST(req: NextRequest) {
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

  const email = (body.email || '').trim().toLowerCase()
  const password = body.password || ''

  if (!process.env.SESSION_SECRET) {
    return NextResponse.json({ ok: false, error: 'El servidor no tiene SESSION_SECRET configurado. Revisá tus variables de entorno (.env.example).' }, { status: 500 })
  }

  const cuentas = obtenerCuentasFijas()
  const cuenta = cuentas.find(c => c.email.toLowerCase() === email)

  // Comparación bcrypt real del lado del servidor. Si no hay cuenta con ese
  // email, igual corremos un compare contra un hash dummy para que el tiempo
  // de respuesta no delate si el email existe o no (mitiga timing attacks /
  // enumeración de usuarios).
  const hashAComparar = cuenta?.passwordHash || '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva'
  const valido = await bcrypt.compare(password, hashAComparar)

  if (!cuenta || !valido) {
    const nuevoCount = (estado?.count || 0) + 1
    if (nuevoCount >= MAX_INTENTOS) {
      intentos.set(ip, { count: 0, bloqueadoHasta: ahora + BLOQUEO_MS })
      return NextResponse.json({ ok: false, error: 'Demasiados intentos fallidos. Bloqueado por 60 segundos.' }, { status: 429 })
    }
    intentos.set(ip, { count: nuevoCount, bloqueadoHasta: 0 })
    return NextResponse.json({ ok: false, error: `Email o contraseña incorrectos (intento ${nuevoCount}/${MAX_INTENTOS})` }, { status: 401 })
  }

  intentos.delete(ip)

  const token = crearToken({
    email: cuenta.email,
    nombre: cuenta.nombre,
    rol: cuenta.rol,
    exp: ahora + 1000 * 60 * 60 * 12, // 12 horas
  })

  const res = NextResponse.json({ ok: true, rol: cuenta.rol, nombre: cuenta.nombre, email: cuenta.email })
  res.cookies.set('mf_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  })
  return res
}
