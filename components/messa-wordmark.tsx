import type { HTMLAttributes } from 'react'

/**
 * Marca MESSA — el archivo original del diseñador, no una reconstrucción.
 *
 * Antes esto era texto con una barra dorada dibujada por CSS sobre la segunda
 * S. Se veía parecido, pero era una imitación: dependía de que el navegador
 * tuviera la tipografía justa, y la barra se corría al cambiar el tamaño.
 * Ahora se sirve el PNG de la marca, idéntico en todos lados.
 *
 * Van las dos variantes en el HTML y decide el CSS cuál se ve. Elegirla en
 * JavaScript según el tema haría que en la primera pintura apareciera la
 * equivocada y parpadeara al corregirse.
 */
export default function MessaWordmark({ className = '', ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={`messa-wordmark ${className}`} role="img" aria-label="MESSA" {...props}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="messa-wordmark__img messa-wordmark__img--oscura" src="/marca/messa-wordmark.png" alt="" aria-hidden="true" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="messa-wordmark__img messa-wordmark__img--clara" src="/marca/messa-wordmark-claro.png" alt="" aria-hidden="true" />
    </span>
  )
}
