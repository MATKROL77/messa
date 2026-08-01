// Rangos del programa de fidelidad. Se comparten entre servidor y cliente:
// el servidor los usa para recalcular el rango al sumar puntos, la carta los
// usa para dibujar la tarjeta del comensal.
//
// El rango NO se edita a mano: es una función pura de los puntos acumulados.
// Así nadie —ni el dueño por error— puede dejar a un cliente en un rango que
// no le corresponde y que se "arregle" solo en la próxima compra.

export type RangoCliente = 'bronce' | 'plata' | 'oro' | 'platino'

export interface DefinicionRango {
  rango: RangoCliente
  label: string
  desde: number
  color: string
  beneficio: string
}

export const RANGOS: DefinicionRango[] = [
  { rango: 'bronce', label: 'Bronce', desde: 0, color: '#A8703C', beneficio: 'Acumulás puntos en cada visita' },
  { rango: 'plata', label: 'Plata', desde: 500, color: '#9AA0A6', beneficio: 'Café de cortesía en cada visita' },
  { rango: 'oro', label: 'Oro', desde: 1500, color: '#C69A3F', beneficio: 'Reserva prioritaria y postre de cortesía' },
  { rango: 'platino', label: 'Platino', desde: 4000, color: '#7E8CA8', beneficio: 'Mesa reservada y menú degustación anual' },
]

export function rangoPorPuntos(puntos: number): RangoCliente {
  let actual: RangoCliente = 'bronce'
  for (const definicion of RANGOS) {
    if (puntos >= definicion.desde) actual = definicion.rango
  }
  return actual
}

export function definicionDeRango(rango: RangoCliente): DefinicionRango {
  return RANGOS.find(item => item.rango === rango) || RANGOS[0]
}

/** Rango siguiente y cuántos puntos faltan. `null` si ya está en el tope. */
export function progresoAlSiguienteRango(puntos: number): { siguiente: DefinicionRango; faltan: number; porcentaje: number } | null {
  const actual = definicionDeRango(rangoPorPuntos(puntos))
  const siguiente = RANGOS.find(item => item.desde > actual.desde)
  if (!siguiente) return null
  const tramo = siguiente.desde - actual.desde
  const avance = puntos - actual.desde
  return {
    siguiente,
    faltan: Math.max(0, siguiente.desde - puntos),
    porcentaje: Math.min(100, Math.max(0, (avance / tramo) * 100)),
  }
}
