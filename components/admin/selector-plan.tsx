'use client'

import { useStore } from '@/lib/store'
import { ETIQUETA_NIVEL, NIVELES } from '@/lib/planes'

/**
 * Los tres niveles de MESSA, para mostrarlos uno al lado del otro.
 *
 * Es una herramienta de venta, no de operación: deja enseñar en la misma
 * pantalla qué incluye cada precio, sin cambiar de cuenta ni de instalación.
 * Por eso sólo lo ven el dueño de MESSA y la demostración del portfolio; un
 * restaurante no tiene por qué poder darse de alta solo el plan caro.
 */
export default function SelectorPlan() {
  const rol = useStore(estado => estado.sesionAdmin?.rol)
  const nivelPlan = useStore(estado => estado.nivelPlan)
  const setNivelPlan = useStore(estado => estado.setNivelPlan)

  if (rol !== 'vitrina' && rol !== 'creator') return null

  return (
    <div className="messa-planes" role="group" aria-label="Nivel de MESSA">
      <p className="messa-planes__titulo">
        <span>Mostrando el plan</span>
        <strong>{ETIQUETA_NIVEL[nivelPlan].nombre}</strong>
      </p>
      <div className="messa-planes__botones">
        {NIVELES.map(nivel => (
          <button
            key={nivel}
            type="button"
            className={`messa-planes__boton${nivel === nivelPlan ? ' is-actual' : ''}`}
            aria-pressed={nivel === nivelPlan}
            onClick={() => setNivelPlan(nivel)}
          >
            {ETIQUETA_NIVEL[nivel].corto}
          </button>
        ))}
      </div>
      <p className="messa-planes__resumen">{ETIQUETA_NIVEL[nivelPlan].resumen}</p>
    </div>
  )
}
