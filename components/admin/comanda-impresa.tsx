'use client'

import type { Pedido } from '@/types'

/**
 * La comanda en papel.
 *
 * Casi ninguna cocina real trabaja sólo con pantalla: el ticket se cuelga
 * sobre la plancha y se tacha a mano. Se imprime con la impresora térmica que
 * ya tenga el local a través del diálogo del navegador, sin drivers ni
 * integraciones: cualquier impresora que Windows, macOS o iOS vean sirve.
 *
 * En pantalla no se ve nunca. Sólo existe al imprimir, y ahí es lo único que
 * queda en la hoja (ver `@media print` en globals.css).
 *
 * El ancho está pensado para rollo de 80 mm, que es el estándar de gastronomía.
 * Todo va en negro sobre blanco y con cuerpo grande: el papel térmico se
 * despinta con el calor y la cocina se lee de reojo, con las manos ocupadas.
 */
export default function ComandaImpresa({ pedido, restaurante }: { pedido: Pedido; restaurante: string }) {
  const hora = new Date(pedido.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  const fecha = new Date(pedido.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <div className="comanda-impresa" aria-hidden="true">
      <p className="comanda-impresa__local">{restaurante}</p>
      <p className="comanda-impresa__mesa">MESA {pedido.mesa_numero}</p>
      <p className="comanda-impresa__meta">
        #{pedido.id.slice(-5).toUpperCase()} · {fecha} {hora}
        {pedido.origen && pedido.origen !== 'mesa' ? ` · ${pedido.origen}` : ''}
      </p>

      <hr />

      <ul className="comanda-impresa__items">
        {pedido.items.map(item => {
          const opciones = item.plato.modificadores
            .flatMap(modificador => modificador.opciones)
            .filter(opcion => item.modificadores_elegidos.includes(opcion.id))
            .map(opcion => opcion.nombre)
          const removidos = item.plato.ingredientes
            .filter(ingrediente => item.ingredientes_removidos.includes(ingrediente.id))
            .map(ingrediente => ingrediente.nombre)
          return (
            <li key={item.id}>
              <p className="comanda-impresa__plato">
                <span>{item.cantidad}x</span>
                {item.plato.nombre}
              </p>
              {opciones.length > 0 && <p className="comanda-impresa__nota">{opciones.join(' · ')}</p>}
              {/* Lo que hay que sacar va destacado: es el error que vuelve el plato. */}
              {removidos.length > 0 && <p className="comanda-impresa__quitar">SIN {removidos.join(', ').toUpperCase()}</p>}
              {item.plato.notas_cocina && <p className="comanda-impresa__nota">{item.plato.notas_cocina}</p>}
              {item.notas && <p className="comanda-impresa__quitar">{item.notas.toUpperCase()}</p>}
            </li>
          )
        })}
      </ul>

      <hr />

      <p className="comanda-impresa__pie">
        {pedido.items.reduce((total, item) => total + item.cantidad, 0)} ítems
      </p>
    </div>
  )
}
