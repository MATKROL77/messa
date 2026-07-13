import { NextRequest, NextResponse } from 'next/server'

// Webhook genérico para recibir pedidos de PedidosYa, Rappi, Uber Eats o
// cualquier plataforma de delivery. Configurar esta URL en el panel de
// desarrolladores de cada plataforma, o en /admin/integraciones.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // Payload esperado (adaptar según la plataforma real):
    // { plataforma: 'pedidosya'|'rappi'|'ubereats', pedido_externo_id, items: [...], total, cliente }

    // TODO en producción: verificar firma/token de la plataforma antes de aceptar el pedido,
    // luego insertarlo en la base de datos compartida (no en localStorage del navegador)
    // para que aparezca en tiempo real en /cocina con origen = plataforma.

    console.log('Pedido de delivery recibido:', body)
    return NextResponse.json({ ok: true, received: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'Payload inválido' }, { status: 400 })
  }
}
