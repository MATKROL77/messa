import type { PermisoAdmin } from '@/lib/store'

/**
 * Los tres niveles de MESSA.
 *
 * MESSA se había convertido en un todo-en-uno: dieciséis pantallas que un bar
 * de barrio no necesita y que, puestas todas juntas delante de un cliente,
 * hacen que el sistema parezca caro y complicado. Partirlo en tres hace dos
 * cosas a la vez: da una escalera de precios, y hace que cada restaurante vea
 * sólo lo que usa.
 *
 * La regla de arriba es la que ordena todo lo demás: el básico es la carta.
 * Si algo no se explica en una frase como parte de "tu carta, en el teléfono
 * del comensal", no va en el básico.
 */

export type NivelPlan = 'basico' | 'medio' | 'completo'

export const NIVELES: NivelPlan[] = ['basico', 'medio', 'completo']

/**
 * Qué módulos del panel trae cada nivel.
 *
 * Son acumulativos a propósito: nadie compra el medio para perder algo que
 * tenía. Cada nivel es el anterior más cosas, y eso se nota al venderlo.
 */
const MODULOS_BASICO: PermisoAdmin[] = ['resumen', 'carta', 'salon', 'identidad']

const MODULOS_MEDIO: PermisoAdmin[] = [
  ...MODULOS_BASICO,
  'pedidos', 'reservas', 'inventario', 'delivery', 'usuarios',
]

const MODULOS_COMPLETO: PermisoAdmin[] = [
  ...MODULOS_MEDIO,
  'finanzas', 'cobros', 'caja', 'fidelidad', 'sucursales', 'bitacora',
]

export const MODULOS_POR_NIVEL: Record<NivelPlan, PermisoAdmin[]> = {
  basico: MODULOS_BASICO,
  medio: MODULOS_MEDIO,
  completo: MODULOS_COMPLETO,
}

/**
 * Lo que cambia para el COMENSAL, que no se ve en el panel pero es lo que de
 * verdad distingue un nivel del otro.
 */
export interface Capacidades {
  /** El comensal manda su pedido desde el teléfono, sin esperar al mozo. */
  pedidoDesdeLaMesa: boolean
  /** Se paga por la app. Sin esto, "pagar" es llamar a quien cobra. */
  pagoDigital: boolean
  /** Dividir la cuenta entre los del grupo. */
  cuentaDividida: boolean
  /** Puntos y recompensas para quien vuelve. */
  fidelidad: boolean
}

export const CAPACIDADES_POR_NIVEL: Record<NivelPlan, Capacidades> = {
  // En el básico el teléfono es la carta y nada más: se mira y se llama al
  // mozo. Es exactamente el salto que da un restaurante que hoy tiene la carta
  // plastificada, y no le pide que cambie cómo trabaja.
  basico: { pedidoDesdeLaMesa: false, pagoDigital: false, cuentaDividida: false, fidelidad: false },
  // El medio cambia la operación: el pedido entra solo a la cocina. El cobro
  // sigue pasando por el mozo, que es lo que casi todos prefieren hasta que
  // se acostumbran.
  medio: { pedidoDesdeLaMesa: true, pagoDigital: false, cuentaDividida: true, fidelidad: false },
  completo: { pedidoDesdeLaMesa: true, pagoDigital: true, cuentaDividida: true, fidelidad: true },
}

export const ETIQUETA_NIVEL: Record<NivelPlan, { corto: string; nombre: string; resumen: string }> = {
  basico: {
    corto: 'Basic',
    nombre: 'Carta digital',
    resumen: 'Tu carta en el teléfono del comensal, editable al instante, y un botón para llamar al mozo.',
  },
  medio: {
    corto: 'Med',
    nombre: 'Servicio completo',
    resumen: 'El comensal pide desde la mesa y la comanda entra sola a la cocina. Reservas, inventario y delivery.',
  },
  completo: {
    corto: 'High',
    nombre: 'Todo el negocio',
    resumen: 'Cobro por la app, caja, finanzas, fidelidad, varias sucursales y registro de todo lo que pasa.',
  },
}

export function esNivel(valor: unknown): valor is NivelPlan {
  return typeof valor === 'string' && (NIVELES as string[]).includes(valor)
}

/** ¿Este nivel incluye ese módulo del panel? */
export function nivelIncluye(nivel: NivelPlan, permiso: PermisoAdmin): boolean {
  // 'plataforma' es de MESSA, no de ningún restaurante: no pertenece a ningún
  // nivel y se decide sólo por el rol.
  if (permiso === 'plataforma') return true
  return MODULOS_POR_NIVEL[nivel].includes(permiso)
}

export function capacidades(nivel: NivelPlan): Capacidades {
  return CAPACIDADES_POR_NIVEL[nivel]
}
