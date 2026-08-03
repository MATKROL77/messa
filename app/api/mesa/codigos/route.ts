import { NextRequest, NextResponse } from 'next/server'
import { verificarToken } from '@/lib/session'
import { derivarCodigo, hayClaveDeCodigos } from '@/lib/mesa-codigo-server'

interface Solicitud {
  mesas?: { id?: string; version?: number }[]
}

/**
 * Devuelve el código vigente de cada mesa para imprimir sus QR.
 *
 * Requiere sesión del panel: el código es lo único que separa una mesa de la
 * de al lado, así que la lista completa no puede quedar expuesta a cualquiera
 * que pida la URL.
 */
export async function POST(req: NextRequest) {
  const sesion = verificarToken(req.cookies.get('mf_session')?.value)
  if (!sesion) {
    return NextResponse.json({ ok: false, error: 'Necesitás iniciar sesión para ver los códigos.' }, { status: 401 })
  }
  if (!hayClaveDeCodigos()) {
    return NextResponse.json({ ok: false, error: 'Falta SESSION_SECRET en el servidor.' }, { status: 500 })
  }

  let body: Solicitud
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Solicitud inválida' }, { status: 400 })
  }

  const mesas = (body.mesas || []).filter(mesa => typeof mesa.id === 'string' && mesa.id).slice(0, 500)
  const codigos: Record<string, string> = {}
  for (const mesa of mesas) {
    codigos[mesa.id as string] = derivarCodigo(mesa.id as string, Math.max(0, Math.floor(mesa.version || 0)), sesion.organizacionId)
  }

  return NextResponse.json({ ok: true, codigos })
}
