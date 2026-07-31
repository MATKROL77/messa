import AccesoPorCodigoClient from './codigo-client'

/**
 * Los códigos no se pueden enumerar por adelantado, así que en la exportación
 * estática esta ruta se genera una sola vez y resuelve el código en el
 * navegador. En el despliegue con servidor la ruta es dinámica y el código lo
 * valida `/api/mesa/acceso`.
 */
export function generateStaticParams() {
  return [{ codigo: 'qr' }]
}

export default function AccesoPorCodigoPage() {
  return <AccesoPorCodigoClient />
}
