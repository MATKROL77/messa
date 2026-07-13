'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'

const LOGOS: Record<string, { color: string; emoji: string }> = {
  pedidosya: { color: '#FF2D55', emoji: '🛵' },
  rappi: { color: '#FF441F', emoji: '🐻' },
  ubereats: { color: '#06C167', emoji: '🚗' },
  otro: { color: '#707070', emoji: '📦' },
}

export default function IntegracionesPage() {
  const { deliveryIntegraciones, actualizarDeliveryIntegracion } = useStore()
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState({ api_key: '', webhook_url: '' })
  const [conectando, setConectando] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2600) }

  const handleConectar = (id: string) => {
    if (!form.api_key.trim()) { showToast('Ingresá una API key'); return }
    setConectando(id)
    setTimeout(() => {
      actualizarDeliveryIntegracion(id, { api_key: form.api_key, webhook_url: form.webhook_url, conectado: true, ultima_conexion: new Date().toISOString() })
      setConectando(null)
      setEditandoId(null)
      showToast('✅ Integración conectada')
    }, 1200)
  }

  const handleDesconectar = (id: string) => { actualizarDeliveryIntegracion(id, { conectado: false }); showToast('Desconectado') }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 40 }}>
      {toast && <div className="fade-in" style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', background: '#1C1C1C', border: '1px solid #383838', borderRadius: 100, padding: '10px 20px', fontSize: 13, color: '#fff', zIndex: 9999, whiteSpace: 'nowrap' }}>{toast}</div>}

      <div style={{ background: 'var(--bg)', borderBottom: '1px solid #1C1C1C', padding: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="font-titulos" style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Apps de Delivery</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707070' }}>Unificá todos tus pedidos en una sola cocina</p>
          </div>
          <Link href="/admin" style={{ textDecoration: 'none', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#A0A0A0' }}>← Admin</Link>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#EF4444' }}>⚠️ Diferencia importante</p>
          <p style={{ margin: 0, fontSize: 12, color: '#A0A0A0', lineHeight: 1.6 }}>
            Lo que ves acá es el <strong>endpoint técnico</strong> (la URL que recibe el aviso de un pedido) — ya está escrito y funciona. Pero &ldquo;conectado&rdquo; en esta pantalla es solo un estado visual local: todavía no hay una integración real con la API de ninguna plataforma (eso requiere el convenio comercial + credenciales reales de cada una), y sin una base de datos conectada, un pedido que llegara por este webhook hoy solo quedaría en el log del servidor — no aparecería en <Link href="/cocina" style={{ color: '#EF4444' }}>Cocina</Link> todavía. Ver LEEME.md para los próximos pasos reales.
          </p>
        </div>

        <div style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 12, color: '#A0A0A0', lineHeight: 1.6 }}>🛵 Cuando tengas las credenciales reales de PedidosYa, Rappi o Uber Eats, y la base de datos conectada, los pedidos entrantes van a aparecer en tu <Link href="/cocina" style={{ color: '#8B5CF6' }}>pantalla de cocina</Link> junto a los de salón, identificados con su propio badge.</p>
        </div>

        {deliveryIntegraciones.map(d => {
          const logo = LOGOS[d.plataforma]
          return (
            <div key={d.id} style={{ background: '#141414', border: d.conectado ? '1px solid rgba(34,197,94,0.3)' : '1px solid #2A2A2A', borderRadius: 16, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${logo.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{logo.emoji}</div>
                  <div>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{d.nombre}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#707070' }}>Comisión estimada: {d.comision_porcentaje}%</p>
                  </div>
                </div>
                <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 100, background: d.conectado ? 'rgba(34,197,94,0.12)' : '#1C1C1C', color: d.conectado ? '#22C55E' : '#707070' }}>{d.conectado ? '🟢 Config. guardada' : '⚪ Sin configurar'}</span>
              </div>

              {editandoId === d.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input value={form.api_key} onChange={e => setForm({ ...form, api_key: e.target.value })} placeholder="API Key / Token" className="input-premium" />
                  <input value={form.webhook_url} onChange={e => setForm({ ...form, webhook_url: e.target.value })} placeholder="Webhook URL (opcional)" className="input-premium" />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleConectar(d.id)} disabled={conectando === d.id} className="btn-gold" style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', fontSize: 13, cursor: 'pointer' }}>{conectando === d.id ? 'Conectando...' : 'Conectar'}</button>
                    <button onClick={() => setEditandoId(null)} style={{ padding: '11px 16px', borderRadius: 10, background: '#2A2A2A', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
                  </div>
                </div>
              ) : (
                d.conectado
                  ? <button onClick={() => handleDesconectar(d.id)} style={{ width: '100%', padding: 10, borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444', fontSize: 12, cursor: 'pointer' }}>Desconectar</button>
                  : <button onClick={() => { setEditandoId(d.id); setForm({ api_key: d.api_key, webhook_url: d.webhook_url }) }} style={{ width: '100%', padding: 10, borderRadius: 10, background: '#1C1C1C', border: '1px solid #2A2A2A', color: '#A0A0A0', fontSize: 12, cursor: 'pointer' }}>🔌 Configurar y conectar</button>
              )}
            </div>
          )
        })}

        <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 14, padding: 14, marginTop: 8 }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600 }}>🔗 Webhook genérico para recibir pedidos</p>
          <div style={{ background: '#0A0A0A', borderRadius: 10, padding: 12, marginBottom: 8 }}>
            <code style={{ fontSize: 11, color: '#22C55E', wordBreak: 'break-all' }}>POST /api/webhook/delivery</code>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: '#707070', lineHeight: 1.6 }}>Cualquier plataforma que no esté en la lista puede integrarse apuntando su webhook de pedidos a esta URL — el pedido se inyecta directo en la cocina con el origen marcado.</p>
        </div>
      </div>
    </div>
  )
}
