'use client'

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { DoorOpen, Rows3, Square, Trees, Type as TypeIcon, Utensils } from 'lucide-react'
import type { ElementoPlano, Mesa, MesaEstado, TipoElementoPlano } from '@/types'

/**
 * Plano editable del salón.
 *
 * Todo se guarda en porcentajes del lienzo, no en píxeles: el mismo plano se
 * ve igual en la tablet del mozo y en el monitor de la caja, sin recalcular
 * nada al cambiar de pantalla.
 *
 * En modo normal el plano es sólo para mirar y tocar: un toque abre la mesa.
 * En modo edición se arrastra y se redimensiona, y nada de eso puede pasar por
 * accidente durante el servicio.
 */

export const TIPOS_ELEMENTO: { tipo: TipoElementoPlano; label: string; Icon: typeof Square }[] = [
  { tipo: 'pared', label: 'Pared', Icon: Rows3 },
  { tipo: 'barra', label: 'Barra', Icon: Utensils },
  { tipo: 'columna', label: 'Columna', Icon: Square },
  { tipo: 'puerta', label: 'Puerta', Icon: DoorOpen },
  { tipo: 'planta', label: 'Planta', Icon: Trees },
  { tipo: 'etiqueta', label: 'Cartel', Icon: TypeIcon },
]

export const ETIQUETAS_SUGERIDAS = ['Cocina', 'Recibidor', 'Caja', 'Salida', 'Baños', 'Terraza', 'Barra']

export const ESTADOS_MESA: Record<MesaEstado, { label: string; tone: 'green' | 'rose' | 'amber' | 'gold' | 'blue' }> = {
  libre: { label: 'Libre', tone: 'green' },
  ocupada: { label: 'Ocupada', tone: 'rose' },
  pedido: { label: 'Con pedido', tone: 'amber' },
  pagando: { label: 'Pagando', tone: 'gold' },
  pagada: { label: 'Pagada', tone: 'blue' },
}

export function nombreDeMesa(mesa: Mesa): string {
  return mesa.nombre?.trim() || `M${mesa.numero}`
}

type Seleccion = { tipo: 'mesa' | 'elemento'; id: string } | null
type Arrastre = {
  clase: 'mesa' | 'elemento'
  id: string
  modo: 'mover' | 'redimensionar'
  /** Desfase entre el punto tocado y el centro, para que no salte al agarrar. */
  offsetX: number
  offsetY: number
}

