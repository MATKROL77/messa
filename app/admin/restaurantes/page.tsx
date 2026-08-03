'use client'

import { useCallback, useEffect, useState } from 'react'
import { Building2, Check, Globe, Plus, ShieldCheck, Store } from 'lucide-react'
import { useStore } from '@/lib/store'
import { withBasePath } from '@/lib/base-path'
import {
  AdminButton, AdminEmpty, AdminMetric, AdminPanel, AdminSheet, AdminStatus,
  AdminToast, AdminWorkspace,
} from '@/components/admin/admin-ui'

/**
 * El piso de arriba: acá no se administra un restaurante, se administran los
 * restaurantes. Es la pantalla del dueño de MESSA, no la de un cliente.
 */

interface Organizacion {
  id: string
  nombre: string
  slug: string
  activa: boolean
  plan: 'prueba' | 'activo' | 'suspendido'
  created_at: string
}

const PLANES: { valor: Organizacion['plan']; label: string; tono: 'green' | 'gold' | 'rose' }[] = [
  { valor: 'prueba', label: 'En prueba', tono: 'gold' },
  { valor: 'activo', label: 'Activo', tono: 'green' },
  { valor: 'suspendido', label: 'Suspendido', tono: 'rose' },
]

const NUEVO = { nombre: '', email: '', password: '', nombreDueno: '' }

