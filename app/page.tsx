'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import Footer from '@/components/Footer'

export default function Home() {
  const { initStore, insumos, pedidos, sesionAdmin, sucursales, sucursalActualId } = useStore()
  useEffect(() => { initStore() }, [initStore])

  const insumoCriticos = insumos.filter(i => i.cantidad <= i.cantidad_critica && i.sucursal_id === sucursalActualId).length
  const pedidosActivos = pedidos.filter(p => p.estado === 'en_cocina').length
  const nombreSucursal = sucursales.find(s => s.id === sucursalActualId)?.nombre || ''

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '0 20px' }}>
      <div style={{ paddingTop: 56, textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 100, padding: '6px 16px', marginBottom: 20 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', display: 'inline-block' }} className="pulse-dot" />
          <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 500 }}>📍 {nombreSucursal}</span>
        </div>
        <h1 className="font-titulos" style={{ fontSize: 34, fontWeight: 700, margin: '0 0 10px', letterSpacing: '-0.5px' }}>Menu<span style={{ color: 'var(--gold)' }}>Flow</span></h1>
        <p style={{ color: '#707070', fontSize: 14, margin: 0, lineHeight: 1.6 }}>Gestión premium multi-sucursal<br />Creado por Matías Colimodio</p>
      </div>

      {insumoCriticos > 0 && (
        <Link href="/encargos" style={{ textDecoration: 'none', display: 'block', marginBottom: 16 }}>
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 14, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: 0, fontSize: 13, color: '#F59E0B', fontWeight: 600 }}>⚠️ {insumoCriticos} insumo{insumoCriticos > 1 ? 's' : ''} en nivel crítico</p>
            <span style={{ color: '#F59E0B', fontSize: 14 }}>›</span>
          </div>
        </Link>
      )}

      <Section titulo="👤 Experiencia del Comensal">
        <LinkCard href="/vista" emoji="👁️" titulo="Modo Vista (Curioso)" desc="Carta solo lectura · QR de la puerta" color="#3B82F6" />
        <LinkCard href="/mesa/m1" emoji="🍽️" titulo="Mesa 1 — Activa" desc="Flujo completo: pedir → propina → pagar" color="#EF4444" />
        <LinkCard href="/mesa/m3" emoji="🍽️" titulo="Mesa 3 — Libre" desc="Primera vez · popup de bienvenida" color="#22C55E" />
      </Section>

      <Section titulo="👨‍💼 Panel del Personal">
        <LinkCard href="/dashboard" emoji="🚦" titulo="Control de Salón" desc="Plano visual + semáforo + llamados" color="var(--gold)" />
        <LinkCard href="/cocina" emoji="👨‍🍳" titulo={`KDS — Cocina${pedidosActivos > 0 ? ` (${pedidosActivos})` : ''}`} desc="Kitchen Display System + delivery" color="#F59E0B" />
        <LinkCard href="/encargos" emoji="📦" titulo={`Encargos & Stock${insumoCriticos > 0 ? ` ⚠️ ${insumoCriticos}` : ''}`} desc="Alertas de insumos · Excel/CSV" color="#F59E0B" />
        <LinkCard href="/reservas" emoji="📅" titulo="Reservas" desc="Gestión de reservas del día" color="#8B5CF6" />
      </Section>

      <Section titulo="🔐 Administración (requiere login)">
        <LinkCard href={sesionAdmin ? '/admin' : '/login'} emoji="🔑" titulo={sesionAdmin ? `Panel Admin — ${sesionAdmin.nombre}` : 'Iniciar sesión'} desc={sesionAdmin ? 'Ya iniciaste sesión' : 'Acceso con email y contraseña'} color="#22C55E" />
        <LinkCard href="/admin/carta" emoji="🍽️" titulo="Gestión de Carta" desc="Fotos propias, categorías, bienvenida" color="var(--gold)" />
        <LinkCard href="/admin/mesas" emoji="🗺️" titulo="Plano del Salón" desc="Arrastrá, agregá y editá mesas" color="#3B82F6" />
        <LinkCard href="/admin/sucursales" emoji="📍" titulo="Sucursales" desc={`${sucursales.length} locales · multi-sucursal`} color="#8B5CF6" />
        <LinkCard href="/admin/pagos" emoji="💳" titulo="Pagos & Propinas" desc="Mercado Pago · CBU/CVU · POS" color="#22C55E" />
        <LinkCard href="/admin/finanzas" emoji="📈" titulo="Finanzas" desc="Márgenes, costos y gastos" color="#22C55E" />
        <LinkCard href="/admin/cierre" emoji="🖨️" titulo="Cierre de Caja" desc="Por tarjeta, MP, transferencia, efectivo" color="var(--gold)" />
        <LinkCard href="/admin/integraciones" emoji="🛵" titulo="Apps de Delivery" desc="PedidosYa, Rappi, Uber Eats" color="#8B5CF6" />
        <LinkCard href="/admin/fidelidad" emoji="🏆" titulo="Fidelidad" desc="Puntos y recompensas (creador)" color="var(--gold)" />
        <LinkCard href="/admin/usuarios" emoji="👥" titulo="Usuarios & Accesos" desc="Roles y recuperación de contraseña" color="#3B82F6" />
        <LinkCard href="/admin/tema" emoji="🎨" titulo="Identidad de Marca" desc="Colores y tipografía (creador)" color="var(--gold)" />
      </Section>

      <div style={{ margin: '8px 0 20px', background: '#141414', border: '1px solid #2A2A2A', borderRadius: 16, padding: 16 }}>
        <p style={{ fontSize: 12, color: '#707070', margin: 0, lineHeight: 1.8 }}>
          📱 Desde tu celular (misma WiFi): <code style={{ color: 'var(--gold)' }}>http://[IP-PC]:3000</code><br />
          🖥️ En la terminal, dentro de la carpeta: <code style={{ color: 'var(--gold)' }}>npm start</code>
        </p>
      </div>

      <Footer />
    </main>
  )
}

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{ fontSize: 11, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>{titulo}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  )
}

function LinkCard({ href, emoji, titulo, desc, color }: { href: string; emoji: string; titulo: string; desc: string; color: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div className="card-hover" style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        <div style={{ width: 42, height: 42, borderRadius: 11, background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>{emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titulo}</p>
          <p style={{ margin: 0, fontSize: 11, color: '#707070', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{desc}</p>
        </div>
        <span style={{ color: '#383838', fontSize: 16 }}>›</span>
      </div>
    </Link>
  )
}