export default function PlanoSalon({
  mesas,
  elementos,
  editando,
  seleccion,
  onSeleccionar,
  onAbrirMesa,
  onMoverMesa,
  onRedimensionarMesa,
  onMoverElemento,
  onRedimensionarElemento,
  comensalesDeMesa,
}: {
  mesas: Mesa[]
  elementos: ElementoPlano[]
  editando: boolean
  seleccion: Seleccion
  onSeleccionar: (seleccion: Seleccion) => void
  onAbrirMesa: (mesaId: string) => void
  onMoverMesa: (mesaId: string, x: number, y: number) => void
  onRedimensionarMesa: (mesaId: string, ancho: number, alto: number) => void
  onMoverElemento: (id: string, x: number, y: number) => void
  onRedimensionarElemento: (id: string, ancho: number, alto: number) => void
  comensalesDeMesa: (mesa: Mesa) => number
}) {
  const lienzoRef = useRef<HTMLDivElement>(null)
  const [arrastre, setArrastre] = useState<Arrastre | null>(null)

  const porcentaje = useCallback((clientX: number, clientY: number) => {
    const rect = lienzoRef.current?.getBoundingClientRect()
    if (!rect) return { x: 50, y: 50 }
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    }
  }, [])

  const iniciar = (
    event: ReactPointerEvent,
    clase: 'mesa' | 'elemento',
    id: string,
    modo: 'mover' | 'redimensionar',
    centroX: number,
    centroY: number,
  ) => {
    if (!editando) return
    event.stopPropagation()
    event.preventDefault()
    // Capturar el puntero hace que el arrastre siga funcionando aunque el dedo
    // se salga del elemento; sin esto, mover rápido lo suelta a mitad de camino.
    ;(event.target as HTMLElement).setPointerCapture?.(event.pointerId)
    const { x, y } = porcentaje(event.clientX, event.clientY)
    setArrastre({ clase, id, modo, offsetX: x - centroX, offsetY: y - centroY })
    onSeleccionar({ tipo: clase, id })
  }

  const mover = (event: ReactPointerEvent) => {
    if (!arrastre) return
    event.preventDefault()
    const { x, y } = porcentaje(event.clientX, event.clientY)

    if (arrastre.modo === 'mover') {
      const destinoX = x - arrastre.offsetX
      const destinoY = y - arrastre.offsetY
      if (arrastre.clase === 'mesa') onMoverMesa(arrastre.id, destinoX, destinoY)
      else onMoverElemento(arrastre.id, destinoX, destinoY)
      return
    }

    // Redimensionar: el tamaño es el doble de la distancia al centro, porque
    // el elemento crece de forma simétrica desde su punto de anclaje.
    const objeto = arrastre.clase === 'mesa'
      ? mesas.find(mesa => mesa.id === arrastre.id)
      : elementos.find(elemento => elemento.id === arrastre.id)
    if (!objeto) return
    const ancho = Math.abs(x - objeto.pos_x) * 2
    const alto = Math.abs(y - objeto.pos_y) * 2
    // La mesa sólo cambia de ancho —la forma decide su proporción—; los muros
    // y carteles sí se estiran libremente en los dos ejes.
    if (arrastre.clase === 'mesa') onRedimensionarMesa(arrastre.id, ancho, alto)
    else onRedimensionarElemento(arrastre.id, ancho, alto)
  }

  return (
    <div
      className={`messa-plano${editando ? ' is-editing' : ''}`}
      ref={lienzoRef}
      onPointerMove={mover}
      onPointerUp={() => setArrastre(null)}
      onPointerCancel={() => setArrastre(null)}
      onPointerDown={() => { if (editando) onSeleccionar(null) }}
      role="application"
      aria-label="Plano del salón"
    >
      {elementos.map(elemento => {
        const activo = seleccion?.tipo === 'elemento' && seleccion.id === elemento.id
        return (
          <div
            key={elemento.id}
            className={`messa-plano__elemento messa-plano__elemento--${elemento.tipo}${activo ? ' is-selected' : ''}`}
            style={{
              left: `${elemento.pos_x}%`,
              top: `${elemento.pos_y}%`,
              width: `${elemento.ancho}%`,
              height: `${elemento.alto}%`,
              transform: `translate(-50%, -50%) rotate(${elemento.rotacion || 0}deg)`,
            }}
            onPointerDown={event => iniciar(event, 'elemento', elemento.id, 'mover', elemento.pos_x, elemento.pos_y)}
          >
            {elemento.tipo === 'etiqueta' && <span>{elemento.texto}</span>}
            {editando && (
              <button
                type="button"
                className="messa-plano__handle"
                aria-label={`Cambiar el tamaño de ${elemento.texto || elemento.tipo}`}
                onPointerDown={event => iniciar(event, 'elemento', elemento.id, 'redimensionar', elemento.pos_x, elemento.pos_y)}
              />
            )}
          </div>
        )
      })}

      {mesas.map(mesa => {
        const activo = seleccion?.tipo === 'mesa' && seleccion.id === mesa.id
        const comensales = comensalesDeMesa(mesa)
        return (
          <div
            key={mesa.id}
            className={`messa-plano__mesa is-${mesa.estado} is-${mesa.forma}${activo ? ' is-selected' : ''}`}
            style={{
              left: `${mesa.pos_x}%`,
              top: `${mesa.pos_y}%`,
              // Sólo se fija el ancho: el alto sale de `aspect-ratio` según la
              // forma. Si se fijaran los dos en porcentaje, una mesa redonda se
              // vería como un óvalo, porque el lienzo es más ancho que alto.
              width: `${mesa.ancho ?? 9}%`,
            }}
            onPointerDown={event => iniciar(event, 'mesa', mesa.id, 'mover', mesa.pos_x, mesa.pos_y)}
          >
            <button
              type="button"
              className="messa-plano__mesa-boton"
              onClick={() => { if (!editando) onAbrirMesa(mesa.id) }}
              aria-label={`${nombreDeMesa(mesa)}, ${ESTADOS_MESA[mesa.estado].label}, ${comensales} de ${mesa.capacidad} comensales`}
            >
              <b>{nombreDeMesa(mesa)}</b>
              <small>{comensales || '—'}/{mesa.capacidad}</small>
            </button>
            {editando && (
              <button
                type="button"
                className="messa-plano__handle"
                aria-label={`Cambiar el tamaño de ${nombreDeMesa(mesa)}`}
                onPointerDown={event => iniciar(event, 'mesa', mesa.id, 'redimensionar', mesa.pos_x, mesa.pos_y)}
              />
            )}
          </div>
        )
      })}

      {mesas.length === 0 && elementos.length === 0 && (
        <p className="messa-plano__vacio">El plano está vacío. Entrá en «Editar plano» y agregá tu primera mesa.</p>
      )}
    </div>
  )
}
