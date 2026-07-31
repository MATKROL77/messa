import { ALFABETO, LARGO_CODIGO } from '@/lib/mesa-codigo'

/**
 * Códigos de mesa para la VISTA PREVIA estática (GitHub Pages).
 *
 * En esa publicación no hay servidor, así que `/api/mesa/*` no existe y los
 * códigos no se pueden derivar con una clave secreta. Para que la vista previa
 * igual se pueda recorrer de punta a punta —escanear un QR, entrar a la mesa,
 * pedir y dividir la cuenta— se derivan acá con una semilla pública y un hash
 * simple, que da el mismo código en todos los dispositivos.
 *
 * Esto NO es un control de acceso: la semilla viaja en el bundle y cualquiera
 * puede calcular el código de cualquier mesa. Sólo se usa cuando
 * `NEXT_PUBLIC_MESSA_PREVIEW` está activo; en el despliegue real manda
 * `lib/mesa-codigo-server.ts`, cuya clave nunca sale del servidor.
 */

export const MODO_VISTA_PREVIA = process.env.NEXT_PUBLIC_MESSA_PREVIEW === '1'

const SEMILLA_PUBLICA = 'messa-vista-previa'

/** Hash FNV-1a de 32 bits: alcanza para repartir los códigos de una demo. */
function fnv1a(texto: string): number {
  let hash = 0x811c9dc5
  for (let indice = 0; indice < texto.length; indice += 1) {
    hash ^= texto.charCodeAt(indice)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

export function codigoDeVistaPrevia(mesaId: string, version = 0): string {
  let estado = fnv1a(`${SEMILLA_PUBLICA}:${mesaId}:v${version}`)
  let codigo = ''
  for (let indice = 0; indice < LARGO_CODIGO; indice += 1) {
    codigo += ALFABETO[estado % ALFABETO.length]
    estado = fnv1a(`${estado}:${indice}`)
  }
  return `${codigo.slice(0, LARGO_CODIGO / 2)}-${codigo.slice(LARGO_CODIGO / 2)}`
}
