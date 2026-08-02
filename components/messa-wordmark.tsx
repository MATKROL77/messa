import type { HTMLAttributes } from 'react'

/**
 * Marca MESSA.
 *
 * La barra dorada tiene que cruzar la SEGUNDA S, no un punto cualquiera de la
 * palabra. Antes era un pseudo-elemento colocado con porcentajes sobre todo el
 * texto: al cambiar el tamaño de fuente o el espaciado entre letras se corría
 * y terminaba cayendo entre las dos eses. Ahora esa letra es su propio
 * elemento y la barra cuelga de ella, así queda clavada en cualquier tamaño.
 */
export default function MessaWordmark({ className = '', ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={`messa-wordmark ${className}`} aria-label="MESSA" {...props}>
      <span aria-hidden="true">MES</span>
      <span aria-hidden="true" className="messa-wordmark__s">S</span>
      <span aria-hidden="true">A</span>
    </span>
  )
}
