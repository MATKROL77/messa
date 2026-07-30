'use client'

import { useState } from 'react'
import { Check, Crown, KeyRound, LockKeyhole, Save, ShieldCheck, UserCog, UsersRound } from 'lucide-react'
import { useStore, type PermisoAdmin } from '@/lib/store'
import type { RolUsuario } from '@/types'
import { AdminButton, AdminMetric, AdminPanel, AdminStatus, AdminToast, AdminWorkspace } from '@/components/admin/admin-ui'

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
  { rol: 'editor', label: 'Editor', detail: 'Carta e inventario', Icon: UserCog, tone: 'green' },
  { rol: 'staff', label: 'Staff', detail: 'Operación de salón', Icon: UsersRound, tone: 'amber' },
]

export default function UsuariosPage() {
  const { sesionAdmin, permisosAdmin, actualizarPermisoRol } = useStore()
  const [toast, setToast] = useState('')
  const puedeEditar = sesionAdmin?.rol === 'creator' || sesionAdmin?.rol === 'admin'

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

      <div className="messa-security-grid">
        <AdminPanel eyebrow="Autenticación" title="Credenciales protegidas" detail="Las contraseñas se verifican en el servidor con hashes, nunca desde el navegador.">
          <div className="messa-security-feature"><span><LockKeyhole size={18} /></span><div><b>Sesión firmada</b><small>Cookie HTTP-only y validación del lado servidor.</small></div><AdminStatus tone="green">Activo</AdminStatus></div>
          <div className="messa-security-feature"><span><KeyRound size={18} /></span><div><b>Cuenta actual</b><small>{sesionAdmin?.nombre} · {sesionAdmin?.email}</small></div><AdminStatus tone="gold">{sesionAdmin?.rol}</AdminStatus></div>
        </AdminPanel>
        <AdminPanel eyebrow="Alcance" title="Vista de Staff" detail="El rango Staff entra en una operación simplificada, sin módulos financieros ni configuración.">
          <div className="messa-role-preview"><UsersRound size={25} /><span><b>{permisosAdmin.staff.length} accesos habilitados</b><small>{MODULOS.filter(item => permisosAdmin.staff.includes(item.permiso)).map(item => item.label).join(' · ') || 'Sin accesos'}</small></span></div>
        </AdminPanel>
      </div>
    </AdminWorkspace>
  )
}
