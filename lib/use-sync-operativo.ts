'use client'

import { useEffect, useRef } from 'react'
import { useStore } from '@/lib/store'
import { withBasePath } from '@/lib/base-path'
import { MODO_VISTA_PREVIA } from '@/lib/mesa-codigo-preview'
import { accesoRecordado } from '@/lib/acceso-mesa'

/**
 * Mantiene mesas, pedidos y llamados iguales en todos los dispositivos.
 *
 * Sin esto, un pedido hecho desde el celular del comensal no llegaba nunca a
 * la pantalla de la cocina: cada navegador guardaba su propia copia y no había
 * ningún punto en común.
 *
 * Funciona por sondeo, no por websocket, a propósito: el runtime de Cloudflare
 * Workers no mantiene conexiones abiertas por sesión, y un ciclo de 4 segundos
 * es indistinguible de "instantáneo" para un salón. Además sobrevive a que el
 * celular se bloquee y vuelva, sin reconexiones que manejar.
 *
 * Si el servidor no responde —sin internet, sin base, vista previa estática—
 * no pasa nada: la app sigue funcionando exactamente como antes, contra el
 * almacenamiento local. La sincronización es una mejora, no un requisito.
 */

const INTERVALO_MS = 4000

type TipoEntidad = 'mesa' | 'pedido' | 'llamado' | 'elemento'
interface Entidad { id: string; tipo: TipoEntidad; payload: unknown; updated_at: string }

/** Marca de tiempo comparable de cada entidad. */
function selloDe(item: { updated_at?: string; created_at?: string }): string {
  return item.updated_at || item.created_at || new Date(0).toISOString()
}

export function useSyncOperativo(opciones: { mesaId?: string } = {}) {
  const { mesaId } = opciones
  // Se leen del store por referencia para no re-crear el ciclo en cada cambio:
  // el intervalo tiene que ser uno solo mientras la pantalla esté abierta.
  const enviadas = useRef<Map<string, string>>(new Map())
  const desde = useRef<string>('1970-01-01T00:00:00Z')
  const enVuelo = useRef(false)

  useEffect(() => {
    // En la vista previa estática no hay servidor al que sincronizar.
    if (MODO_VISTA_PREVIA) return
    let vivo = true

    const ciclo = async () => {
      if (!vivo || enVuelo.current) return
      enVuelo.current = true
      try {
        const estado = useStore.getState()
        const sucursalId = estado.sucursalActualId
        if (!sucursalId) return

        // Sólo se manda lo que cambió desde el último envío. Mandar todo en
        // cada ciclo funcionaría, pero haría que dos dispositivos se pisaran
        // reescribiendo lo mismo una y otra vez.
        const candidatas: Entidad[] = []
        const agregar = (tipo: TipoEntidad, id: string, payload: { updated_at?: string; created_at?: string }) => {
          const sello = selloDe(payload)
          const clave = `${tipo}:${id}`
          if (enviadas.current.get(clave) === sello) return
          candidatas.push({ id, tipo, payload, updated_at: sello })
        }

        estado.mesas.filter(m => m.sucursal_id === sucursalId).forEach(m => agregar('mesa', m.id, m))
        estado.pedidos.filter(p => p.sucursal_id === sucursalId).forEach(p => agregar('pedido', p.id, p))
        estado.llamadosMozo.forEach(l => agregar('llamado', l.id, l))
        // El plano del salón también viaja: si el dueño lo acomoda en la
        // computadora, la tablet del mozo tiene que ver el mismo salón.
        estado.elementosPlano.filter(e => e.sucursal_id === sucursalId).forEach(e => agregar('elemento', e.id, e))

        const respuesta = await fetch(withBasePath('/api/sync'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sucursalId,
            desde: desde.current,
            entidades: candidatas,
            // Credencial del comensal cuando no hay sesión de equipo.
            ...(mesaId ? { mesaId, codigo: accesoRecordado(mesaId) || '' } : {}),
          }),
        })
        if (!respuesta.ok) return
        const datos = await respuesta.json() as { ok?: boolean; cambios?: Entidad[]; ahora?: string }
        if (!datos.ok || !vivo) return

        candidatas.forEach(e => enviadas.current.set(`${e.tipo}:${e.id}`, e.updated_at))
        if (datos.ahora) desde.current = datos.ahora
        if (datos.cambios?.length) {
          useStore.getState().aplicarEstadoRemoto(datos.cambios)
          // Lo que acaba de llegar ya está sincronizado: anotarlo evita
          // devolvérselo al servidor en el ciclo siguiente.
          datos.cambios.forEach(e => enviadas.current.set(`${e.tipo}:${e.id}`, e.updated_at))
        }
      } catch {
        // Sin red o sin base: se reintenta en el próximo ciclo. La app sigue
        // andando con el estado local.
      } finally {
        enVuelo.current = false
      }
    }

    void ciclo()
    const temporizador = window.setInterval(ciclo, INTERVALO_MS)
    // Al volver de segundo plano conviene sincronizar en el acto: el mozo
    // desbloquea el teléfono y espera ver el salón al día, no dentro de 4s.
    const alVolver = () => { if (document.visibilityState === 'visible') void ciclo() }
    document.addEventListener('visibilitychange', alVolver)

    return () => {
      vivo = false
      window.clearInterval(temporizador)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [mesaId])
}
