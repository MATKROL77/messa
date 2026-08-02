import { NextRequest, NextResponse } from 'next/server'
import { db, filtro, baseDatosLista } from '@/lib/supabase-admin'

/**
 * Carta pública de una sucursal.
 *
 * Es de lectura y sin credenciales a propósito: la carta de un restaurante es
 * información pública, y quien la está mirando todavía no escaneó ninguna
 * mesa. Sin esta ruta, el dueño cambiaba un precio en el panel y la carta que
 * ve la gente en `/vista` seguía mostrando el precio viejo para siempre,
 * porque cada navegador se quedaba con la copia que traía de fábrica.
 *
 * Sólo devuelve el paquete `carta`: platos, categorías y etiquetas. Nada de
 * mesas, pedidos, cuentas ni configuración interna.
 */
export async function GET(req: NextRequest) {
  if (!baseDatosLista) return NextResponse.json({ ok: false, error: 'sin-base' }, { status: 503 })

  const sucursalId = (new URL(req.url).searchParams.get('sucursal') || '').trim()
  if (!sucursalId) return NextResponse.json({ ok: false, error: 'Falta la sucursal' }, { status: 400 })

  try {
    const fila = await db.primera<{ payload: unknown; updated_at: string }>(
      'estado_operativo',
      `?id=eq.${filtro(`carta:${sucursalId}`)}&tipo=eq.carta&select=payload,updated_at`,
    )
    if (!fila) return NextResponse.json({ ok: true, carta: null })
    return NextResponse.json({ ok: true, carta: fila.payload, updated_at: fila.updated_at })
  } catch {
    // Sin base o sin tabla: el navegador se queda con su copia local, que es
    // exactamente lo que hacía antes. No es un error visible para nadie.
    return NextResponse.json({ ok: false, error: 'sin-carta' }, { status: 503 })
  }
}
