import { NextRequest, NextResponse } from 'next/server'

// Webhook que recibe pedidos confirmados para inyectar en el POS del restaurante
// (MaxiRest, Alohar, o cualquier sistema propio). Configurar la URL de destino
// del POS en /admin/pagos -> pestaña POS / Impresora.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // body: { mesa_numero, items: [{nombre, cantidad, precio_unitario, ingredientes_removidos, notas}], total, dispositivo_id, timestamp }

    // TODO: reenviar a la API del POS del restaurante, por ejemplo:
    // await fetch(process.env.POS_WEBHOOK_URL!, { method: 'POST', body: JSON.stringify(body) })

    // TODO: enviar a impresora térmica de red (ESC/POS) si está configurada:
    // await fetch(`http://${process.env.PRINTER_IP}:${process.env.PRINTER_PORT}`, { method: 'POST', body: buildEscPosTicket(body) })

    console.log('Pedido recibido para inyectar en POS:', body)
    return NextResponse.json({ ok: true, received: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'Payload inválido' }, { status: 400 })
  }
}
