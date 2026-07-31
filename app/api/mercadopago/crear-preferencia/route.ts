import { NextRequest, NextResponse } from 'next/server'

interface PreferenciaRequest {
  monto?: number
  descripcion?: string
  mesa_id?: string
  mesa_numero?: number
  propina?: number
  email?: string
  /** Importe de la parte pagada cuando la cuenta se dividió (0 = paga todo). */
  parcial?: number
}

interface PreferenciaResponse {
  init_point?: string
  id?: string
}

// Crea una preferencia de pago real en Mercado Pago (Checkout Pro).
// El Access Token vive SOLO acá, como variable de entorno del servidor
// (MP_ACCESS_TOKEN) — nunca se manda al cliente ni se guarda en el store.
// Sin esa variable configurada, respondemos demo:true para que el cliente
// use el checkout de demostración (misma UX, sin cobro real).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as PreferenciaRequest
    const { monto, descripcion, mesa_id, mesa_numero, propina, email, parcial } = body

    const accessToken = process.env.MP_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json({ demo: true, monto, descripcion })
    }

    if (typeof monto !== 'number' || monto <= 0) {
      return NextResponse.json({ ok: false, error: 'Monto inválido' }, { status: 400 })
    }

    // Los back_urls llevan propina/email como query params propios — Mercado
    // Pago los conserva y les agrega los suyos (payment_id, status, etc.) al
    // redirigir de vuelta, así el cliente puede recuperar ese contexto sin
    // depender de estado local que se pierde al salir de la app.
    const qs = new URLSearchParams({ propina: String(propina || 0), email: email || '', parcial: String(parcial || 0) }).toString()
    const backUrl = (status: string) => `${req.nextUrl.origin}/mesa/${mesa_id}?mp_status=${status}&${qs}`

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        items: [{ title: descripcion || `Mesa ${mesa_numero}`, quantity: 1, unit_price: monto, currency_id: 'ARS' }],
        external_reference: mesa_id || '',
        back_urls: {
          success: backUrl('success'),
          failure: backUrl('failure'),
          pending: backUrl('pending'),
        },
        auto_return: 'approved',
        notification_url: `${req.nextUrl.origin}/api/webhook/mercadopago`,
      }),
    })

    if (!mpRes.ok) {
      const errText = await mpRes.text()
      console.error('Mercado Pago rechazó la preferencia:', errText)
      return NextResponse.json({ demo: true, monto, descripcion, error: 'Mercado Pago rechazó la solicitud. Revisá tu Access Token.' })
    }

    const data = await mpRes.json() as PreferenciaResponse
    return NextResponse.json({ demo: false, init_point: data.init_point, preference_id: data.id })
  } catch (err) {
    console.error('Error creando preferencia MP:', err)
    return NextResponse.json({ demo: true, error: 'No se pudo conectar con Mercado Pago' })
  }
}
