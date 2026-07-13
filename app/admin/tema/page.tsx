'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'

const FUENTES = [
  { valor: "'Playfair Display', Georgia, serif", label: 'Playfair Display', desc: 'Elegante · serif clásica' },
  { valor: "'Inter', -apple-system, sans-serif", label: 'Inter', desc: 'Moderna · sans-serif limpia' },
  { valor: "Georgia, 'Times New Roman', serif", label: 'Georgia', desc: 'Tradicional · editorial' },
  { valor: "-apple-system, 'Segoe UI', sans-serif", label: 'Sistema', desc: 'Nativa del dispositivo' },
]

const PALETAS = [
  { nombre: 'Dorado Premium', primario: '#D4AF37', fondo: '#0A0A0A' },
  { nombre: 'Esmeralda', primario: '#10B981', fondo: '#0A0F0C' },
  { nombre: 'Borgoña', primario: '#B91C1C', fondo: '#0F0A0A' },
  { nombre: 'Zafiro', primario: '#3B82F6', fondo: '#0A0C14' },
  { nombre: 'Cobre', primario: '#C2703D', fondo: '#0F0C0A' },
  { nombre: 'Violeta Real', primario: '#8B5CF6', fondo: '#0C0A0F' },
]

export default function TemaPage() {
  const { tema, actualizarTema } = useStore()
  const [form, setForm] = useState(tema)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }
  const handleGuardar = () => { actualizarTema(form); showToast('Tema aplicado a toda la plataforma ✓') }
  const aplicarPaleta = (p: typeof PALETAS[0]) => setForm({ ...form, color_primario: p.primario, color_fondo: p.fondo })

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', paddingBottom: 40 }}>
      {toast && <div className="fade-in" style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', background: '#1C1C1C', border: '1px solid #383838', borderRadius: 100, padding: '10px 20px', fontSize: 13, color: '#fff', zIndex: 9999, whiteSpace: 'nowrap' }}>{toast}</div>}

      <div style={{ background: '#0A0A0A', borderBottom: '1px solid #1C1C1C', padding: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="font-titulos" style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Identidad de Marca</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707070' }}>Panel exclusivo del creador</p>
          </div>
          <Link href="/admin" style={{ textDecoration: 'none', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#A0A0A0' }}>← Admin</Link>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 14, padding: 14, marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: 12, color: '#707070', lineHeight: 1.6 }}>👑 Estos cambios se aplican <strong style={{ color: '#D4AF37' }}>en vivo a toda la plataforma</strong> — comensales y personal ven el nuevo diseño inmediatamente. Ideal para dar un look distinto a cada restaurante cliente que use este software (white-label).</p>
        </div>

        {/* Nombre de marca */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Nombre de la plataforma</p>
          <input value={form.nombre_marca} onChange={e => setForm({ ...form, nombre_marca: e.target.value })} className="input-premium" placeholder="MenuFlow" />
        </div>

        {/* Emoji logo */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ícono / emoji de marca</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['🍽️', '🍷', '🥩', '🍝', '⭐', '🔥', '👑', '🌟'].map(e => (
              <button key={e} onClick={() => setForm({ ...form, logo_emoji: e })} style={{ width: 44, height: 44, borderRadius: 12, fontSize: 20, cursor: 'pointer', background: form.logo_emoji === e ? 'rgba(212,175,55,0.15)' : '#1C1C1C', border: form.logo_emoji === e ? '1px solid rgba(212,175,55,0.4)' : '1px solid #2A2A2A' }}>{e}</button>
            ))}
          </div>
        </div>

        {/* Paletas predefinidas */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Paletas premium</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {PALETAS.map(p => (
              <button key={p.nombre} onClick={() => aplicarPaleta(p)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, cursor: 'pointer', background: form.color_primario === p.primario ? `${p.primario}15` : '#141414', border: form.color_primario === p.primario ? `1px solid ${p.primario}60` : '1px solid #2A2A2A' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: p.primario, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#fff' }}>{p.nombre}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Color personalizado */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: '#707070' }}>Color de marca</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" value={form.color_primario} onChange={e => setForm({ ...form, color_primario: e.target.value })} style={{ width: 44, height: 40, borderRadius: 10, border: '1px solid #2A2A2A', background: 'transparent', cursor: 'pointer' }} />
              <input value={form.color_primario} onChange={e => setForm({ ...form, color_primario: e.target.value })} className="input-premium" style={{ flex: 1 }} />
            </div>
          </div>
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: '#707070' }}>Color de fondo</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" value={form.color_fondo} onChange={e => setForm({ ...form, color_fondo: e.target.value })} style={{ width: 44, height: 40, borderRadius: 10, border: '1px solid #2A2A2A', background: 'transparent', cursor: 'pointer' }} />
              <input value={form.color_fondo} onChange={e => setForm({ ...form, color_fondo: e.target.value })} className="input-premium" style={{ flex: 1 }} />
            </div>
          </div>
        </div>

        {/* Tipografía */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tipografía de títulos</p>
          {FUENTES.map(f => (
            <button key={f.valor} onClick={() => setForm({ ...form, fuente_titulos: f.valor })} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '12px 14px', borderRadius: 12, marginBottom: 8, cursor: 'pointer', background: form.fuente_titulos === f.valor ? 'rgba(212,175,55,0.1)' : '#141414', border: form.fuente_titulos === f.valor ? '1px solid rgba(212,175,55,0.35)' : '1px solid #2A2A2A' }}>
              <div style={{ textAlign: 'left' }}>
                <p style={{ margin: 0, fontSize: 16, fontFamily: f.valor, color: '#fff' }}>{f.label}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#707070' }}>{f.desc}</p>
              </div>
              {form.fuente_titulos === f.valor && <span style={{ color: '#D4AF37' }}>✓</span>}
            </button>
          ))}
        </div>

        {/* Preview */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Vista previa en vivo</p>
          <div style={{ background: form.color_fondo, border: '1px solid #2A2A2A', borderRadius: 16, padding: 24, textAlign: 'center' }}>
            <p style={{ fontSize: 32, margin: '0 0 8px' }}>{form.logo_emoji}</p>
            <p style={{ fontFamily: form.fuente_titulos, fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 12px' }}>{form.nombre_marca}</p>
            <button style={{ background: `linear-gradient(135deg, ${form.color_primario} 0%, ${form.color_primario}CC 100%)`, color: '#000', border: 'none', borderRadius: 12, padding: '10px 20px', fontSize: 13, fontWeight: 600 }}>Botón de ejemplo</button>
          </div>
        </div>

        <button onClick={handleGuardar} className="btn-gold" style={{ width: '100%', padding: 15, borderRadius: 14, border: 'none', fontSize: 15, cursor: 'pointer' }}>Aplicar tema a toda la plataforma</button>
      </div>
    </div>
  )
}
