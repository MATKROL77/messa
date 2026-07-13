'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { RolUsuario } from '@/types'

const PERMISOS: { prefix: string; roles: RolUsuario[] }[] = [
  { prefix: '/admin/tema', roles: ['creator'] },
  { prefix: '/admin/fidelidad', roles: ['creator'] },
  { prefix: '/admin/usuarios', roles: ['creator', 'admin'] },
  { prefix: '/admin/pagos', roles: ['creator', 'admin'] },
  { prefix: '/admin/cierre', roles: ['creator', 'admin'] },
  { prefix: '/admin/mesas', roles: ['creator', 'admin'] },
  { prefix: '/admin/sucursales', roles: ['creator', 'admin'] },
  { prefix: '/admin/finanzas', roles: ['creator', 'admin'] },
  { prefix: '/admin/integraciones', roles: ['creator', 'admin'] },
  { prefix: '/admin/carta', roles: ['creator', 'admin', 'editor'] },
  { prefix: '/admin/stock', roles: ['creator', 'admin', 'editor'] },
]

const ROL_LABEL: Record<RolUsuario, { label: string; color: string }> = {
  creator: { label: '👑 Creador', color: '#D4AF37' },
  admin: { label: '🏢 Dueño', color: '#3B82F6' },
  editor: { label: '✏️ Editor', color: '#22C55E' },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { sesionAdmin, setSesionAdmin, logoutAdmin, sucursales, sucursalActualId, setSucursalActual } = useStore()
  const [verificando, setVerificando] = useState(true)

  // La sesión NUNCA se confía desde localStorage — se verifica contra la
  // cookie firmada del servidor en cada carga del panel admin.
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => {
  if (r.ok) return r.json();
  throw new Error('No autorizado');
})
.then(data => {
  // Acá tipamos 'data' como 'any' temporalmente para que TypeScript no moleste con las propiedades
  const userData = data as any;
  setSesionAdmin({ 
    nombre: userData.nombre, 
    email: userData.email, 
    rol: userData.rol // (o lo que siga en tu código)
  });
})
.catch(() => setSesionAdmin(null))
      .finally(() => setVerificando(false))
    // eslint-disable-next-line
  }, [])

  if (verificando) {
    return <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#707070', fontSize: 13 }}>Verificando sesión...</p></div>
  }

  if (!sesionAdmin) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 44, margin: '0 0 16px' }}>🔒</p>
        <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>Acceso restringido</h2>
        <p style={{ color: '#707070', fontSize: 14, margin: '0 0 24px', maxWidth: 280 }}>Necesitás iniciar sesión para acceder al panel de administración.</p>
        <Link href="/login" className="btn-gold" style={{ textDecoration: 'none', padding: '12px 28px', borderRadius: 14, fontSize: 14, fontWeight: 600 }}>Iniciar sesión</Link>
        <Link href="/" style={{ textDecoration: 'none', marginTop: 16, color: '#707070', fontSize: 13 }}>← Volver al inicio</Link>
      </div>
    )
  }

  const regla = PERMISOS.find(p => pathname.startsWith(p.prefix))
  const permitido = !regla || regla.roles.includes(sesionAdmin.rol)

  if (!permitido) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 44, margin: '0 0 16px' }}>⛔</p>
        <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>No tenés permisos</h2>
        <p style={{ color: '#707070', fontSize: 14, margin: '0 0 24px', maxWidth: 280 }}>Tu rol ({ROL_LABEL[sesionAdmin.rol].label}) no tiene acceso a esta sección.</p>
        <Link href="/admin" style={{ textDecoration: 'none', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 12, padding: '10px 20px', color: '#fff', fontSize: 13 }}>← Volver al panel</Link>
      </div>
    )
  }

  const puedeCambiarSucursal = sesionAdmin.rol === 'creator' || sesionAdmin.rol === 'admin'

  return (
    <div>
      <div style={{ background: '#050505', borderBottom: '1px solid #1C1C1C', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 11, color: ROL_LABEL[sesionAdmin.rol].color, fontWeight: 600, whiteSpace: 'nowrap' }}>{ROL_LABEL[sesionAdmin.rol].label}</span>
          <span style={{ fontSize: 11, color: '#484848', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>· {sesionAdmin.nombre}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {puedeCambiarSucursal && sucursales.length > 1 && (
            <select value={sucursalActualId} onChange={e => setSucursalActual(e.target.value)} style={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 8, padding: '4px 8px', color: '#D4AF37', fontSize: 11, maxWidth: 140 }}>
              {sucursales.map(s => <option key={s.id} value={s.id}>📍 {s.nombre}</option>)}
            </select>
          )}
          <button onClick={async () => { await logoutAdmin(); router.push('/') }} style={{ background: 'transparent', border: 'none', color: '#707070', fontSize: 11, cursor: 'pointer', textDecoration: 'underline', whiteSpace: 'nowrap' }}>Salir</button>
        </div>
      </div>
      {children}
    </div>
  )
}
