'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import type { Mesa } from '@/types'
import { urlDeMesa } from '@/lib/mesa-codigo'
import { appOrigin, withBasePath } from '@/lib/base-path'
import { codigoDeVistaPrevia, MODO_VISTA_PREVIA } from '@/lib/mesa-codigo-preview'
import { useStore } from '@/lib/store'

/**
 * Pide al servidor los códigos de las mesas y dibuja el PNG de cada QR.
 *
 * Estaba escrito dentro de la página de "Mesas y QR". Al unificar el salón en
 * un solo panel hacía falta en dos lugares, así que vive acá.
 *
 * Los códigos NO se generan en el navegador: se derivan en el servidor a
 * partir del id de la mesa y su versión, con una clave que el cliente no
 * conoce. Si se generaran acá, el teléfono del comensal inventaría códigos
 * distintos a los del dueño y el QR impreso no abriría nada. La imagen del QR
 * sí se dibuja localmente, sin pasar por ningún servicio externo.
 */
export function useCodigosQr(mesas: Mesa[]) {
  const aplicarCodigosDelServidor = useStore(state => state.aplicarCodigosDelServidor)
  const [qrPorMesa, setQrPorMesa] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  // Una firma de texto en vez del array evita relanzar el efecto en cada render
  // por una referencia nueva con el mismo contenido.
  const firma = mesas.map(mesa => `${mesa.id}:${mesa.codigo_version || 0}`).join('|')

  useEffect(() => {
    if (!firma) return
    let vigente = true

    const pedidas = firma.split('|').map(entrada => {
      const [id, version] = entrada.split(':')
      return { id, version: Number(version) || 0 }
    })

    const dibujar = async (codigos: Record<string, string>) => {
      const origen = appOrigin()
      const entradas = await Promise.all(Object.entries(codigos).map(async ([mesaId, codigo]) => {
        const dataUrl = await QRCode.toDataURL(urlDeMesa(origen, codigo, MODO_VISTA_PREVIA ? mesaId : undefined), {
          errorCorrectionLevel: 'H',
          margin: 1,
          width: 512,
          color: { dark: '#171612ff', light: '#ffffffff' },
        })
        return [mesaId, dataUrl] as const
      }))
      if (vigente) setQrPorMesa(Object.fromEntries(entradas))
    }

    // En la vista previa estática no hay servidor: se calculan en el navegador
    // con una semilla pública, sólo para poder ver la pantalla.
    if (MODO_VISTA_PREVIA) {
      const codigos = Object.fromEntries(pedidas.map(mesa => [mesa.id, codigoDeVistaPrevia(mesa.id, mesa.version)]))
      aplicarCodigosDelServidor(codigos)
      void dibujar(codigos)
      return () => { vigente = false }
    }

    void (async () => {
      try {
        const respuesta = await fetch(withBasePath('/api/mesa/codigos'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mesas: pedidas }),
        })
        const datos = await respuesta.json() as { ok?: boolean; codigos?: Record<string, string>; error?: string }
        if (!vigente) return
        if (!datos.ok || !datos.codigos) {
          setError(datos.error || 'No se pudieron obtener los códigos del servidor.')
          return
        }
        setError('')
        aplicarCodigosDelServidor(datos.codigos)
        await dibujar(datos.codigos)
      } catch {
        if (vigente) setError('No se pudo contactar al servidor para generar los códigos.')
      }
    })()

    return () => { vigente = false }
  }, [aplicarCodigosDelServidor, firma])

  return { qrPorMesa, error }
}
