import type { MetadataRoute } from 'next'
import { withBasePath } from '@/lib/base-path'

/**
 * `layout.tsx` ya declaraba `manifest: '/manifest.json'`, pero ese archivo no
 * existía: el navegador pedía el manifiesto en cada carga y recibía un 404, y
 * "Agregar a la pantalla de inicio" no funcionaba. Generarlo desde acá lo
 * mantiene sincronizado con la marca y respeta el prefijo de despliegue.
 */
// El manifiesto no depende de la petición: marcarlo estático permite además
// exportarlo en la publicación de vista previa.
export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MESSA — Carta digital y operación',
    short_name: 'MESSA',
    description: 'Carta digital, pedidos desde la mesa y operación gastronómica.',
    start_url: withBasePath('/'),
    scope: withBasePath('/'),
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#1B1A16',
    theme_color: '#C69A3F',
    lang: 'es-AR',
    categories: ['food', 'business'],
    icons: [
      // 'maskable' deja que Android recorte el ícono a la forma del sistema
      // sin comerse la hoja dorada; sin él lo mete dentro de otro círculo
      // blanco y queda un ícono adentro de un ícono.
      { src: withBasePath('/icono-192.png'), sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: withBasePath('/icono-512.png'), sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: withBasePath('/icono-512.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
