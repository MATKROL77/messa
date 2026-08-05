import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { obtenerCuentasFijas } from '@/lib/auth-config'
import { crearToken, ORGANIZACION_POR_DEFECTO } from '@/lib/session'
import { db, filtro, baseDatosLista } from '@/lib/supabase-admin'
import type { RolUsuario } from '@/types'

interface UsuarioStaffDB {
  email: string
  password_hash: string
  nombre: string
  rol: RolUsuario
  activo: boolean
  organizacion_id: string | null
}

/**
 * Cuentas del equipo creadas desde el backoffice (tabla `usuarios_staff`).
 * Es un complemento de las cuentas fijas de variables de entorno, no un
 * reemplazo: si la base no está configurada o las tablas todavía no existen,
 * esto devuelve null y el login sigue funcionando con las cuentas de .env.
 */
async function buscarCuentaEnBase(email: string) {
  if (!baseDatosLista) return null
  try {
    return await db.primera<UsuarioStaffDB>('usuarios_staff', `?email=eq.${filtro(email)}&select=*`)
  } catch {
    return null
  }
}

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

  // Las cuentas fijas de variables de entorno tienen prioridad: son la llave
  // de emergencia que entra al panel aunque la base de datos esté caída.
  const fija = obtenerCuentasFijas().find(c => c.email.toLowerCase() === email)
  const enBase = fija ? null : await buscarCuentaEnBase(email)

  const cuenta = fija
    ? { email: fija.email, nombre: fija.nombre, rol: fija.rol as RolUsuario, passwordHash: fija.passwordHash, activo: true }
    : enBase
      ? { email: enBase.email, nombre: enBase.nombre, rol: enBase.rol, passwordHash: enBase.password_hash, activo: enBase.activo }
      : null

  // Comparación bcrypt real del lado del servidor. Si no hay cuenta con ese
  // email, igual corremos un compare contra un hash dummy para que el tiempo
  // de respuesta no delate si el email existe o no (mitiga timing attacks /
  // enumeración de usuarios).
  const hashAComparar = cuenta?.passwordHash || '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva'
  const valido = (await bcrypt.compare(password, hashAComparar)) && Boolean(cuenta?.activo)

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

  if (enBase) {
    // Registro de último acceso. No debe poder tumbar el login si falla.
    db.actualizar('usuarios_staff', `?email=eq.${filtro(cuenta.email)}`, { ultimo_acceso: new Date().toISOString() })
      .catch(error => console.error('No se pudo registrar el último acceso', error))
  }

  const token = crearToken({
    email: cuenta.email,
    nombre: cuenta.nombre,
    rol: cuenta.rol,
    // Las cuentas fijas del entorno son las del dueño de MESSA; las del equipo
    // traen la suya de la base. Si una fila vieja todavía no la tiene, cae en
    // la organización original en vez de quedarse sin acceso a nada.
    organizacionId: enBase?.organizacion_id || process.env.ORGANIZACION_ID || ORGANIZACION_POR_DEFECTO,
    exp: ahora + 1000 * 60 * 60 * 12, // 12 horas
  })

  const res = NextResponse.json({ ok: true, rol: cuenta.rol, nombre: cuenta.nombre, email: cuenta.email })
  res.cookies.set('mf_session', token, {
    httpOnly: true,
    // `Secure` requiere HTTPS. En localhost se usa HTTP para desarrollo;
    // mantenerlo en true impediría que el navegador guarde la sesión local.
    secure: process.env.NODE_ENV === 'production',
    // 'none' deja que la cookie viaje cuando MESSA se muestra dentro de un
    // iframe de otro dominio —el portfolio—, cosa que 'lax' prohíbe. Sólo se
    // usa para la vitrina: relajarlo abre la puerta a peticiones desde otro
    // sitio, y en una cuenta que no puede escribir nada eso no significa nada.
    // Las cuentas reales del restaurante se quedan en 'lax'.
    //
    // El navegador exige HTTPS para aceptar 'none'; en local, sobre HTTP, cae
    // a 'lax' y el iframe cruzado no funciona, que es sólo un límite de
    // desarrollo.
    sameSite: cuenta.rol === 'vitrina' && process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  })
  return res
}
