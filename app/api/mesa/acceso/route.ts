import { NextRequest, NextResponse } from 'next/server'
import { hayClaveDeCodigos, resolverVersion } from '@/lib/mesa-codigo-server'

interface Solicitud {
  /** Mesa concreta a validar (llegada por `/mesa/<id>?c=<codigo>`). */
  mesaId?: string
  /** Candidatas cuando sólo se conoce el código (llegada por `/m/<codigo>`). */
  mesaIds?: string[]
  codigo?: string
}

// Freno simple contra fuerza bruta. El espacio de códigos es de 27^8 (≈2,8·10¹¹)
// combinaciones, así que adivinar uno es impracticable, pero limitar los
// intentos evita que alguien use la ruta para barrer mesas desde el salón.
const intentos = new Map<string, { count: number; reinicio: number }>()
const MAX_INTENTOS = 40
const VENTANA_MS = 60_000

function excedido(ip: string): boolean {
  const ahora = Date.now()
  const estado = intentos.get(ip)
  if (!estado || ahora > estado.reinicio) {
    intentos.set(ip, { count: 1, reinicio: ahora + VENTANA_MS })
    return false
  }
  estado.count += 1
  return estado.count > MAX_INTENTOS
}

/**
 * Valida el código que llega en el QR (o que el comensal tipeó) contra la mesa.
 * Es el único lugar donde se decide si un dispositivo puede abrir una mesa: el
 * navegador no conoce la clave con la que se derivan los códigos, así que no
 * puede fabricarse el de otra mesa.
 */
export async function POST(req: NextRequest) {
  if (!hayClaveDeCodigos()) {
    return NextResponse.json({ ok: false, error: 'sin-clave' }, { status: 503 })
  }
  if (excedido(req.headers.get('x-forwarded-for') || 'desconocido')) {
    return NextResponse.json({ ok: false, error: 'Demasiados intentos. Esperá un minuto.' }, { status: 429 })
  }

  let body: Solicitud
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Solicitud inválida' }, { status: 400 })
  }

  const codigo = (body.codigo || '').trim()
  if (!codigo) return NextResponse.json({ ok: false, error: 'Falta el código' }, { status: 400 })

  const candidatas = body.mesaId ? [body.mesaId] : (body.mesaIds || []).filter(id => typeof id === 'string').slice(0, 500)
  for (const mesaId of candidatas) {
    const version = resolverVersion(mesaId, codigo)
    if (version !== null) return NextResponse.json({ ok: true, mesaId, version })
  }

  return NextResponse.json({ ok: false, error: 'El código no corresponde a esta mesa.' }, { status: 403 })
}
