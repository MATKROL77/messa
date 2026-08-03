import type { NextConfig } from "next";

/**
 * MESSA se publica de dos maneras:
 *
 * 1. Despliegue completo (Cloudflare Workers con OpenNext, o `next start` en un
 *    servidor propio): incluye las API de login, de Mercado Pago y de códigos
 *    de mesa. Es el modo por defecto.
 *
 * 2. Vista previa estática (GitHub Pages), activada con `MESSA_STATIC_EXPORT=1`:
 *    exporta HTML plano bajo el subdirectorio del repositorio. No hay servidor,
 *    así que no van las rutas de API; la app lo detecta con
 *    `NEXT_PUBLIC_MESSA_PREVIEW` y lo avisa en pantalla.
 */
const exportacionEstatica = process.env.MESSA_STATIC_EXPORT === '1'
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '')

/**
 * Cabeceras de seguridad.
 *
 * La más importante es `X-Frame-Options`: sin ella cualquiera puede meter el
 * panel dentro de un iframe en su propia web, ponerle botones encima y lograr
 * que un empleado apriete cosas que no ve. Se llama clickjacking y es la única
 * de estas que se explota sin necesitar nada más.
 *
 * La CSP no lleva `script-src` estricto a propósito: Next inyecta scripts en
 * línea para hidratar la página, y prohibirlos sin nonce rompería la app
 * entera. Lo que sí cierra es de dónde pueden venir los datos y quién puede
 * enmarcarnos, que es lo que aporta valor real acá.
 */
const CABECERAS_SEGURIDAD = [
  // Nadie puede enmarcar la app dentro de otra web.
  { key: 'X-Frame-Options', value: 'DENY' },
  // El navegador respeta el Content-Type declarado y no adivina.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Un año de HTTPS obligatorio para este dominio.
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // Al salir del sitio no se filtra la ruta que estaba mirando el usuario.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // No pedimos cámara, micrófono ni ubicación: se apagan de entrada.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Las fotos de los platos y los logos pueden venir de cualquier hosting.
      "img-src 'self' data: blob: https:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "font-src 'self' data:",
      // Supabase y Mercado Pago son los únicos destinos de datos.
      "connect-src 'self' https://*.supabase.co https://api.mercadopago.com",
      "frame-src https://*.mercadopago.com https://*.mercadolibre.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.0.42'],
  // Deja de anunciar con qué está hecho el sitio.
  poweredByHeader: false,
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    }
  },
  // La exportación estática no tiene servidor que emita cabeceras: ahí las
  // pone el hosting, no Next, y declararlas haría fallar el build.
  ...(exportacionEstatica ? {} : {
    async headers() {
      return [{ source: '/:ruta*', headers: CABECERAS_SEGURIDAD }]
    },
  }),
  ...(exportacionEstatica
    ? {
      output: 'export' as const,
      // GitHub Pages sirve el sitio en `/<repo>`: sin este prefijo todos los
      // recursos se pedirían a la raíz del dominio y darían 404.
      ...(basePath ? { basePath, assetPrefix: basePath } : {}),
      // Pages no tiene el optimizador de imágenes de Next.
      images: { unoptimized: true },
      trailingSlash: true,
    }
    : {}),
};

export default nextConfig;
