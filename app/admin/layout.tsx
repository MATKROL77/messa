'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Bell, Building2, CalendarDays, ChartLine, Check, ChefHat, ChevronDown, CircleUserRound, CreditCard, Crown, ExternalLink, LayoutDashboard, LogOut, MapPinned, Package, PackageSearch, Palette, QrCode, ReceiptText, Store, Trash2, UsersRound, UtensilsCrossed, X } from 'lucide-react'
import { useStore, type PermisoAdmin } from '@/lib/store'
import type { RolUsuario } from '@/types'
import MessaWordmark from '@/components/messa-wordmark'
import AdminThemeToggle from '@/components/admin-theme-toggle'
import { limpiarIconoLegacy } from '@/lib/utils'
import { MODO_VISTA_PREVIA } from '@/lib/mesa-codigo-preview'
import { withBasePath } from '@/lib/base-path'

const PERMISO_RUTA: { prefix: string; permiso: PermisoAdmin }[] = [
  { prefix: '/admin/tema', permiso: 'identidad' },
  { prefix: '/admin/fidelidad', permiso: 'fidelidad' },
  { prefix: '/admin/usuarios', permiso: 'usuarios' },
  { prefix: '/admin/pagos', permiso: 'cobros' },
  { prefix: '/admin/cierre', permiso: 'caja' },
  { prefix: '/admin/mesas', permiso: 'salon' },
  { prefix: '/admin/sucursales', permiso: 'sucursales' },
  { prefix: '/admin/finanzas', permiso: 'finanzas' },
  { prefix: '/admin/integraciones', permiso: 'delivery' },
  { prefix: '/admin/carta', permiso: 'carta' },
  { prefix: '/admin/stock', permiso: 'inventario' },
  { prefix: '/dashboard', permiso: 'salon' },
  { prefix: '/cocina', permiso: 'pedidos' },
  { prefix: '/reservas', permiso: 'reservas' },
]

const ROL_LABEL: Record<RolUsuario, { label: string; color: string }> = {
  creator: { label: 'Creador', color: '#d7b567' },
  admin: { label: 'Administrador', color: '#94b9db' },
  editor: { label: 'Editor', color: '#82bd99' },
  staff: { label: 'Staff', color: '#d4cdbf' },
}

type DockItem = { href: string; label: string; Icon: typeof LayoutDashboard; exact?: boolean }

const OPERACION: DockItem[] = [
  { href: '/admin', label: 'Resumen', Icon: LayoutDashboard, exact: true },
  { href: '/admin/carta', label: 'Carta', Icon: UtensilsCrossed },
  { href: '/dashboard', label: 'Salón', Icon: MapPinned, exact: true },
  { href: '/admin/mesas', label: 'Mesas y QR', Icon: QrCode },
  { href: '/cocina', label: 'Ver pedidos', Icon: ChefHat, exact: true },
  { href: '/admin/stock', label: 'Inventario', Icon: Package },
  { href: '/reservas', label: 'Reservas', Icon: CalendarDays, exact: true },
  { href: '/admin/finanzas', label: 'Finanzas', Icon: ChartLine },
]

const GESTION: DockItem[] = [
  { href: '/admin/pagos', label: 'Cobros', Icon: CreditCard },
  { href: '/admin/cierre', label: 'Cierre de caja', Icon: ReceiptText },
  { href: '/admin/integraciones', label: 'Delivery', Icon: PackageSearch },
  { href: '/admin/fidelidad', label: 'Fidelidad', Icon: Crown },
  { href: '/admin/sucursales', label: 'Sucursales', Icon: Building2 },
  { href: '/admin/usuarios', label: 'Usuarios', Icon: UsersRound },
  { href: '/admin/tema', label: 'Identidad', Icon: Palette },
]

function isCurrentPath(pathname: string, item: DockItem) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href)
}

function permisoDeItem(item: DockItem): PermisoAdmin {
  if (item.href === '/admin') return 'resumen'
  return PERMISO_RUTA.find(regla => item.href.startsWith(regla.prefix) || regla.prefix.startsWith(item.href))?.permiso || 'resumen'
}

