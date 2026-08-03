import { NextRequest, NextResponse } from 'next/server'
import { db, filtro, baseDatosLista } from '@/lib/supabase-admin'

/**
 * Resuelve el nombre corto de la URL al restaurante que le corresponde.
 *
 * Es público a propósito: un comensal que escanea el QR de Bonafide todavía
 * no tiene sesión ni código, y necesita saber a qué carta pedirle los platos.
 * Lo único que se devuelve es lo que ya está impreso en el QR —el nombre y el
 * identificador—, nunca datos de operación.
 */
export async function GET(req: NextRequest) {
  const slug = (new URL(req.url).searchParams.get('slug') || '').trim().toLowerCase()
  if (!slug) return NextResponse.json({ ok: false, error: 'Falta el restaurante' }, { status: 400 })
  if (!baseDatosLista) return NextResponse.json({ ok: false, error: 'sin-base' }, { status: 503 })

  try {
    const organizacion = await db.primera<{ id: string; nombre: string; slug: string; plan: string; activa: boolean }>(
      'organizaciones',
      `?slug=eq.${filtro(slug)}&select=id,nombre,slug,plan,activa`,
    )
    if (!organizacion) return NextResponse.json({ ok: false, error: 'No encontramos ese restaurante.' }, { status: 404 })
    // Un restaurante suspendido conserva todos sus datos, pero su carta deja
    // de responder: es la palanca comercial para cuando alguien no paga.
    if (!organizacion.activa || organizacion.plan === 'suspendido') {
      return NextResponse.json({ ok: false, error: 'Este restaurante no tiene el servicio activo.' }, { status: 403 })
    }
    return NextResponse.json({ ok: true, organizacion })
  } catch {
    return NextResponse.json({ ok: false, error: 'No se pudo resolver el restaurante.' }, { status: 503 })
  }
}
