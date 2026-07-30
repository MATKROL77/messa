import type { Metadata, Viewport } from 'next'
import './globals.css'
import ThemeApplier from '@/components/ThemeApplier'

export const metadata: Metadata = {
  title: 'MESSA — Dining, made precise',
  description: 'Carta digital y operación gastronómica premium.',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F5F2EA',
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