function DockLink({ item, pathname }: { item: DockItem; pathname: string }) {
  const active = isCurrentPath(pathname, item)
  return (
    <Link
      href={item.href}
      className={`admin-dock-link${active ? ' active' : ''}`}
      aria-label={item.label}
      aria-current={active ? 'page' : undefined}
      data-tooltip={item.label}
    >
      <item.Icon size={19} strokeWidth={1.8} aria-hidden="true" />
      <span>{item.label}</span>
    </Link>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { sesionAdmin, setSesionAdmin, logoutAdmin, sucursales, sucursalActualId, setSucursalActual, notificaciones, marcarNotificacionLeida, limpiarNotificaciones, permisosAdmin, initStore } = useStore()
  const [verificando, setVerificando] = useState(true)
  const [sucursalesAbiertas, setSucursalesAbiertas] = useState(false)
  const [alertasAbiertas, setAlertasAbiertas] = useState(false)

  useEffect(() => {
    initStore()
    fetch(withBasePath('/api/auth/me'))
      .then(response => {
        if (response.ok) return response.json()
        throw new Error('No autorizado')
      })
      .then((data: { nombre: string; email: string; rol: RolUsuario }) => setSesionAdmin({ nombre: data.nombre, email: data.email, rol: data.rol }))
      .catch(() => {
        // La vista previa estática no tiene backend de autenticación: se abre
        // el panel con datos de demostración y un aviso visible. En el
        // despliegue real esta rama no se ejecuta y sigue haciendo falta login.
        if (MODO_VISTA_PREVIA) {
          setSesionAdmin({ nombre: 'Vista previa', email: 'demo@messa.app', rol: 'creator' })
          return
        }
        setSesionAdmin(null)
      })
      .finally(() => setVerificando(false))
  }, [initStore, setSesionAdmin])

  if (verificando) return <div className="admin-access-state">Verificando sesión…</div>

  if (!sesionAdmin) {
    return <div className="admin-access-state"><CircleUserRound size={38} /><h2>Acceso restringido</h2><p>Necesitás iniciar sesión para acceder al centro de control.</p><Link href="/login" className="admin-primary-link">Iniciar sesión</Link><Link href="/">Volver al inicio</Link></div>
  }

  const regla = PERMISO_RUTA.find(permiso => pathname.startsWith(permiso.prefix))
  if (regla && !permisosAdmin[sesionAdmin.rol]?.includes(regla.permiso)) {
    return <div className="admin-access-state"><h2>No tenés permisos</h2><p>Tu rol de {ROL_LABEL[sesionAdmin.rol].label} no tiene acceso a esta sección.</p><Link href="/admin" className="admin-primary-link">Volver al panel</Link></div>
  }

  const puedeCambiarSucursal = sesionAdmin.rol === 'creator' || sesionAdmin.rol === 'admin'
  const sucursalActual = sucursales.find(sucursal => sucursal.id === sucursalActualId)
  const esStaff = sesionAdmin.rol === 'staff'
  const permisosDelRol = permisosAdmin[sesionAdmin.rol] || []
  const operacionVisible = OPERACION.filter(item => permisosDelRol.includes(permisoDeItem(item)))
  const gestionVisible = GESTION.filter(item => permisosDelRol.includes(permisoDeItem(item)))
  const alertasPendientes = notificaciones.filter(notificacion => !notificacion.leida)
  const moduloActivo = [...OPERACION, ...GESTION].find(item => isCurrentPath(pathname, item))
  const moduloExpandido = pathname !== '/admin'

  return (
    <div className="admin-shell">
      <div className="admin-ambient" aria-hidden="true" />
      {MODO_VISTA_PREVIA && (
        <p className="admin-preview-banner" role="status">
          Vista previa estática · datos de demostración, sin servidor. El login real, los pagos y los códigos de mesa firmados funcionan en el despliegue completo.
        </p>
      )}

      <div className="admin-dock-stack">
      <aside className="admin-sidebar" aria-label="Navegación administrativa">
        <Link href="/admin" className="admin-dock-brand" aria-label="MESSA, ir al resumen" data-tooltip="MESSA">
          <MessaWordmark />
        </Link>
        <span className="admin-dock-divider" aria-hidden="true" />
        <nav className="admin-dock-nav" aria-label="Operación">
          {operacionVisible.map(item => <DockLink key={item.href} item={item} pathname={pathname} />)}
        </nav>
        {!esStaff && gestionVisible.length > 0 && <><span className="admin-dock-divider admin-dock-divider--management" aria-hidden="true" /><nav className="admin-dock-nav admin-dock-nav--management" aria-label="Gestión">{gestionVisible.map(item => <DockLink key={item.href} item={item} pathname={pathname} />)}</nav></>}
        <div className="admin-dock-footer">
          <Link href="/vista" className="admin-dock-link" aria-label="Ver carta pública" data-tooltip="Ver carta pública"><ExternalLink size={18} aria-hidden="true" /><span>Ver carta pública</span></Link>
          <button className="admin-dock-link" onClick={async () => { await logoutAdmin(); router.push('/') }} aria-label="Cerrar sesión" data-tooltip="Cerrar sesión"><LogOut size={18} aria-hidden="true" /><span>Cerrar sesión</span></button>
        </div>
      </aside>
      <AdminThemeToggle />
      </div>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar__identity">
            <MessaWordmark />
            <span className="admin-service-status"><i />Servicio activo</span>
          </div>
          <nav className="admin-topbar__nav" aria-label="Accesos principales">
            {operacionVisible.slice(1, 5).map(item => <Link key={item.href} href={item.href} className={isCurrentPath(pathname, item) ? 'active' : ''}>{item.label}</Link>)}
          </nav>
          <div className="admin-topbar__actions">
            <span className="admin-topbar__role" style={{ color: ROL_LABEL[sesionAdmin.rol].color }}>{ROL_LABEL[sesionAdmin.rol].label}</span>
            {puedeCambiarSucursal && sucursales.length > 1 && <div className="admin-popover-control">
              <button type="button" className="admin-branch-control" onClick={() => { setSucursalesAbiertas(value => !value); setAlertasAbiertas(false) }} aria-haspopup="menu" aria-expanded={sucursalesAbiertas}><Store size={15} aria-hidden="true" /><span>{sucursalActual?.nombre || 'Sucursal'}</span><ChevronDown size={13} aria-hidden="true" /></button>
              {sucursalesAbiertas && <div className="admin-topbar-popover admin-branch-menu" role="menu" aria-label="Elegir sucursal">{sucursales.map(sucursal => <button type="button" role="menuitem" key={sucursal.id} className={sucursal.id === sucursalActualId ? 'active' : ''} onClick={() => { setSucursalActual(sucursal.id); setSucursalesAbiertas(false) }}><span><b>{sucursal.nombre}</b><small>{sucursal.direccion || 'Sucursal MESSA'}</small></span>{sucursal.id === sucursalActualId && <Check size={15} />}</button>)}</div>}
            </div>}
            <div className="admin-popover-control">
              <button type="button" className="admin-alert-button" onClick={() => { setAlertasAbiertas(value => !value); setSucursalesAbiertas(false) }} aria-label="Abrir notificaciones" aria-haspopup="dialog" aria-expanded={alertasAbiertas}><Bell size={17} />{alertasPendientes.length > 0 && <span>{alertasPendientes.length}</span>}</button>
              {alertasAbiertas && <div className="admin-topbar-popover admin-notification-popover" role="dialog" aria-label="Notificaciones">
                <header><span><b>Actividad reciente</b><small>{alertasPendientes.length} pendientes</small></span><button type="button" onClick={() => setAlertasAbiertas(false)} aria-label="Cerrar notificaciones"><X size={15} /></button></header>
                <div>{notificaciones.length ? notificaciones.slice(0, 6).map(notificacion => <button type="button" key={notificacion.id} className={notificacion.leida ? 'read' : ''} onClick={() => marcarNotificacionLeida(notificacion.id)}><i className={`admin-notification-dot admin-notification-dot--${notificacion.tipo}`} /><span><b>{limpiarIconoLegacy(notificacion.mensaje)}</b><small>{new Date(notificacion.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</small></span>{!notificacion.leida && <Check size={14} />}</button>) : <p>No hay notificaciones todavía.</p>}</div>
                {notificaciones.length > 0 && <footer className="admin-notification-popover__footer"><button type="button" onClick={() => { limpiarNotificaciones(); setAlertasAbiertas(false) }}><Trash2 size={14} />Vaciar historial</button></footer>}
              </div>}
            </div>
            <span className="admin-profile" title={sesionAdmin.nombre}><CircleUserRound size={18} aria-hidden="true" /><span>{sesionAdmin.nombre}</span></span>
          </div>
        </header>

        <nav className="admin-quick-dock" aria-label="Acciones operativas rápidas">
          {permisosDelRol.includes('carta') && <Link href="/admin/carta"><UtensilsCrossed size={16} />Editar carta</Link>}
          {permisosDelRol.includes('salon') && <Link href="/dashboard"><MapPinned size={16} />Abrir salón</Link>}
          {permisosDelRol.includes('pedidos') && <Link href="/cocina"><ChefHat size={16} />Ver pedidos</Link>}
          {permisosDelRol.includes('reservas') && <Link href="/reservas"><CalendarDays size={16} />Reservas</Link>}
          {permisosDelRol.includes('caja') && <Link href="/admin/cierre"><ReceiptText size={16} />Cierre</Link>}
          {permisosDelRol.includes('inventario') && <Link href="/admin/stock"><Bell size={16} />Inventario</Link>}
        </nav>

        <div className={`admin-content-frame${moduloExpandido ? ' is-module' : ''}`}>
          {moduloExpandido && (
            <button
              type="button"
              className="admin-module-close"
              onClick={() => router.push('/admin')}
              aria-label={`Cerrar ${moduloActivo?.label || 'módulo'} y volver al resumen`}
              title="Volver al resumen"
            >
              <X size={18} aria-hidden="true" />
              <span>Cerrar</span>
            </button>
          )}
          <div className="admin-content" key={pathname}>{children}</div>
        </div>
      </main>
    </div>
  )
}
