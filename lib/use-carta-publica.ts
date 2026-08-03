'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import { withBasePath } from '@/lib/base-path'
import { MODO_VISTA_PREVIA } from '@/lib/mesa-codigo-preview'

/**
 * Trae la carta que publicó el dueño desde el panel.
 *
 * Sin esto, cada navegador se quedaba con el catálogo que trae la aplicación
 * de fábrica: el dueño cambiaba un precio o marcaba un plato como agotado y la
 * gente en la mesa seguía viendo lo viejo.
 *
 * Es sólo de lectura y sólo una vez al abrir: una carta no cambia cada cuatro
 * segundos, y un sondeo constante en el teléfono de cada comensal sería gastar
 * batería para nada. Si el servidor no responde, se usa la copia local — que
 * es lo que pasaba siempre hasta ahora.
 */
export function useCartaPublica() {
  const aplicarPaqueteRemoto = useStore(state => state.aplicarPaqueteRemoto)
  const sucursalActualId = useStore(state => state.sucursalActualId)
  const organizacionActualId = useStore(state => state.organizacionActualId)

  useEffect(() => {
    if (MODO_VISTA_PREVIA || !sucursalActualId) return
    let vigente = true

    void (async () => {
      try {
        const respuesta = await fetch(withBasePath(`/api/carta?sucursal=${encodeURIComponent(sucursalActualId)}&org=${encodeURIComponent(organizacionActualId)}`), { cache: 'no-store' })
        if (!respuesta.ok || !vigente) return
        const datos = await respuesta.json() as { ok?: boolean; carta?: Record<string, unknown> | null }
        if (!vigente || !datos.ok || !datos.carta) return
        aplicarPaqueteRemoto('carta', datos.carta)
      } catch {
        // Sin red: queda la carta local. No hay nada que avisarle al comensal.
      }
    })()

    return () => { vigente = false }
  }, [aplicarPaqueteRemoto, organizacionActualId, sucursalActualId])
}
