import { createHmac, timingSafeEqual } from 'crypto'
import { ALFABETO, LARGO_CODIGO, MAX_VERSION_CODIGO, normalizarCodigo } from '@/lib/mesa-codigo'

/**
 * Derivación de los códigos de mesa en el SERVIDOR.
 *
 * Un código aleatorio generado en el navegador no sirve para nada real: el
 * teléfono del comensal y la computadora del dueño son dos almacenamientos
 * distintos, así que cada uno inventaría un código diferente y el QR impreso
 * nunca abriría la mesa en otro dispositivo. Acá el código se *deriva* de
 * `(id de mesa + versión)` con una clave que vive sólo en el servidor, de modo
 * que cualquier dispositivo obtiene y valida el mismo código, y nadie puede
 * calcular el de la mesa de al lado sin conocer la clave.
 *
 * Regenerar el código de una mesa es subir su versión: los QR anteriores dejan
 * de resolver a la versión vigente y quedan invalidados.
 */

function claveDeCodigos(): string {
  // `MESSA_CODIGO_SEED` permite rotar los códigos sin tocar las sesiones.
  // Si no está definida se reutiliza SESSION_SECRET, que ya es obligatorio.
  const clave = process.env.MESSA_CODIGO_SEED || process.env.SESSION_SECRET
  if (!clave) {
    throw new Error('Falta SESSION_SECRET (o MESSA_CODIGO_SEED) para derivar los códigos de mesa.')
  }
  return clave
}

export function hayClaveDeCodigos(): boolean {
  return Boolean(process.env.MESSA_CODIGO_SEED || process.env.SESSION_SECRET)
}

/** Código determinístico de una mesa para una versión dada. */
export function derivarCodigo(mesaId: string, version = 0): string {
  const digest = createHmac('sha256', claveDeCodigos()).update(`mesa:${mesaId}:v${version}`).digest()
  let codigo = ''
  for (let indice = 0; indice < LARGO_CODIGO; indice += 1) {
    codigo += ALFABETO[digest[indice] % ALFABETO.length]
  }
  return `${codigo.slice(0, LARGO_CODIGO / 2)}-${codigo.slice(LARGO_CODIGO / 2)}`
}

function iguales(a: string, b: string): boolean {
  const bufferA = Buffer.from(a)
  const bufferB = Buffer.from(b)
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB)
}

/**
 * Devuelve la versión a la que corresponde el código, o `null` si no pertenece
 * a esa mesa.
 *
 * Limitación honesta, mientras MESSA no tenga base de datos: se aceptan todas
 * las versiones derivables, no sólo la vigente. La versión vigente sólo existe
 * en el navegador del dueño, así que el teléfono de un comensal recién llegado
 * no tiene forma de conocerla y exigirla dejaría afuera a todo el mundo.
 * Consecuencia: regenerar el código cambia el QR que se imprime, pero el
 * anterior sigue siendo válido hasta conectar Supabase (ver LEEME.md). Lo que
 * sí queda garantizado desde ahora es lo importante: el código de una mesa no
 * abre ninguna otra, y sin código no se entra.
 */
export function resolverVersion(mesaId: string, codigo: string): number | null {
  const buscado = normalizarCodigo(codigo)
  if (buscado.length !== LARGO_CODIGO) return null
  for (let version = 0; version <= MAX_VERSION_CODIGO; version += 1) {
    if (iguales(buscado, normalizarCodigo(derivarCodigo(mesaId, version)))) return version
  }
  return null
}
