import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { buscarCliente, aPublico, mensajeDeError, normalizarEmail, type ClienteDB } from '@/lib/clientes'
import { db } from '@/lib/supabase-admin'
import { crearTokenCliente, COOKIE_CLIENTE, DURACION_SESION_CLIENTE_MS } from '@/lib/sesion-cliente'

const MIN_PASSWORD = 8

export async function POST(req: NextRequest) {
  if (!process.env.SESSION_SECRET) {
    return NextResponse.json({ ok: false, error: 'El servidor no tiene SESSION_SECRET configurado.' }, { status: 500 })
  }

  let body: { email?: string; password?: string; nombre?: string; telefono?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Solicitud inválida' }, { status: 400 })
  }

  const email = normalizarEmail(body.email || '')
  const password = body.password || ''
  const nombre = (body.nombre || '').trim()
  const telefono = (body.telefono || '').trim() || null

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: 'Escribí un email válido.' }, { status: 400 })
  }
  if (nombre.length < 2) {
    return NextResponse.json({ ok: false, error: 'Escribí tu nombre.' }, { status: 400 })
  }
  if (password.length < MIN_PASSWORD) {
    return NextResponse.json({ ok: false, error: `La contraseña necesita al menos ${MIN_PASSWORD} caracteres.` }, { status: 400 })
  }

  try {
    if (await buscarCliente(email)) {
      return NextResponse.json({ ok: false, error: 'Ya existe una cuenta con ese email. Iniciá sesión.' }, { status: 409 })
    }

    const cliente = await db.insertar<ClienteDB>('clientes', {
      email,
      password_hash: await bcrypt.hash(password, 12),
      nombre,
      telefono,
      puntos: 0,
      rango: 'bronce',
      ultima_visita: new Date().toISOString(),
    })

    const token = crearTokenCliente({
      email: cliente.email,
      nombre: cliente.nombre,
      rango: cliente.rango,
      exp: Date.now() + DURACION_SESION_CLIENTE_MS,
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
