'use client'
import Link from 'next/link'
import { useStore } from '@/lib/store'

export default function UsuariosPage() {
  const { sesionAdmin } = useStore()
  const esCreator = sesionAdmin?.rol === 'creator'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 40 }}>
      <div style={{ background: 'var(--bg)', borderBottom: '1px solid #1C1C1C', padding: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="font-titulos" style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Usuarios & Accesos</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707070' }}>Autenticación real, verificada en el servidor</p>
          </div>
          <Link href="/admin" style={{ textDecoration: 'none', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#A0A0A0' }}>← Admin</Link>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 14, padding: 14, marginBottom: 20 }}>
          <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#22C55E' }}>🔐 Esto ya no vive en el navegador</p>
          <p style={{ margin: 0, fontSize: 12, color: '#707070', lineHeight: 1.6 }}>Las 3 cuentas (Creador, Dueño, Editor) se verifican con bcrypt en el servidor a partir de variables de entorno — nunca en localStorage ni en el código fuente. Ver <code style={{ color: '#22C55E' }}>.env.example</code>.</p>
        </div>

        {[
          { rol: 'creator', label: '👑 Creador', color: '#D4AF37', vars: ['CREATOR_EMAIL', 'CREATOR_PASSWORD_HASH', 'CREATOR_NOMBRE'] },
          { rol: 'admin', label: '🏢 Dueño / Admin', color: '#3B82F6', vars: ['ADMIN_EMAIL', 'ADMIN_PASSWORD_HASH', 'ADMIN_NOMBRE'] },
          { rol: 'editor', label: '✏️ Editor', color: '#22C55E', vars: ['EDITOR_EMAIL', 'EDITOR_PASSWORD_HASH', 'EDITOR_NOMBRE'] },
        ].map(c => (
          <div key={c.rol} style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <p style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600, color: c.color }}>{c.label}</p>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: '#707070' }}>Definida por estas variables de entorno del servidor:</p>
            {c.vars.map(v => <code key={v} style={{ display: 'block', fontSize: 11, color: '#A0A0A0', background: '#1C1C1C', borderRadius: 8, padding: '6px 10px', marginBottom: 6 }}>{v}</code>)}
          </div>
        ))}

        <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>🔑 Cómo cambiar una contraseña</p>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#A0A0A0', lineHeight: 2 }}>
            <li>Corré: <code style={{ color: '#D4AF37' }}>node scripts/generar-hash.js &quot;TuNuevaContraseña&quot;</code></li>
            <li>Copiá el hash que te devuelve</li>
            <li>Actualizá la variable <code style={{ color: '#D4AF37' }}>*_PASSWORD_HASH</code> correspondiente en tu hosting (o en tu <code style={{ color: '#D4AF37' }}>.env</code> local)</li>
            <li>Redeployá / reiniciá el servidor</li>
          </ol>
        </div>

        <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 14, padding: 14 }}>
          <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#F59E0B' }}>⚠️ Crear más editores en tiempo de ejecución</p>
          <p style={{ margin: 0, fontSize: 12, color: '#707070', lineHeight: 1.6 }}>
            Todavía no está disponible: agregar una cuenta nueva "al vuelo" desde acá necesita un lugar persistente donde guardarla (una base de datos), y hoy no hay una conectada. Con las variables de entorno actuales alcanza para vos, el dueño y un editor genérico. Cuando conectemos Supabase/D1, esta pantalla va a poder crear, desactivar y resetear cuentas de verdad {esCreator ? '' : '(el creador puede ver más detalle técnico en LEEME.md)'}.
          </p>
        </div>
      </div>
    </div>
  )
}