export default function RestaurantesPage() {
  const { sesionAdmin } = useStore()
  const [organizaciones, setOrganizaciones] = useState<Organizacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [nuevo, setNuevo] = useState<typeof NUEVO | null>(null)
  const [guardando, setGuardando] = useState(false)

  const avisar = (mensaje: string) => {
    setToast(mensaje)
    window.setTimeout(() => setToast(''), 2800)
  }

  const traer = useCallback(async () => {
    try {
      const res = await fetch(withBasePath('/api/admin/organizaciones'))
      const datos = await res.json() as { ok?: boolean; organizaciones?: Organizacion[]; error?: string }
      if (!res.ok || !datos.ok) { setError(datos.error || 'No se pudo cargar.'); return }
      setOrganizaciones(datos.organizaciones || [])
      setError('')
    } catch {
      setError('No pudimos conectarnos con el servidor.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void (async () => { await traer() })()
  }, [traer])

  const crear = async () => {
    if (!nuevo) return
    setGuardando(true)
    try {
      const res = await fetch(withBasePath('/api/admin/organizaciones'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevo),
      })
      const datos = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok || !datos.ok) { avisar(datos.error || 'No se pudo crear.'); return }
      setNuevo(null)
      avisar('Restaurante creado')
      traer()
    } finally {
      setGuardando(false)
    }
  }

  const cambiarPlan = async (organizacion: Organizacion, plan: Organizacion['plan']) => {
    const res = await fetch(withBasePath('/api/admin/organizaciones'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: organizacion.id, plan, activa: plan !== 'suspendido' }),
    })
    const datos = await res.json() as { ok?: boolean; error?: string }
    if (!res.ok || !datos.ok) { avisar(datos.error || 'No se pudo guardar.'); return }
    avisar(plan === 'suspendido' ? `${organizacion.nombre} quedó suspendido` : `${organizacion.nombre}: ${plan}`)
    traer()
  }

  if (sesionAdmin && sesionAdmin.rol !== 'creator') {
    return (
      <div className="admin-access-state">
        <ShieldCheck size={38} />
        <h2>Sólo para MESSA</h2>
        <p>Esta pantalla administra los restaurantes que usan la plataforma, no tu restaurante.</p>
      </div>
    )
  }

  const activos = organizaciones.filter(o => o.plan === 'activo').length
  const enPrueba = organizaciones.filter(o => o.plan === 'prueba').length

  return (
    <AdminWorkspace
      eyebrow="Plataforma"
      title="Restaurantes"
      description="Cada restaurante es un mundo aparte: su carta, su equipo, sus mesas y su caja. Ninguno ve nada del otro."
      actions={<AdminButton tone="primary" icon={Plus} onClick={() => setNuevo({ ...NUEVO })}>Nuevo restaurante</AdminButton>}
    >
      <AdminToast>{toast}</AdminToast>

      <div className="messa-metrics">
        <AdminMetric label="Restaurantes" value={`${organizaciones.length}`} detail="En la plataforma" Icon={Building2} tone="gold" progress={100} />
        <AdminMetric label="Activos" value={`${activos}`} detail="Pagando" Icon={Check} tone="green" progress={100} />
        <AdminMetric label="En prueba" value={`${enPrueba}`} detail={enPrueba ? 'Seguimiento pendiente' : 'Ninguno'} Icon={Store} tone={enPrueba ? 'amber' : 'blue'} progress={100} />
        <AdminMetric label="Sucursales" value="Por restaurante" detail="Se cargan desde cada panel" Icon={Globe} tone="blue" progress={100} />
      </div>

      <AdminPanel eyebrow="Cartera" title="Todos los restaurantes" detail="Suspender corta el acceso sin borrar un solo dato.">
        {error && <p className="messa-aviso-error">{error}</p>}
        {cargando ? <p className="messa-cargando">Cargando…</p> : organizaciones.length ? (
          <ul className="messa-org-lista">
            {organizaciones.map(organizacion => {
              const plan = PLANES.find(p => p.valor === organizacion.plan)
              return (
                <li key={organizacion.id} className="messa-org">
                  <div className="messa-org__quien">
                    <span className="messa-org__inicial" aria-hidden="true">{organizacion.nombre.slice(0, 1).toUpperCase()}</span>
                    <div>
                      <p className="messa-org__nombre">{organizacion.nombre}<AdminStatus tone={plan?.tono || 'neutral'}>{plan?.label}</AdminStatus></p>
                      <p className="messa-org__slug">/{organizacion.slug}</p>
                    </div>
                  </div>
                  <div className="messa-org__acciones">
                    {PLANES.map(opcion => (
                      <button
                        key={opcion.valor}
                        type="button"
                        className={`messa-org__plan${organizacion.plan === opcion.valor ? ' is-actual' : ''}`}
                        onClick={() => cambiarPlan(organizacion, opcion.valor)}
                        disabled={organizacion.plan === opcion.valor}
                      >
                        {opcion.label}
                      </button>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <AdminEmpty
            Icon={Building2}
            title="Todavía no hay restaurantes"
            description="Creá el primero y quedará con su dueño adentro, listo para entrar."
            action={<AdminButton tone="primary" icon={Plus} onClick={() => setNuevo({ ...NUEVO })}>Nuevo restaurante</AdminButton>}
          />
        )}
      </AdminPanel>

      <AdminSheet
        open={Boolean(nuevo)}
        onClose={() => setNuevo(null)}
        eyebrow="Alta"
        title="Nuevo restaurante"
        footer={(
          <>
            <AdminButton tone="quiet" onClick={() => setNuevo(null)}>Cancelar</AdminButton>
            <AdminButton tone="primary" icon={Check} onClick={crear} disabled={guardando}>
              {guardando ? 'Creando…' : 'Crear restaurante'}
            </AdminButton>
          </>
        )}
      >
        {nuevo && (
          <div className="messa-form-grid">
            <label>
              <span>Nombre del restaurante</span>
              <input className="input-premium" value={nuevo.nombre} placeholder="Bonafide" onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })} />
              {nuevo.nombre.trim().length > 1 && (
                <small className="messa-form-hint">Su carta va a vivir en <b>/{nuevo.nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}</b></small>
              )}
            </label>
            <label>
              <span>Nombre del dueño</span>
              <input className="input-premium" value={nuevo.nombreDueno} placeholder="Quién lo va a usar" onChange={e => setNuevo({ ...nuevo, nombreDueno: e.target.value })} />
            </label>
            <label>
              <span>Email del dueño</span>
              <input className="input-premium" type="email" value={nuevo.email} placeholder="dueno@restaurante.com" onChange={e => setNuevo({ ...nuevo, email: e.target.value })} />
            </label>
            <label>
              <span>Contraseña inicial</span>
              <input className="input-premium" type="text" value={nuevo.password} placeholder="Mínimo 8 caracteres" onChange={e => setNuevo({ ...nuevo, password: e.target.value })} />
              <small className="messa-form-hint">Se la pasás al dueño y la cambia él. Acá se guarda cifrada, no en texto.</small>
            </label>
          </div>
        )}
      </AdminSheet>
    </AdminWorkspace>
  )
}
