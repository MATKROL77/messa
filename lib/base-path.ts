/**
 * Prefijo bajo el que se publica la app. Vacío en el hosting propio y en
 * Cloudflare; en GitHub Pages el sitio vive en `/<repo>`, y las rutas absolutas
 * de las imágenes y de los QR tienen que incluirlo o apuntan a la raíz del
 * dominio y devuelven 404.
 */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '')

/** Convierte una ruta absoluta de la app (`/images/...`) en una URL servible. */
export function withBasePath(path: string): string {
  if (!BASE_PATH || !path.startsWith('/') || path.startsWith('//')) return path
  return `${BASE_PATH}${path}`
}

/** Origen completo de la app, listo para armar los enlaces que van en los QR. */
export function appOrigin(): string {
  if (typeof window === 'undefined') return BASE_PATH
  return `${window.location.origin}${BASE_PATH}`
}
