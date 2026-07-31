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

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.0.42'],
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    }
  },
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
