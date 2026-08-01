'use client'

import { useCallback, useEffect, useState } from 'react'
import { BriefcaseBusiness, Check, Crown, KeyRound, LockKeyhole, Plus, Save, ShieldCheck, Trash2, UserCog, UserPlus, UsersRound } from 'lucide-react'
import { useStore, type PermisoAdmin } from '@/lib/store'
import type { RolUsuario } from '@/types'
import { withBasePath } from '@/lib/base-path'
import { AdminButton, AdminEmpty, AdminMetric, AdminPanel, AdminSheet, AdminStatus, AdminToast, AdminWorkspace } from '@/components/admin/admin-ui'

interface UsuarioEquipo {
  email: string
  nombre: string
  rol: RolUsuario
  activo: boolean
  created_at: string
  ultimo_acceso: string | null
}

type RespuestaEquipo = { ok?: boolean; usuarios?: UsuarioEquipo[]; error?: string }

const MODULOS: { permiso: PermisoAdmin; label: string; grupo: string }[] = [
  { permiso: 'resumen', label: 'Resumen', grupo: 'Operación' },
  { permiso: 'carta', label: 'Carta', grupo: 'Operación' },
  { permiso: 'salon', label: 'Salón', grupo: 'Operación' },
  { permiso: 'pedidos', label: 'Pedidos', grupo: 'Operación' },
  { permiso: 'inventario', label: 'Inventario', grupo: 'Operación' },
  { permiso: 'reservas', label: 'Reservas', grupo: 'Operación' },
  { permiso: 'finanzas', label: 'Finanzas', grupo: 'Gestión' },
  { permiso: 'cobros', label: 'Cobros', grupo: 'Gestión' },
  { permiso: 'caja', label: 'Caja', grupo: 'Gestión' },
  { permiso: 'delivery', label: 'Delivery', grupo: 'Gestión' },
  { permiso: 'fidelidad', label: 'Fidelidad', grupo: 'Gestión' },
  { permiso: 'sucursales', label: 'Sucursales', grupo: 'Configuración' },
  { permiso: 'usuarios', label: 'Usuarios', grupo: 'Configuración' },
  { permiso: 'identidad', label: 'Identidad', grupo: 'Configuración' },
]

const ROLES: { rol: RolUsuario; label: string; detail: string; Icon: typeof Crown; tone: 'gold' | 'blue' | 'green' | 'amber' }[] = [
  { rol: 'creator', label: 'Creador', detail: 'Control total e inmutable', Icon: Crown, tone: 'gold' },
  { rol: 'admin', label: 'Administrador', detail: 'Gestión integral del negocio', Icon: ShieldCheck, tone: 'blue' },
  { rol: 'gerente', label: 'Gerente', detail: 'Turno completo, sin configuración', Icon: BriefcaseBusiness, tone: 'blue' },
  { rol: 'editor', label: 'Editor', detail: 'Carta e inventario', Icon: UserCog, tone: 'green' },
  { rol: 'staff', label: 'Staff', detail: 'Operación de salón', Icon: UsersRound, tone: 'amber' },
]

/** 'creator' no aparece: sólo se define por variables de entorno del servidor. */
const ROLES_ASIGNABLES = ROLES.filter(item => item.rol !== 'creator')

