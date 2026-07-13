import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'

// Webhook oficial de Mercado Pago (IPN / webhooks v2). Registrar esta URL en
// https://www.mercadopago.com.ar/developers/panel/webhooks:
//   https://tu-dominio.com/api/webhook/mercadopago
//
// Hace dos verificaciones reales antes de confiar en el aviso:
//  1) Valida la firma x-signature con el secreto del webhook (MP_WEBHOOK_SECRET),
//     así confirmamos que el aviso vino realmente de Mercado Pago y no de
//     alguien pegándole a esta URL con un payload falso.
//  2) Re-consulta el pago real contra la API de Mercado Pago (nunca confía
//     ciegamente en el status que venga en el body del webhook).
//
// IMPORTANTE — lo que este endpoint todavía NO puede hacer: no hay una base
// de datos compartida conectada todavía (ver LEEME.md), así que aunque la
// verificación de abajo es 100% real, no hay un lugar persistente donde
// escribir "la mesa X está pagada" que el navegador del comensal pueda leer.
// Por eso el flujo de pago del cliente usa /api/mercadopago/verificar-pago
// al volver del checkout, en vez de depender de este webhook. El día que
// conectes Supabase/D1, este es el lugar donde tenés que escribir el estado
// del pedido — dejamos la verificación ya lista y correcta.
function validarFirma(req: NextRequest, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) return false // sin secreto configurado no podemos validar — se rechaza

  const signatureHeader = req.headers.get('x-signature')
  const requestId = req.headers.get('x-request-id')
  if (!signatureHeader || !requestId) return false

  const partes = Object.fromEntries(signatureHeader.split(',').map(p => {
    const [k, v] = p.split('=')
    return [k?.trim(), v?.trim()]
  }))
  const ts = partes.ts
  const hashRecibido = partes.v1
  if (!ts || !hashRecibido) return false

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
  const hashEsperado = createHmac('sha256', secret).update(manifest).digest('hex')

  try {
    const a = Buffer.from(hashRecibido)
    const b = Buffer.from(hashEsperado)
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    if (body.type !== 'payment') return NextResponse.json({ ok: true })

    const paymentId = body.data?.id
    if (!paymentId) return NextResponse.json({ ok: false, error: 'Sin data.id' }, { status: 400 })

    if (!validarFirma(req, String(paymentId))) {
      console.warn('Webhook MP rechazado: firma inválida o MP_WEBHOOK_SECRET no configurado')
      return NextResponse.json({ ok: false, error: 'Firma inválida' }, { status: 401 })
    }

    const accessToken = process.env.MP_ACCESS_TOKEN
    if (!accessToken) return NextResponse.json({ ok: false, error: 'MP_ACCESS_TOKEN no configurado' }, { status: 500 })

    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return NextResponse.json({ ok: false, error: 'No se pudo confirmar el pago con MP' }, { status: 502 })

    const pago = await res.json() as any;
    if (pago.status === 'approved') {
      // TODO (cuando haya base de datos): marcar como pagado el pedido
      // asociado a pago.external_reference (mesa_id) de forma persistente,
      // y notificar por WebSocket/Realtime al dashboard y al KDS.
      console.log('Pago aprobado y verificado:', { paymentId, mesa_id: pago.external_reference, monto: pago.transaction_amount })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error en webhook MP:', err)
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
