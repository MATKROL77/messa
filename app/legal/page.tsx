import Link from 'next/link'
import type { Metadata } from 'next'
import MessaWordmark from '@/components/messa-wordmark'

export const metadata: Metadata = {
  title: 'Términos y privacidad — MESSA',
  description: 'Condiciones de uso y tratamiento de datos personales en MESSA.',
}

/**
 * Términos y privacidad en una sola página.
 *
 * No es un trámite: MESSA guarda nombres, teléfonos y mails de comensales, y
 * eso en Argentina cae bajo la Ley 25.326 de Protección de Datos Personales.
 * Sin esta página, el restaurante que la usa queda expuesto, no MESSA.
 *
 * Está escrita para que la entienda el dueño de un restaurante, no un
 * abogado. Un texto que nadie lee no protege a nadie.
 */
export default function LegalPage() {
  return (
    <main className="messa-legal">
      <header className="messa-legal__header">
        <Link href="/" aria-label="MESSA, ir al inicio"><MessaWordmark /></Link>
        <p>Actualizado el 3 de agosto de 2026</p>
      </header>

      <article>
        <h1>Términos y privacidad</h1>
        <p className="messa-legal__intro">
          MESSA es la carta digital y el sistema de operación que usa este restaurante.
          Acá está, en castellano claro, qué datos se guardan, para qué, y qué podés pedir
          en cualquier momento.
        </p>

        <section>
          <h2>Qué datos se guardan</h2>
          <p>Depende de qué hagas:</p>
          <ul>
            <li><b>Si sólo mirás la carta:</b> nada que te identifique. Ni nombre, ni mail, ni tu ubicación.</li>
            <li><b>Si pedís desde la mesa:</b> lo que pediste, en qué mesa y a qué hora. El restaurante necesita eso para llevarte el plato y cobrarte.</li>
            <li><b>Si te hacés una cuenta:</b> tu nombre, tu mail y tus puntos de fidelidad.</li>
            <li><b>Si reservás:</b> tu nombre, tu teléfono y la fecha.</li>
          </ul>
          <p>
            No se guardan datos de tu tarjeta. Los pagos digitales los procesa Mercado Pago
            en su propio sistema: MESSA recibe si el pago salió bien o no, nada más.
          </p>
        </section>

        <section>
          <h2>Para qué se usan</h2>
          <p>
            Para que el restaurante pueda atenderte: preparar tu pedido, cobrarte, guardar tu
            reserva y acreditarte los puntos si tenés cuenta. Nada más.
          </p>
          <p>
            <b>No se venden ni se ceden a terceros</b>, no se usan para publicidad y no se
            cruzan con datos de otros restaurantes: cada uno ve únicamente lo suyo.
          </p>
        </section>

        <section>
          <h2>Cuánto tiempo se guardan</h2>
          <p>
            Los pedidos y las ventas quedan mientras el restaurante los necesite para su
            contabilidad. Tu cuenta de comensal existe hasta que pidas darla de baja.
          </p>
        </section>

        <section>
          <h2>Tus derechos</h2>
          <p>
            Podés pedir en cualquier momento acceder a tus datos, corregirlos o que los
            borren. Se hace escribiéndole al restaurante, que es quien responde por ellos.
          </p>
          <p className="messa-legal__nota">
            La Agencia de Acceso a la Información Pública, como autoridad de aplicación de la
            Ley 25.326, atiende los reclamos por incumplimientos.
          </p>
        </section>

        <section>
          <h2>Condiciones de uso</h2>
          <ul>
            <li>El código de tu mesa sirve para tu mesa. Usar el de otra, o intentar entrar al panel del personal, no está permitido.</li>
            <li>Los precios y la disponibilidad los define el restaurante y pueden cambiar.</li>
            <li>El servicio puede interrumpirse por mantenimiento o por causas ajenas —una caída de internet en el local, por ejemplo—. Cuando eso pasa, el restaurante te atiende igual.</li>
          </ul>
        </section>

        <section>
          <h2>Quién responde</h2>
          <p>
            De tus datos responde el restaurante donde estás comiendo, que es quien los
            recolecta. MESSA los procesa por su cuenta y bajo sus instrucciones, como
            proveedor del sistema.
          </p>
        </section>
      </article>

      <footer className="messa-legal__footer">
        <Link href="/">Volver al inicio</Link>
      </footer>
    </main>
  )
}
