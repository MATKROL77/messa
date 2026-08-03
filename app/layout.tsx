import type { Metadata, Viewport } from 'next'
import './globals.css'
import ThemeApplier from '@/components/ThemeApplier'

export const metadata: Metadata = {
  title: 'MESSA — Dining, made precise',
  description: 'Carta digital y operación gastronómica premium.',
  // El manifiesto lo genera `app/manifest.ts`; Next inyecta el enlace solo y
  // le aplica el prefijo de despliegue. Declararlo a mano acá apuntaba a un
  // archivo inexistente y devolvía 404 en cada carga.
  icons: {
    // `app/icon.svg` lo toma Next automáticamente para la pestaña. iOS, en
    // cambio, ignora los SVG y necesita un PNG explícito: sin esta línea,
    // "Agregar a la pantalla de inicio" guarda una captura de la página en
    // lugar del logo.
    apple: [{ url: '/icono-180.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Acompaña el modo claro y el oscuro de la carta, en vez de forzar el claro.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F5F2EA' },
    { media: '(prefers-color-scheme: dark)', color: '#171612' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body>
        <ThemeApplier />
        <div className="app-shell">{children}</div>
      </body>
    </html>
  )
}
