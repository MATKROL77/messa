'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'

/**
 * Deja anotado en la bitácora cualquier error que rompa la aplicación.
 *
 * Sin esto, el dueño se entera de que algo falla porque un cliente lo llama.
 * Con esto, la falla queda registrada con la hora y la pantalla donde ocurrió,
 * y cruza a los demás dispositivos como cualquier otro dato: se puede mirar
 * desde otro lugar sin pedirle a nadie que abra la consola del navegador.
 *
 * No se manda nada a ningún servicio de terceros. El registro es del
 * restaurante y se queda en su base.
 */
export default function CapturaErrores() {
  const registrarEnBitacora = useStore(estado => estado.registrarEnBitacora)

  useEffect(() => {
    // Un mismo error suele repetirse en bucle —un render que falla se reintenta—
    // y no tiene sentido llenar la bitácora con cien copias del mismo renglón.
    const yaVistos = new Set<string>()

    const anotar = (mensaje: string, origen: string) => {
      const limpio = mensaje.slice(0, 200)
      const clave = `${limpio}@${origen}`
      if (yaVistos.has(clave)) return
      yaVistos.add(clave)
      registrarEnBitacora({
        area: 'sistema',
        nivel: 'alerta',
        accion: 'Falló algo en la aplicación',
        detalle: `${limpio} · en ${origen}`,
      })
    }

    const alRomperse = (evento: ErrorEvent) => {
      anotar(evento.message || 'Error desconocido', evento.filename ? new URL(evento.filename, location.href).pathname : location.pathname)
    }
    // Una promesa que falla y nadie atrapa no dispara `error`: hace falta este
    // otro evento, y es de donde salen casi todos los fallos de red.
    const promesaSuelta = (evento: PromiseRejectionEvent) => {
      const razon = evento.reason
      anotar(razon instanceof Error ? razon.message : String(razon), location.pathname)
    }

    window.addEventListener('error', alRomperse)
    window.addEventListener('unhandledrejection', promesaSuelta)
    return () => {
      window.removeEventListener('error', alRomperse)
      window.removeEventListener('unhandledrejection', promesaSuelta)
    }
  }, [registrarEnBitacora])

  return null
}
