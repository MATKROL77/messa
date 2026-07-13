import { NextRequest, NextResponse } from 'next/server'

// El cliente NUNCA se auto-marca como "pagado". Cuando Mercado Pago redirige
// de vuelta a la app (back_urls.success), llega con un payment_id en la URL.
// Este endpoint consulta a la API REAL de Mercado Pago con el Access Token
// del servidor y confirma si ese pago está realmente aprobado antes de que
// el cliente pueda llamar a marcarComoPagado(). Esta es la única fuente de
// verdad — nada del lado del cliente decide si se cobró o no.
export async function GET(req: NextRequest) {
  const paymentId = req.nextUrl.searchParams.get('payment_id')
  const accessToken = process.env.MP_ACCESS_TOKEN

  if (!paymentId) return NextResponse.json({ ok: false, error: 'Falta payment_id' }, { status: 400 })
  if (!accessToken) return NextResponse.json({ ok: false, error: 'MP_ACCESS_TOKEN no configurado en el servidor' }, { status: 500 })

  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return NextResponse.json({ ok: false, error: 'No se pudo verificar el pago con Mercado Pago' }, { status: 502 })

    const pago = await res.json() as any;
    const aprobado = pago.status === 'approved'

    return NextResponse.json({
      ok: true,
      aprobado,
      status: pago.status,
      monto: pago.transaction_amount,
      external_reference: pago.external_reference,
      payment_id: pago.id,
    })
  } catch (err) {
    console.error('Error verificando pago MP:', err)
    return NextResponse.json({ ok: false, error: 'Error de red consultando Mercado Pago' }, { status: 500 })
  }
}
