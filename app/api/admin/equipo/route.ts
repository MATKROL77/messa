import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { verificarToken } from '@/lib/session'
import { db, filtro } from '@/lib/supabase-admin'
import { mensajeDeError, normalizarEmail } from '@/lib/clientes'
import type { RolUsuario } from '@/types'

// Alta, baja y cambio de rango del equipo, desde el backoffice y sin
// redeployar. Complementa a las cuentas fijas de variables de entorno, que
// siguen existiendo como llave de emergencia si la base de datos se cae.

export interface UsuarioStaffDB {
  email: string
  password_hash: string
  nombre: string
  rol: Exclude<RolUsuario, 'creator'>
  activo: boolean
  created_at: string
  creado_por: string | null
  ultimo_acceso: string | null
}

const ROLES_ASIGNABLES: RolUsuario[] = ['admin', 'gerente', 'editor', 'staff']
const MIN_PASSWORD = 8

/** Sólo el creador y el dueño tocan el equipo. Un gerente ve, pero no edita. */
function autorizar(req: NextRequest) {
  const sesion = verificarToken(req.cookies.get('mf_session')?.value)
  if (!sesion) return { sesion: null, puedeEditar: false, puedeVer: false }
  const puedeEditar = sesion.rol === 'creator' || sesion.rol === 'admin'
  return { sesion, puedeEditar, puedeVer: puedeEditar || sesion.rol === 'gerente' }
}

/** El hash de contraseña nunca sale del servidor, ni siquiera hacia el dueño. */
function sinHash(usuario: UsuarioStaffDB) {
  const resto: Partial<UsuarioStaffDB> = { ...usuario }
  delete resto.password_hash
  return resto
}

export async function GET(req: NextRequest) {
  const { puedeVer, puedeEditar } = autorizar(req)
  if (!puedeVer) return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 })
  try {
    const usuarios = await db.seleccionar<UsuarioStaffDB>('usuarios_staff', '?select=*&order=created_at.asc')
    return NextResponse.json({ ok: true, usuarios: usuarios.map(sinHash), puedeEditar })
  } catch (error) {
    const { mensaje, status } = mensajeDeError(error)
    return NextResponse.json({ ok: false, error: mensaje }, { status })
  }
}

export async function POST(req: NextRequest) {
  const { sesion, puedeEditar } = autorizar(req)
  if (!puedeEditar) return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 })

  let body: { email?: string; nombre?: string; password?: string; rol?: RolUsuario }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Solicitud inválida' }, { status: 400 })
  }

  const email = normalizarEmail(body.email || '')
  const nombre = (body.nombre || '').trim()
  const password = body.password || ''
  const rol = body.rol || 'staff'

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ ok: false, error: 'Email inválido.' }, { status: 400 })
  if (nombre.length < 2) return NextResponse.json({ ok: false, error: 'Falta el nombre.' }, { status: 400 })
  if (password.length < MIN_PASSWORD) return NextResponse.json({ ok: false, error: `La contraseña necesita al menos ${MIN_PASSWORD} caracteres.` }, { status: 400 })
  // 'creator' no es asignable: ese rango sólo existe en variables de entorno,
  // así que nadie puede escalar a control total creando una fila.
  if (!ROLES_ASIGNABLES.includes(rol)) return NextResponse.json({ ok: false, error: 'Rango inválido.' }, { status: 400 })

  try {
    if (await db.primera<UsuarioStaffDB>('usuarios_staff', `?email=eq.${filtro(email)}&select=email`)) {
      return NextResponse.json({ ok: false, error: 'Ya existe una cuenta con ese email.' }, { status: 409 })
    }
    const usuario = await db.insertar<UsuarioStaffDB>('usuarios_staff', {
      email,
      password_hash: await bcrypt.hash(password, 12),
      nombre,
      rol,
      creado_por: sesion?.email || null,
    })
    return NextResponse.json({ ok: true, usuario: sinHash(usuario) })
  } catch (error) {
    const { mensaje, status } = mensajeDeError(error)
    return NextResponse.json({ ok: false, error: mensaje }, { status })
  }
}

export async function PATCH(req: NextRequest) {
  const { puedeEditar } = autorizar(req)
  if (!puedeEditar) return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 })

  let body: { email?: string; rol?: RolUsuario; activo?: boolean; password?: string; nombre?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Solicitud inválida' }, { status: 400 })
  }

  const email = normalizarEmail(body.email || '')
  if (!email) return NextResponse.json({ ok: false, error: 'Falta el email.' }, { status: 400 })

  const cambios: Record<string, unknown> = {}
  if (body.rol !== undefined) {
    if (!ROLES_ASIGNABLES.includes(body.rol)) return NextResponse.json({ ok: false, error: 'Rango inválido.' }, { status: 400 })
    cambios.rol = body.rol
  }
  if (body.activo !== undefined) cambios.activo = Boolean(body.activo)
  if (body.nombre !== undefined) cambios.nombre = body.nombre.trim()
  if (body.password) {
    if (body.password.length < MIN_PASSWORD) return NextResponse.json({ ok: false, error: `La contraseña necesita al menos ${MIN_PASSWORD} caracteres.` }, { status: 400 })
    cambios.password_hash = await bcrypt.hash(body.password, 12)
  }
  if (!Object.keys(cambios).length) return NextResponse.json({ ok: false, error: 'No hay nada que cambiar.' }, { status: 400 })

  try {
    const usuario = await db.actualizar<UsuarioStaffDB>('usuarios_staff', `?email=eq.${filtro(email)}`, cambios)
    if (!usuario) return NextResponse.json({ ok: false, error: 'No encontramos esa cuenta.' }, { status: 404 })
    return NextResponse.json({ ok: true, usuario: sinHash(usuario) })
  } catch (error) {
    const { mensaje, status } = mensajeDeError(error)
    return NextResponse.json({ ok: false, error: mensaje }, { status })
  }
}

export async function DELETE(req: NextRequest) {
  const { sesion, puedeEditar } = autorizar(req)
  if (!puedeEditar) return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 })

  const email = normalizarEmail(new URL(req.url).searchParams.get('email') || '')
  if (!email) return NextResponse.json({ ok: false, error: 'Falta el email.' }, { status: 400 })
  // Borrarse a uno mismo dejaría el panel sin dueño hasta volver a entrar con
  // la cuenta de variables de entorno. Se bloquea.
  if (email === normalizarEmail(sesion?.email || '')) {
    return NextResponse.json({ ok: false, error: 'No podés borrar tu propia cuenta.' }, { status: 400 })
  }

  try {
    await db.eliminar('usuarios_staff', `?email=eq.${filtro(email)}`)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const { mensaje, status } = mensajeDeError(error)
    return NextResponse.json({ ok: false, error: mensaje }, { status })
  }
}
