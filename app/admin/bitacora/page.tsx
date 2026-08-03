'use client'

import { useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, Archive, ClipboardList, Download, FileWarning, HardDriveDownload,
  ListFilter, ScrollText, ShieldAlert, Upload,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import type { EventoBitacora } from '@/types'
import { armarRespaldo, leerRespaldo, nombreDeArchivoRespaldo, type Respaldo } from '@/lib/respaldo'
import {
  AdminButton, AdminEmpty, AdminMetric, AdminPanel, AdminSegmented, AdminSheet,
  AdminStatus, AdminToast, AdminWorkspace,
} from '@/components/admin/admin-ui'

type Vista = 'actividad' | 'alertas' | 'respaldo'

const AREAS: Record<EventoBitacora['area'], string> = {
  carta: 'Carta',
  salon: 'Salón',
  pedidos: 'Pedidos',
  caja: 'Caja',
  inventario: 'Inventario',
  reservas: 'Reservas',
  equipo: 'Equipo',
  sistema: 'Sistema',
}

const TONO: Record<EventoBitacora['nivel'], 'neutral' | 'amber' | 'rose'> = {
  normal: 'neutral',
  aviso: 'amber',
  alerta: 'rose',
}

/** "hace 4 min", "ayer 21:30" — lo que uno lee de un vistazo. */
function cuando(iso: string): string {
  const fecha = new Date(iso)
  const minutos = Math.round((Date.now() - fecha.getTime()) / 60000)
  if (minutos < 1) return 'recién'
  if (minutos < 60) return `hace ${minutos} min`
  const hora = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  const hoy = new Date().toDateString()
  if (fecha.toDateString() === hoy) return hora
  const ayer = new Date(Date.now() - 86400000).toDateString()
  if (fecha.toDateString() === ayer) return `ayer ${hora}`
  return `${fecha.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })} ${hora}`
}

export default function BitacoraPage() {
  const estado = useStore()
  const { bitacora, sucursalActualId, registrarEnBitacora, restaurarRespaldo } = estado

  const [vista, setVista] = useState<Vista>('actividad')
  const [area, setArea] = useState<'todas' | EventoBitacora['area']>('todas')
  const [toast, setToast] = useState('')
  const [porRestaurar, setPorRestaurar] = useState<Respaldo | null>(null)
  const archivoRef = useRef<HTMLInputElement>(null)

  const avisar = (mensaje: string) => {
    setToast(mensaje)
    window.setTimeout(() => setToast(''), 2600)
  }

  const deLaSucursal = useMemo(
    () => bitacora.filter(e => e.sucursal_id === sucursalActualId),
    [bitacora, sucursalActualId],
  )
  const alertas = useMemo(() => deLaSucursal.filter(e => e.nivel !== 'normal'), [deLaSucursal])

  const listados = useMemo(() => {
    const base = vista === 'alertas' ? alertas : deLaSucursal
    return area === 'todas' ? base : base.filter(e => e.area === area)
  }, [alertas, area, deLaSucursal, vista])

  const areasPresentes = useMemo(() => {
    const usadas = new Set(deLaSucursal.map(e => e.area))
    return (Object.keys(AREAS) as EventoBitacora['area'][]).filter(a => usadas.has(a))
  }, [deLaSucursal])

  const hoy = deLaSucursal.filter(e => e.created_at.startsWith(new Date().toISOString().split('T')[0])).length

  // ── Respaldo ──
  const descargar = () => {
    const respaldo = armarRespaldo(estado)
    const blob = new Blob([JSON.stringify(respaldo, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = nombreDeArchivoRespaldo()
    enlace.click()
    URL.revokeObjectURL(url)
    registrarEnBitacora({ area: 'sistema', accion: 'Descargó una copia de seguridad', detalle: nombreDeArchivoRespaldo() })
    avisar('Copia descargada')
  }

  const elegirArchivo = async (archivo: File | undefined) => {
    if (!archivo) return
    try {
      const respaldo = leerRespaldo(await archivo.text())
      setPorRestaurar(respaldo)
    } catch (error) {
      avisar(error instanceof Error ? error.message : 'El archivo no es una copia válida')
    }
    if (archivoRef.current) archivoRef.current.value = ''
  }

  const confirmarRestauracion = () => {
    if (!porRestaurar) return
    restaurarRespaldo(porRestaurar)
    setPorRestaurar(null)
    avisar('Copia restaurada')
  }

  return (
    <AdminWorkspace
      eyebrow="Control"
      title="Bitácora"
      description="Todo lo que se toca queda anotado: quién, qué y cuándo. Acá también se guarda y se recupera una copia completa del restaurante."
      actions={(
        <>
          <AdminButton tone="neutral" icon={Upload} onClick={() => archivoRef.current?.click()}>Restaurar copia</AdminButton>
          <AdminButton tone="primary" icon={Download} onClick={descargar}>Descargar copia</AdminButton>
        </>
      )}
    >
      <AdminToast>{toast}</AdminToast>
      <input
        ref={archivoRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={event => elegirArchivo(event.target.files?.[0])}
      />

      <div className="messa-metrics">
        <AdminMetric label="Movimientos hoy" value={`${hoy}`} detail="En esta sucursal" Icon={ClipboardList} tone="gold" progress={100} />
        <AdminMetric label="Para revisar" value={`${alertas.length}`} detail={alertas.length ? 'Anulaciones, precios y borrados' : 'Nada llamativo'} Icon={ShieldAlert} tone={alertas.length ? 'amber' : 'green'} progress={100} />
        <AdminMetric label="Registro total" value={`${deLaSucursal.length}`} detail="Últimos movimientos guardados" Icon={ScrollText} tone="blue" progress={100} />
        <AdminMetric label="Copia de seguridad" value="Manual" detail="Descargala al cerrar el turno" Icon={Archive} tone="blue" progress={100} />
      </div>

      <AdminPanel className="messa-catalog-panel">
        <div className="messa-catalog-toolbar">
          <AdminSegmented<Vista>
            value={vista}
            onChange={setVista}
            label="Qué mirar"
            items={[
              { value: 'actividad', label: 'Actividad', count: deLaSucursal.length },
              { value: 'alertas', label: 'Para revisar', count: alertas.length },
              { value: 'respaldo', label: 'Respaldo' },
            ]}
          />
          {vista !== 'respaldo' && areasPresentes.length > 1 && (
            <AdminSegmented<'todas' | EventoBitacora['area']>
              value={area}
              onChange={setArea}
              label="Filtrar por área"
              items={[
                { value: 'todas' as const, label: 'Todo' },
                ...areasPresentes.map(a => ({ value: a, label: AREAS[a] })),
              ]}
            />
          )}
        </div>

        {vista === 'respaldo' ? (
          <div className="messa-respaldo">
            <article className="messa-respaldo__card">
              <span className="messa-respaldo__icon"><HardDriveDownload size={20} aria-hidden="true" /></span>
              <h2>Guardar una copia</h2>
              <p>
                Se descarga un archivo con la carta, el inventario, las reservas, las finanzas,
                el plano del salón y la configuración. Guardalo fuera de la computadora del local
                —en el mail o en el teléfono— así sirve incluso si se rompe el equipo.
              </p>
              <AdminButton tone="primary" icon={Download} onClick={descargar}>Descargar copia</AdminButton>
            </article>

            <article className="messa-respaldo__card">
              <span className="messa-respaldo__icon messa-respaldo__icon--aviso"><FileWarning size={20} aria-hidden="true" /></span>
              <h2>Volver a una copia</h2>
              <p>
                Reemplaza la carta, el inventario, las reservas, las finanzas y la configuración
                por las del archivo. Los pedidos y las mesas del turno en curso no se tocan, para
                no romper un servicio que está andando.
              </p>
              <AdminButton tone="neutral" icon={Upload} onClick={() => archivoRef.current?.click()}>Elegir archivo</AdminButton>
            </article>
          </div>
        ) : listados.length ? (
          <ol className="messa-bitacora">
            {listados.map(evento => (
              <li key={evento.id} className={`messa-bitacora__fila messa-bitacora__fila--${evento.nivel}`}>
                <span className="messa-bitacora__marca" aria-hidden="true">
                  {evento.nivel === 'normal' ? <ListFilter size={14} /> : <AlertTriangle size={14} />}
                </span>
                <div className="messa-bitacora__cuerpo">
                  <p className="messa-bitacora__accion">
                    {evento.accion}
                    <AdminStatus tone={TONO[evento.nivel]}>{AREAS[evento.area]}</AdminStatus>
                  </p>
                  <p className="messa-bitacora__detalle">{evento.detalle}</p>
                  <p className="messa-bitacora__firma">
                    {evento.actor_nombre}
                    <span aria-hidden="true">·</span>
                    {evento.actor_rol}
                  </p>
                </div>
                <time className="messa-bitacora__hora" dateTime={evento.created_at}>{cuando(evento.created_at)}</time>
              </li>
            ))}
          </ol>
        ) : (
          <AdminEmpty
            Icon={ScrollText}
            title={vista === 'alertas' ? 'Nada para revisar' : 'Todavía no hay movimientos'}
            description={vista === 'alertas'
              ? 'Acá aparecen las anulaciones de pedidos, los cambios de precio y los borrados.'
              : 'Apenas alguien toque un precio, anule un pedido o cierre la caja, va a quedar anotado acá.'}
          />
        )}
      </AdminPanel>

      <AdminSheet
        open={Boolean(porRestaurar)}
        onClose={() => setPorRestaurar(null)}
        eyebrow="Confirmar"
        title="Volver a esta copia"
        footer={(
          <>
            <AdminButton tone="quiet" onClick={() => setPorRestaurar(null)}>Cancelar</AdminButton>
            <AdminButton tone="danger" icon={Upload} onClick={confirmarRestauracion}>Restaurar</AdminButton>
          </>
        )}
      >
        {porRestaurar && (
          <div className="messa-respaldo__resumen">
            <p>Vas a reemplazar los datos actuales por los de esta copia:</p>
            <ul>
              <li><strong>{porRestaurar.datos.platos?.length ?? 0}</strong> platos</li>
              <li><strong>{porRestaurar.datos.insumos?.length ?? 0}</strong> insumos</li>
              <li><strong>{porRestaurar.datos.reservas?.length ?? 0}</strong> reservas</li>
              <li><strong>{porRestaurar.datos.gastos?.length ?? 0}</strong> gastos</li>
              <li><strong>{porRestaurar.datos.cierres?.length ?? 0}</strong> cierres de caja</li>
            </ul>
            <p className="messa-respaldo__fecha">
              Copia hecha el {new Date(porRestaurar.creado_en).toLocaleString('es-AR')}
              {porRestaurar.restaurante ? ` · ${porRestaurar.restaurante}` : ''}
            </p>
            <p className="messa-respaldo__aviso">
              Lo que haya ahora y no esté en la copia se pierde. Descargá una copia del estado
              actual antes, si tenés dudas.
            </p>
          </div>
        )}
      </AdminSheet>
    </AdminWorkspace>
  )
}