export default function UsuariosPage() {
  const { sesionAdmin, permisosAdmin, actualizarPermisoRol } = useStore()
  const [toast, setToast] = useState('')
  const puedeEditar = sesionAdmin?.rol === 'creator' || sesionAdmin?.rol === 'admin'

  // Cuentas del equipo guardadas en la base. A diferencia de las cuentas de
  // variables de entorno, éstas se crean y se borran acá mismo, sin redeploy.
  const [equipo, setEquipo] = useState<UsuarioEquipo[]>([])
  const [estadoEquipo, setEstadoEquipo] = useState<'cargando' | 'listo' | 'sin-base'>('cargando')
  const [avisoEquipo, setAvisoEquipo] = useState('')
  const [creando, setCreando] = useState(false)
  const [nuevo, setNuevo] = useState<{ nombre: string; email: string; password: string; rol: RolUsuario }>({ nombre: '', email: '', password: '', rol: 'staff' })
  const [guardando, setGuardando] = useState(false)

  const mostrar = (mensaje: string) => {
    setToast(mensaje)
    window.setTimeout(() => setToast(''), 2600)
  }

  const cargarEquipo = useCallback(async () => {
    try {
      const res = await fetch(withBasePath('/api/admin/equipo'), { cache: 'no-store' })
      const datos = await res.json().catch(() => ({})) as RespuestaEquipo
      if (res.ok && datos.ok) {
        setEquipo(datos.usuarios || [])
        setEstadoEquipo('listo')
        setAvisoEquipo('')
        return
      }
      setEstadoEquipo('sin-base')
      setAvisoEquipo(datos.error || 'No pudimos leer las cuentas del equipo.')
    } catch {
      setEstadoEquipo('sin-base')
      setAvisoEquipo('No pudimos conectarnos con la base de datos.')
    }
  }, [])

  useEffect(() => {
    void (async () => { await cargarEquipo() })()
  }, [cargarEquipo])

  const crearCuenta = async () => {
    setGuardando(true)
    try {
      const res = await fetch(withBasePath('/api/admin/equipo'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevo),
      })
      const datos = await res.json().catch(() => ({})) as RespuestaEquipo
      if (!res.ok || !datos.ok) { mostrar(datos.error || 'No pudimos crear la cuenta'); return }
      setNuevo({ nombre: '', email: '', password: '', rol: 'staff' })
      setCreando(false)
      await cargarEquipo()
      mostrar('Cuenta creada')
    } finally {
      setGuardando(false)
    }
  }

  const cambiar = async (email: string, cambios: Partial<Pick<UsuarioEquipo, 'rol' | 'activo'>>) => {
    const res = await fetch(withBasePath('/api/admin/equipo'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, ...cambios }),
    }).catch(() => null)
    const datos = await res?.json().catch(() => ({})) as RespuestaEquipo | undefined
    if (!res?.ok || !datos?.ok) { mostrar(datos?.error || 'No pudimos guardar el cambio'); return }
    await cargarEquipo()
    mostrar('Cuenta actualizada')
  }

  const borrar = async (email: string) => {
    if (!window.confirm(`¿Borrar la cuenta de ${email}? Pierde el acceso al instante.`)) return
    const res = await fetch(withBasePath(`/api/admin/equipo?email=${encodeURIComponent(email)}`), { method: 'DELETE' }).catch(() => null)
    const datos = await res?.json().catch(() => ({})) as RespuestaEquipo | undefined
    if (!res?.ok || !datos?.ok) { mostrar(datos?.error || 'No pudimos borrar la cuenta'); return }
    await cargarEquipo()
    mostrar('Cuenta eliminada')
  }

  const toggle = (rol: RolUsuario, permiso: PermisoAdmin) => {
    if (!puedeEditar || rol === 'creator') return
    const habilitado = !permisosAdmin[rol]?.includes(permiso)
    actualizarPermisoRol(rol, permiso, habilitado)
    setToast(`${habilitado ? 'Acceso habilitado' : 'Acceso restringido'} para ${ROLES.find(item => item.rol === rol)?.label}`)
    window.setTimeout(() => setToast(''), 2200)
  }

  return (
    <AdminWorkspace
      eyebrow="Equipo y seguridad"
      title="Usuarios"
      description="Definí qué ve cada rango. La navegación y el acceso a los módulos se actualizan de inmediato."
      actions={<AdminButton tone="primary" icon={Save} disabled={!puedeEditar} onClick={() => { setToast('Matriz de permisos guardada'); window.setTimeout(() => setToast(''), 2200) }}>Guardar permisos</AdminButton>}
    >
      <AdminToast>{toast}</AdminToast>

      <div className="messa-metrics">
        {ROLES.map(item => <AdminMetric key={item.rol} label={item.label} value={`${permisosAdmin[item.rol]?.length || 0}`} detail={item.detail} Icon={item.Icon} tone={item.tone} progress={((permisosAdmin[item.rol]?.length || 0) / MODULOS.length) * 100} />)}
      </div>

      <AdminPanel eyebrow="Matriz de acceso" title="Permisos por rango" detail="Los cambios controlan el dock, los accesos rápidos y los guards de cada módulo.">
        <div className="messa-permission-matrix">
          <div className="messa-permission-row messa-permission-row--header"><span>Módulo</span>{ROLES.map(item => <span key={item.rol}>{item.label}</span>)}</div>
          {MODULOS.map((modulo, index) => (
            <div className={`messa-permission-row${index === 0 || MODULOS[index - 1].grupo !== modulo.grupo ? ' messa-permission-row--group' : ''}`} key={modulo.permiso}>
              <span><b>{modulo.label}</b><small>{modulo.grupo}</small></span>
              {ROLES.map(item => {
                const activo = permisosAdmin[item.rol]?.includes(modulo.permiso)
                const bloqueado = item.rol === 'creator' || !puedeEditar
                return <button type="button" key={item.rol} className={activo ? 'active' : ''} disabled={bloqueado} onClick={() => toggle(item.rol, modulo.permiso)} aria-label={`${activo ? 'Quitar' : 'Dar'} acceso a ${modulo.label} para ${item.label}`} aria-pressed={activo}>{activo && <Check size={15} />}</button>
              })}
            </div>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel
        eyebrow="Cuentas del equipo"
        title="Quién entra al backoffice"
        detail="Altas, bajas y cambios de rango sin tocar variables de entorno ni volver a publicar. Las cuentas fijas del servidor siguen funcionando como llave de emergencia."
        action={<AdminButton tone="primary" icon={Plus} disabled={!puedeEditar || estadoEquipo !== 'listo'} onClick={() => setCreando(true)}>Nueva cuenta</AdminButton>}
      >
        {estadoEquipo === 'cargando' && <p className="messa-form-help">Cargando el equipo…</p>}
        {estadoEquipo === 'sin-base' && <AdminEmpty Icon={UsersRound} title="Las cuentas del equipo no están disponibles" description={avisoEquipo} />}
        {estadoEquipo === 'listo' && (equipo.length ? (
          <div className="messa-team-list">
            {equipo.map(usuario => (
              <article key={usuario.email} className={usuario.activo ? '' : 'inactiva'}>
                <div className="messa-team-identity">
                  <b>{usuario.nombre}</b>
                  <small>{usuario.email}{usuario.ultimo_acceso ? ` · entró ${new Date(usuario.ultimo_acceso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}` : ' · nunca entró'}</small>
                </div>
                <label className="messa-team-rol">
                  <span className="sr-only">Rango de {usuario.nombre}</span>
                  <select value={usuario.rol} disabled={!puedeEditar} onChange={event => cambiar(usuario.email, { rol: event.target.value as RolUsuario })}>
                    {ROLES_ASIGNABLES.map(item => <option key={item.rol} value={item.rol}>{item.label}</option>)}
                  </select>
                </label>
                <AdminButton tone={usuario.activo ? 'neutral' : 'primary'} disabled={!puedeEditar} onClick={() => cambiar(usuario.email, { activo: !usuario.activo })}>
                  {usuario.activo ? 'Suspender' : 'Reactivar'}
                </AdminButton>
                <button type="button" className="messa-team-borrar" disabled={!puedeEditar} aria-label={`Borrar la cuenta de ${usuario.nombre}`} onClick={() => borrar(usuario.email)}><Trash2 size={16} /></button>
              </article>
            ))}
          </div>
        ) : (
          <AdminEmpty Icon={UserPlus} title="Todavía no hay cuentas creadas acá" description="Por ahora entran sólo las cuentas definidas en variables de entorno. Creá la primera para sumar gente sin redeployar." />
        ))}
      </AdminPanel>

      <div className="messa-security-grid">
        <AdminPanel eyebrow="Autenticación" title="Credenciales protegidas" detail="Las contraseñas se verifican en el servidor con hashes, nunca desde el navegador.">
          <div className="messa-security-feature"><span><LockKeyhole size={18} /></span><div><b>Sesión firmada</b><small>Cookie HTTP-only y validación del lado servidor.</small></div><AdminStatus tone="green">Activo</AdminStatus></div>
          <div className="messa-security-feature"><span><KeyRound size={18} /></span><div><b>Cuenta actual</b><small>{sesionAdmin?.nombre} · {sesionAdmin?.email}</small></div><AdminStatus tone="gold">{sesionAdmin?.rol}</AdminStatus></div>
        </AdminPanel>
        <AdminPanel eyebrow="Alcance" title="Vista de Staff" detail="El rango Staff entra en una operación simplificada, sin módulos financieros ni configuración.">
          <div className="messa-role-preview"><UsersRound size={25} /><span><b>{permisosAdmin.staff.length} accesos habilitados</b><small>{MODULOS.filter(item => permisosAdmin.staff.includes(item.permiso)).map(item => item.label).join(' · ') || 'Sin accesos'}</small></span></div>
        </AdminPanel>
      </div>

      <AdminSheet
        open={creando}
        onClose={() => setCreando(false)}
        title="Nueva cuenta del equipo"
        eyebrow="Alta de personal"
        footer={(
          <>
            <AdminButton tone="quiet" onClick={() => setCreando(false)}>Cancelar</AdminButton>
            <AdminButton tone="primary" icon={UserPlus} disabled={guardando} onClick={crearCuenta}>{guardando ? 'Creando…' : 'Crear cuenta'}</AdminButton>
          </>
        )}
      >
        <div className="messa-form-stack">
          <label><span>Nombre</span><input value={nuevo.nombre} onChange={event => setNuevo(current => ({ ...current, nombre: event.target.value }))} placeholder="Nombre y apellido" autoComplete="off" /></label>
          <label><span>Email</span><input type="email" value={nuevo.email} onChange={event => setNuevo(current => ({ ...current, email: event.target.value }))} placeholder="persona@tu-restaurante.com" autoComplete="off" /></label>
          <label><span>Contraseña inicial</span><input type="text" value={nuevo.password} onChange={event => setNuevo(current => ({ ...current, password: event.target.value }))} placeholder="Al menos 8 caracteres" autoComplete="new-password" /></label>
          <label>
            <span>Rango</span>
            <select value={nuevo.rol} onChange={event => setNuevo(current => ({ ...current, rol: event.target.value as RolUsuario }))}>
              {ROLES_ASIGNABLES.map(item => <option key={item.rol} value={item.rol}>{item.label} — {item.detail}</option>)}
            </select>
          </label>
          <p className="messa-form-help">La contraseña se guarda hasheada: nadie —vos incluido— puede volver a verla. Si se pierde, se crea una nueva.</p>
        </div>
      </AdminSheet>
    </AdminWorkspace>
  )
}
