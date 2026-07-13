import { NextRequest, NextResponse } from 'next/server'
import { verificarToken } from '@/lib/session'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('mf_session')?.value
  const payload = verificarToken(token)
  if (!payload) return NextResponse.json({ ok: false }, { status: 401 })
  return NextResponse.json({ ok: true, email: payload.email, nombre: payload.nombre, rol: payload.rol })
}
