/**
 * Códigos de acceso de mesa.
 *
 * Antes, entrar a una mesa era tan simple como cambiar `/mesa/m1` por
 * `/mesa/m2` en la barra de direcciones: cualquiera podía sentarse en la mesa
 * de otra persona, sumar platos a su cuenta o verla. Ahora cada mesa tiene un
 * código alfanumérico propio que viaja dentro del QR (y del tag RFID/NFC), y
 * sin ese código la mesa no abre.
 *
 * El alfabeto evita caracteres que se confunden al leerlos o dictarlos por
 * teléfono (0/O, 1/I/L, 5/S, 8/B), porque el código también se puede tipear a
 * mano si el QR está rayado.
 */

export const ALFABETO = '234679ACDEFGHJKMNPQRTUVWXYZ'
export const LARGO_BLOQUE = 4
export const BLOQUES = 2
export const LARGO_CODIGO = LARGO_BLOQUE * BLOQUES

/**
 * Cuántas regeneraciones de código puede resolver el servidor hacia atrás. El
 * código se deriva de (id de mesa + versión), así que verificar uno es probar
 * las versiones conocidas; el tope evita que la verificación crezca sin
 * control si alguien regenera cientos de veces.
 */
export const MAX_VERSION_CODIGO = 64

function caracterAleatorio(): string {
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const buffer = new Uint32Array(1)
    // Rechaza los valores del último tramo incompleto para que todos los
    // caracteres del alfabeto tengan exactamente la misma probabilidad.
    const limite = Math.floor(0xffffffff / ALFABETO.length) * ALFABETO.length
    let valor = limite
    while (valor >= limite) {
      globalThis.crypto.getRandomValues(buffer)
      valor = buffer[0]
    }
    return ALFABETO[valor % ALFABETO.length]
  }
  return ALFABETO[Math.floor(Math.random() * ALFABETO.length)]
}

/** Genera un código nuevo con el formato `XXXX-XXXX`. */
export function generarCodigoMesa(): string {
  return Array.from({ length: BLOQUES }, () =>
    Array.from({ length: LARGO_BLOQUE }, caracterAleatorio).join(''),
  ).join('-')
}

/**
 * Normaliza lo que escribió una persona (o leyó un lector RFID) para poder
 * compararlo: mayúsculas, sin separadores, y traduciendo las confusiones
 * clásicas de lectura a su equivalente del alfabeto.
 */
export function normalizarCodigo(valor: string): string {
  return valor
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/[OQ]/g, 'Q')
    .replace(/[ILÍ1]/g, 'J')
    .replace(/[S5]/g, 'X')
    .replace(/[B8]/g, 'P')
}

/** Compara dos códigos tolerando guiones, minúsculas y confusiones de lectura. */
export function codigosCoinciden(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false
  const normalizadoA = normalizarCodigo(a)
  return normalizadoA.length >= LARGO_BLOQUE * BLOQUES && normalizadoA === normalizarCodigo(b)
}

/** Presentación legible del código, siempre con el guion en el medio. */
export function formatearCodigo(codigo: string): string {
  const limpio = codigo.toUpperCase().replace(/[^0-9A-Z]/g, '')
  if (limpio.length !== LARGO_BLOQUE * BLOQUES) return codigo.toUpperCase()
  return `${limpio.slice(0, LARGO_BLOQUE)}-${limpio.slice(LARGO_BLOQUE)}`
}

/**
 * URL que se imprime en el QR de la mesa.
 *
 * La forma corta `/m/<codigo>` es la habitual: no expone el id interno de la
 * mesa. En la vista previa estática no existe un servidor que resuelva códigos
 * arbitrarios y sólo hay HTML pregenerado por mesa, así que ahí se usa la forma
 * larga, que apunta a una página que sí existe.
 */
export function urlDeMesa(origen: string, codigo: string, mesaId?: string): string {
  const base = origen.replace(/\/$/, '')
  return mesaId
    ? `${base}/mesa/${mesaId}?c=${encodeURIComponent(formatearCodigo(codigo))}`
    : `${base}/m/${formatearCodigo(codigo)}`
}

/** URL que se graba en un tag RFID/NFC. */
export function urlDeRfid(origen: string, tag: string): string {
  return `${origen.replace(/\/$/, '')}/rfid/${encodeURIComponent(tag.trim().toUpperCase())}`
}

/** Limpia el UID que devuelve un lector RFID/NFC (suelen venir con espacios o `:`). */
export function normalizarTagRfid(valor: string): string {
  return valor.trim().toUpperCase().replace(/[^0-9A-Z]/g, '')
}
