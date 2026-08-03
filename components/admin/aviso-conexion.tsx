'use client'

import { CloudOff } from 'lucide-react'
import { useEstadoSync } from '@/lib/use-sync-operativo'

/**
 * Aviso de que este dispositivo quedó aislado del resto del local.
 *
 * Aparece sólo cuando pasa de verdad, y dice explícitamente lo único que la
 * persona necesita saber: que puede seguir trabajando y que nada se pierde.
 * Un cartel de error que no responde "¿y ahora qué hago?" sólo genera que
 * alguien empiece a apretar botones al azar en pleno servicio.
 */
export default function AvisoConexion() {
  const { conectado, pendientes } = useEstadoSync()
  if (conectado) return null

  return (
    <div className="messa-sin-conexion" role="status">
      <span className="messa-sin-conexion__icono" aria-hidden="true"><CloudOff size={15} /></span>
      <p>
        <strong>Sin conexión con el local</strong>
        {pendientes > 0
          ? ` · ${pendientes} ${pendientes === 1 ? 'cambio guardado' : 'cambios guardados'} en este dispositivo`
          : ' · seguí trabajando normalmente'}
        <small>Se envía solo apenas vuelva internet. No se pierde nada.</small>
      </p>
    </div>
  )
}
