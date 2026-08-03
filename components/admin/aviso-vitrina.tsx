'use client'

import { Eye } from 'lucide-react'
import { useStore } from '@/lib/store'

/**
 * Cartel del modo demostración.
 *
 * Tiene que estar siempre visible y decir las dos cosas que el visitante
 * necesita saber: que puede tocar todo, y que no va a romper nada. Sin esto,
 * la mitad de la gente no se anima a apretar un botón y la otra mitad cree
 * que le está cambiando el precio a un restaurante de verdad.
 */
export default function AvisoVitrina() {
  const rol = useStore(estado => estado.sesionAdmin?.rol)
  if (rol !== 'vitrina') return null

  return (
    <div className="messa-vitrina" role="status">
      <span className="messa-vitrina__icono" aria-hidden="true"><Eye size={15} /></span>
      <p>
        <strong>Modo demostración</strong>
        <small>Tocá lo que quieras: los cambios quedan sólo en tu pantalla y no afectan a ningún restaurante.</small>
      </p>
    </div>
  )
}
