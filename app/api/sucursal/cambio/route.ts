import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { verificarToken } from '@/lib/session'

/**
 * Verifica el código que habilita cambiar de sucursal.
 *
 * La validación pasa por el servidor a propósito: si el código viviera en el
 * bundle de JavaScript, cualquiera con las herramientas de desarrollo lo leería
 * en diez segundos. Acá sólo existe en la variable de entorno del Worker.
 *
 * Se configura con el secreto `CAMBIO_SUCURSALES`. Debe ser numérico de 4 a 6
 * dígitos; si está mal configurado la ruta lo dice en vez de dejar pasar.
 */

const MIN_DIGITOS = 4
const MAX_DIGITOS = 6

// Freno contra fuerza bruta: con 4 dígitos hay 10.000 combinaciones, así que
// sin límite se prueban todas en minutos.
const intentos = new Map<string, { count: number; bloqueadoHasta: number }>()
const MAX_INTENTOS = 5
const BLOQUEO_MS = 120_000

function esCodigoValido(valor: string): boolean {
  return new RegExp(`^\\d{${MIN_DIGITOS},${MAX_DIGITOS}}$`).test(valor)
}

function iguales(a: string, b: string): boolean {
  const bufferA = Buffer.from(a)
  const bufferB = Buffer.from(b)
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB)
}

export async function POST(req: NextRequest) {
  // Sólo alguien con sesión del equipo puede siquiera intentar el código.
  if (!verificarToken(req.cookies.get('mf_session')?.value)) {
    return NextResponse.json({ ok: false, error: 'Iniciá sesión para cambiar de sucursal.' }, { status: 401 })
  }

  const esperado = (process.env.CAMBIO_SUCURSALES || '').trim()
  if (!esperado) {
    return NextResponse.json({ ok: false, error: 'El servidor no tiene configurado CAMBIO_SUCURSALES.' }, { status: 503 })
  }
  if (!esCodigoValido(esperado)) {
    return NextResponse.json(
      { ok: false, error: `CAMBIO_SUCURSALES tiene que ser un número de ${MIN_DIGITOS} a ${MAX_DIGITOS} dígitos.` },
      { status: 503 },
    )
  }

  const ip = req.headers.get('x-forwarded-for') || 'desconocido'
  const ahora = Date.now()
  const estado = intentos.get(ip)
  if (estado && ahora < estado.bloqueadoHasta) {
    const segundos = Math.ceil((estado.bloqueadoHasta - ahora) / 1000)
    return NextResponse.json({ ok: false, error: `Demasiados intentos. Esperá ${segundos}s.` }, { status: 429 })
  }

  let body: { codigo?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Solicitud inválida' }, { status: 400 })
  }

  const codigo = (body.codigo || '').trim()
  if (!esCodigoValido(codigo)) {
    return NextResponse.json(
      { ok: false, error: `El código son ${MIN_DIGITOS} a ${MAX_DIGITOS} números.` },
      { status: 400 },
    )
  }

  if (!iguales(codigo, esperado)) {
    const nuevoCount = (estado?.count || 0) + 1
    if (nuevoCount >= MAX_INTENTOS) {
      intentos.set(ip, { count: 0, bloqueadoHasta: ahora + BLOQUEO_MS })
      return NextResponse.json({ ok: false, error: 'Demasiados intentos fallidos. Bloqueado por 2 minutos.' }, { status: 429 })
    }
    intentos.set(ip, { count: nuevoCount, bloqueadoHasta: 0 })
    return NextResponse.json(
      { ok: false, error: `Código incorrecto (intento ${nuevoCount}/${MAX_INTENTOS})` },
      { status: 403 },
    )
  }

  intentos.delete(ip)
  return NextResponse.json({ ok: true })
}
