'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

/** Cuánto hay que sostener el dedo para que se active el reordenamiento. */
const ESPERA_MANTENER = 450
/** Si el dedo se corre más que esto antes de tiempo, era un desplazamiento. */
const TOLERANCIA_DEDO = 10

/**
 * Reordenar tarjetas arrastrándolas, con la animación de "hacer lugar".
 *
 * Por qué no `draggable` de HTML5: en una tablet —que es donde el dueño
 * acomoda la carta— no dispara nada. Con eventos de puntero funciona igual en
 * mouse, dedo y lápiz, y permite capturar el puntero para que el arrastre no
 * se corte al salirse de la tarjeta.
 *
 * La animación usa FLIP: se miden las posiciones ANTES de reordenar, se
 * comparan con las de después y se anima la diferencia. Es la única forma de
 * animar un cambio de posición en una grilla CSS, porque el navegador no
 * transiciona el reflujo. Sin esto, las tarjetas saltan de golpe y el
 * movimiento se siente roto.
 */
export function useReordenar(opciones: {
  /** Selector de cada elemento reordenable dentro del contenedor. */
  selector: string
  /** Se llama cuando el elemento arrastrado tiene que ir a la posición de otro. */
  onMover: (idArrastrado: string, idDestino: string) => void
  activo: boolean
  /** Mantener apretado un elemento enciende el modo, como en iOS. */
  onActivar?: () => void
}) {
  const { selector, onMover, activo, onActivar } = opciones
  const contenedorRef = useRef<HTMLDivElement>(null)
  const [arrastrandoId, setArrastrandoId] = useState<string | null>(null)
  const posiciones = useRef<Map<string, DOMRect>>(new Map())
  const ultimoDestino = useRef<string | null>(null)
  /** Distancia entre el dedo y la esquina de la tarjeta al agarrarla. */
  const agarre = useRef({ x: 0, y: 0 })
  const elementoArrastrado = useRef<HTMLElement | null>(null)
  /** El dedo que está sosteniendo una tarjeta, antes de que se cumpla la espera. */
  const pendiente = useRef<{ id: string; tarjeta: HTMLElement; pointerId: number; x: number; y: number } | null>(null)
  const espera = useRef<number | undefined>(undefined)

  // Mientras una tarjeta está en el aire, el dedo no tiene que desplazar la
  // página. `touch-action` no alcanza: cuando el modo se enciende a mitad del
  // gesto, el navegador ya decidió que ese toque servía para desplazar.
  useEffect(() => {
    if (!arrastrandoId) return
    const frenar = (event: TouchEvent) => event.preventDefault()
    document.addEventListener('touchmove', frenar, { passive: false })
    return () => document.removeEventListener('touchmove', frenar)
  }, [arrastrandoId])

  // Si la pantalla se desmonta con el dedo apoyado, el reloj no puede quedar
  // vivo: encendería el modo sobre una tarjeta que ya no existe.
  useEffect(() => () => { if (espera.current !== undefined) window.clearTimeout(espera.current) }, [])

  const medir = useCallback(() => {
    const mapa = new Map<string, DOMRect>()
    contenedorRef.current?.querySelectorAll<HTMLElement>(selector).forEach(el => {
      const id = el.dataset.reorderId
      if (id) mapa.set(id, el.getBoundingClientRect())
    })
    posiciones.current = mapa
  }, [selector])

  // Después de cada reordenamiento, animar cada tarjeta desde donde estaba
  // hasta donde quedó. Se usa `useLayoutEffect` porque tiene que ocurrir antes
  // de que el navegador pinte, o se vería el salto.
  useLayoutEffect(() => {
    if (!posiciones.current.size) return
    const anteriores = posiciones.current
    contenedorRef.current?.querySelectorAll<HTMLElement>(selector).forEach(el => {
      const id = el.dataset.reorderId
      if (!id) return
      const antes = anteriores.get(id)
      if (!antes) return
      // La que está en la mano la mueve el dedo, no la animación de reflujo.
      if (el === elementoArrastrado.current) return
      const ahora = el.getBoundingClientRect()
      const dx = antes.left - ahora.left
      const dy = antes.top - ahora.top
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
      el.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
        { duration: 320, easing: 'cubic-bezier(.32, .72, 0, 1)' },
      )
    })
    posiciones.current = new Map()
  })

  const alzar = (id: string, tarjeta: HTMLElement, pointerId: number, clientX: number, clientY: number) => {
    tarjeta.setPointerCapture?.(pointerId)
    elementoArrastrado.current = tarjeta
    const caja = tarjeta.getBoundingClientRect()
    // Guardar dónde se agarró la tarjeta hace que no salte al levantarla:
    // se mueve desde el punto exacto que tocó el dedo, como un icono de iOS.
    agarre.current = { x: clientX - caja.left, y: clientY - caja.top }
    setArrastrandoId(id)
    ultimoDestino.current = null
  }

  const olvidarEspera = () => {
    if (espera.current !== undefined) window.clearTimeout(espera.current)
    espera.current = undefined
    pendiente.current = null
  }

  const iniciar = (event: ReactPointerEvent, id: string) => {
    // Los botones de la tarjeta siguen siendo botones: agarrar no es tocar.
    if ((event.target as HTMLElement).closest('button')?.dataset.noArrastrar) return
    const tarjeta = (event.currentTarget as HTMLElement).closest<HTMLElement>(selector)
    if (!tarjeta) return

    if (activo) {
      event.preventDefault()
      event.stopPropagation()
      alzar(id, tarjeta, event.pointerId, event.clientX, event.clientY)
      return
    }

    // Fuera del modo, sostener el dedo lo enciende y deja la tarjeta ya
    // levantada: el mismo gesto sirve para entrar y para mover, sin soltar.
    // Acá no se llama a `preventDefault`: hasta que se cumpla la espera esto
    // todavía puede ser un desplazamiento o un toque en un botón.
    if (!onActivar) return
    pendiente.current = { id, tarjeta, pointerId: event.pointerId, x: event.clientX, y: event.clientY }
    espera.current = window.setTimeout(() => {
      const listo = pendiente.current
      olvidarEspera()
      if (!listo) return
      onActivar()
      // Al sostener con el mouse el navegador va seleccionando el texto de la
      // tarjeta; se limpia para que no quede resaltada mientras se arrastra.
      window.getSelection()?.removeAllRanges()
      navigator.vibrate?.(8)
      alzar(listo.id, listo.tarjeta, listo.pointerId, listo.x, listo.y)
    }, ESPERA_MANTENER)
  }

  /** Pega la tarjeta al dedo. Se recalcula en cada movimiento porque, al
   *  reordenarse la grilla, su casilla cambia de lugar debajo de ella. */
  const seguirAlDedo = (clientX: number, clientY: number) => {
    const el = elementoArrastrado.current
    if (!el) return
    // Se limpia la transformación para leer dónde está REALMENTE su casilla;
    // si se leyera con la transformación puesta, el desplazamiento se iría
    // acumulando y la tarjeta se escaparía de la pantalla.
    el.style.transform = 'none'
    const caja = el.getBoundingClientRect()
    const dx = clientX - agarre.current.x - caja.left
    const dy = clientY - agarre.current.y - caja.top
    el.style.transform = `translate(${dx}px, ${dy}px) scale(1.04)`
  }

  const mover = (event: ReactPointerEvent) => {
    // Todavía sosteniendo: si el dedo se corre, quería desplazar la lista.
    const esperando = pendiente.current
    if (esperando) {
      if (Math.hypot(event.clientX - esperando.x, event.clientY - esperando.y) > TOLERANCIA_DEDO) olvidarEspera()
      return
    }
    if (!arrastrandoId) return
    event.preventDefault()
    seguirAlDedo(event.clientX, event.clientY)

    // El elemento bajo el dedo: `elementFromPoint` es más fiable que calcular
    // rectángulos a mano cuando la grilla tiene varias columnas y saltos. La
    // tarjeta levantada no intercepta (CSS le pone `pointer-events: none`),
    // así que lo que se detecta es siempre la de abajo.
    const bajo = document.elementFromPoint(event.clientX, event.clientY)
    const tarjeta = bajo?.closest<HTMLElement>(selector)
    const destino = tarjeta?.dataset.reorderId
    if (!destino || destino === arrastrandoId || destino === ultimoDestino.current) return
    ultimoDestino.current = destino
    medir()
    onMover(arrastrandoId, destino)
  }

  const soltar = () => {
    olvidarEspera()
    const el = elementoArrastrado.current
    if (el) {
      // Aterrizaje: la tarjeta vuelve desde donde quedó el dedo hasta su
      // casilla nueva. Sin esta animación desaparecería de un salto y se
      // perdería la sensación de haberla dejado en su lugar.
      const transformacion = el.style.transform
      el.style.transform = ''
      if (transformacion && transformacion !== 'none') {
        el.animate(
          [{ transform: transformacion }, { transform: 'none' }],
          { duration: 260, easing: 'cubic-bezier(.32, .72, 0, 1)' },
        )
      }
    }
    elementoArrastrado.current = null
    setArrastrandoId(null)
    ultimoDestino.current = null
  }

  /** Mover con el teclado, para quien no puede arrastrar. */
  const porTeclado = (event: React.KeyboardEvent, id: string, vecinos: { anterior?: string; siguiente?: string }) => {
    if (!activo) return
    const destino = (event.key === 'ArrowLeft' || event.key === 'ArrowUp') ? vecinos.anterior
      : (event.key === 'ArrowRight' || event.key === 'ArrowDown') ? vecinos.siguiente
        : undefined
    if (!destino) return
    event.preventDefault()
    medir()
    onMover(id, destino)
  }

  return {
    contenedorRef,
    arrastrandoId,
    /** Props para el contenedor de la grilla. */
    propsContenedor: {
      ref: contenedorRef,
      onPointerMove: mover,
      onPointerUp: soltar,
      onPointerCancel: soltar,
    },
    /**
     * Props para la tarjeta entera. En iOS se agarra el icono, no un tirador
     * escondido: acá también se agarra el plato desde cualquier punto. Van
     * puestas siempre, esté encendido el modo o no, porque son las que
     * escuchan el "mantener apretado" que lo enciende.
     */
    propsElemento: (id: string) => ({
      onPointerDown: (event: ReactPointerEvent) => iniciar(event, id),
      onContextMenu: (event: React.MouseEvent) => { if (activo) event.preventDefault() },
    }),
    /** El distintivo de la esquina: pista visual y destino del teclado. */
    propsTirador: (id: string, vecinos: { anterior?: string; siguiente?: string }) => ({
      onKeyDown: (event: React.KeyboardEvent) => porTeclado(event, id, vecinos),
    }),
  }
}
