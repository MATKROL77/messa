import type { Metadata, Viewport } from 'next'
import './globals.css'
import ThemeApplier from '@/components/ThemeApplier'

export const metadata: Metadata = {
  title: 'MenuFlow — Menú Digital Premium',
  description: 'Sistema de gestión de mesa y menú digital para restaurantes premium. Creado por Matías Colimodio.',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0A0A0A',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
        {/* Tipografía premium — requiere conexión a internet al ejecutar el proyecto */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ background: '#0A0A0A', margin: 0, padding: 0, fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <ThemeApplier />
        <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', position: 'relative' }}>
          {children}
        </div>
      </body>
    </html>
  )
}
