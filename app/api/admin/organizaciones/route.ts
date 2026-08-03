import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { verificarToken } from '@/lib/session'
import { db, filtro } from '@/lib/supabase-admin'
import { normalizarEmail } from '@/lib/clientes'

/**
 * Alta y administración de los restaurantes-cliente.
 *
 * Esto es el piso de arriba de MESSA: acá no se administra un restaurante,
 * se administran los restaurantes. Por eso lo toca únicamente el rol
 * `creator`, que sólo existe en variables de entorno del servidor y no se
 * puede asignar desde ninguna pantalla: si un dueño pudiera crear
 * organizaciones, podría fabricarse una y saltar a la de otro cliente.
 */

export interface OrganizacionDB {
  id: string
  nombre: string
  slug: string
  activa: boolean
  plan: 'prueba' | 'activo' | 'suspendido'
  created_at: string
}

const PLANES = ['prueba', 'activo', 'suspendido'] as const
const MIN_PASSWORD = 8

/** Sólo el dueño de MESSA. Ver el comentario de arriba. */
function autorizar(req: NextRequest) {
  const sesion = verificarToken(req.cookies.get('mf_session')?.value)
  return sesion?.rol === 'creator' ? sesion : null
}

/**
 * Nombre corto para la URL: `Bonafide Centro` → `bonafide-centro`.
 * Sin acentos ni símbolos, porque termina siendo parte de un enlace que
 * alguien va a escribir a mano o dictar por teléfono.
 */
function armarSlug(nombre: string): string {
  return nombre
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export async function GET(req: NextRequest) {
  if (!autorizar(req)) return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 })
  try {
    const organizaciones = await db.seleccionar<OrganizacionDB>('organizaciones', '?select=*&order=created_at.asc')
    return NextResponse.json({ ok: true, organizaciones })
  } catch {
    return NextResponse.json({ ok: false, error: 'Falta correr supabase/migration_07_organizaciones.sql' }, { status: 503 })
  }
}

export async function POST(req: NextRequest) {
  if (!autorizar(req)) return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 })

  let cuerpo: { nombre?: string; email?: string; password?: string; nombreDueno?: string; plan?: string }
  try {
    cuerpo = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Solicitud inválida' }, { status: 400 })
  }

  const nombre = (cuerpo.nombre || '').trim()
  const email = normalizarEmail(cuerpo.email || '')
  const password = cuerpo.password || ''
  const nombreDueno = (cuerpo.nombreDueno || '').trim() || 'Dueño'
  const plan = PLANES.includes(cuerpo.plan as typeof PLANES[number]) ? cuerpo.plan as typeof PLANES[number] : 'prueba'

  if (nombre.length < 2) return NextResponse.json({ ok: false, error: 'Poné el nombre del restaurante.' }, { status: 400 })
  if (!email.includes('@')) return NextResponse.json({ ok: false, error: 'El email del dueño no es válido.' }, { status: 400 })
  if (password.length < MIN_PASSWORD) {
    return NextResponse.json({ ok: false, error: `La contraseña necesita al menos ${MIN_PASSWORD} caracteres.` }, { status: 400 })
  }

  const slug = armarSlug(nombre)
  if (!slug) return NextResponse.json({ ok: false, error: 'Ese nombre no da una dirección web válida.' }, { status: 400 })

  try {
    const yaExiste = await db.primera<OrganizacionDB>('organizaciones', `?slug=eq.${filtro(slug)}&select=id`)
    if (yaExiste) return NextResponse.json({ ok: false, error: `Ya hay un restaurante con la dirección /${slug}.` }, { status: 409 })

    const ocupado = await db.primera<{ email: string }>('usuarios_staff', `?email=eq.${filtro(email)}&select=email`)
    if (ocupado) return NextResponse.json({ ok: false, error: 'Ese email ya tiene una cuenta.' }, { status: 409 })

    const id = `org-${slug}-${Date.now().toString(36)}`
    await db.insertar('organizaciones', [{ id, nombre, slug, plan, activa: true }])

    // El restaurante nace con su dueño adentro. Crear la organización y dejar
    // que el alta del usuario sea otro paso a mano garantiza que tarde o
    // temprano quede un restaurante al que nadie puede entrar.
    await db.insertar('usuarios_staff', [{
      email,
      nombre: nombreDueno,
      password_hash: bcrypt.hashSync(password, 10),
      rol: 'admin',
      activo: true,
      organizacion_id: id,
      creado_por: 'creator',
    }])

    return NextResponse.json({ ok: true, organizacion: { id, nombre, slug, plan, activa: true } })
  } catch (error) {
    console.error('No se pudo crear el restaurante', error)
    return NextResponse.json({ ok: false, error: 'No se pudo crear el restaurante.' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!autorizar(req)) return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 })

  let cuerpo: { id?: string; plan?: string; activa?: boolean; nombre?: string }
  try {
    cuerpo = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Solicitud inválida' }, { status: 400 })
  }

  const id = (cuerpo.id || '').trim()
  if (!id) return NextResponse.json({ ok: false, error: 'Falta el restaurante.' }, { status: 400 })

  const cambios: Record<string, unknown> = {}
  if (PLANES.includes(cuerpo.plan as typeof PLANES[number])) cambios.plan = cuerpo.plan
  if (typeof cuerpo.activa === 'boolean') cambios.activa = cuerpo.activa
  if (typeof cuerpo.nombre === 'string' && cuerpo.nombre.trim().length >= 2) cambios.nombre = cuerpo.nombre.trim()
  if (!Object.keys(cambios).length) return NextResponse.json({ ok: false, error: 'No hay nada que cambiar.' }, { status: 400 })

  try {
    // El slug NO se cambia nunca: es la dirección que el restaurante ya
    // imprimió en sus QR y repartió a sus comensales.
    await db.actualizar('organizaciones', `?id=eq.${filtro(id)}`, cambios)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'No se pudo guardar.' }, { status: 500 })
  }
}
