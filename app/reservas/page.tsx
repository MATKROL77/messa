'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useStore, Reserva } from '@/lib/store'
import { tiempoTranscurrido } from '@/lib/utils'

export default function ReservasPage() {
  const { reservas, crearReserva, cancelarReserva, confirmarReserva, sucursalActualId } = useStore()
  const [tab, setTab] = useState<'hoy' | 'nueva'>('hoy')
  const [form, setForm] = useState({ nombre: '', telefono: '', email: '', fecha: '', hora: '', personas: '2', notas: '' })
  const [exito, setExito] = useState(false)

  const reservasHoy = reservas.filter(r => {
    const hoy = new Date().toISOString().split('T')[0]
    const esHoy = r.fecha === hoy || r.fecha === ''
    const esSucursal = !r.sucursal_id || r.sucursal_id === sucursalActualId
    return esHoy && esSucursal
  })

  const handleSubmit = () => {
    if (!form.nombre || !form.hora || !form.personas) return
    crearReserva({
      nombre: form.nombre,
      telefono: form.telefono,
      email: form.email,
      fecha: form.fecha || new Date().toISOString().split('T')[0],
      hora: form.hora,
      personas: parseInt(form.personas),
      notas: form.notas,
      sucursal_id: sucursalActualId,
    })
    setExito(true)
    setForm({ nombre: '', telefono: '', email: '', fecha: '', hora: '', personas: '2', notas: '' })
    setTimeout(() => { setExito(false); setTab('hoy') }, 2000)
  }

  const colorEstado: Record<Reserva['estado'], string> = {
    pendiente: '#F59E0B',
    confirmada: '#22C55E',
    cancelada: '#EF4444',
    completada: '#707070',
  }

  const bgEstado: Record<Reserva['estado'], string> = {
    pendiente: 'rgba(245,158,11,0.1)',
    confirmada: 'rgba(34,197,94,0.1)',
    cancelada: 'rgba(239,68,68,0.1)',
    completada: 'rgba(112,112,112,0.1)',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: '#0A0A0A', borderBottom: '1px solid #1C1C1C', padding: '16px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Reservas</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707070' }}>Kansas Steakhouse · Hoy {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <Link href="/" style={{ textDecoration: 'none', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#A0A0A0' }}>
            ← Inicio
          </Link>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[{ val: 'hoy', label: `📅 Hoy (${reservasHoy.length})` }, { val: 'nueva', label: '+ Nueva reserva' }].map(t => (
            <button key={t.val} onClick={() => setTab(t.val as 'hoy' | 'nueva')} style={{
              flex: 1, padding: '10px', borderRadius: 12, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              background: tab === t.val ? 'rgba(212,175,55,0.15)' : '#1C1C1C',
              color: tab === t.val ? '#D4AF37' : '#A0A0A0',
              border: tab === t.val ? '1px solid rgba(212,175,55,0.4)' : '1px solid #2A2A2A',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {/* ── HOY ── */}
        {tab === 'hoy' && (
          <>
            {/* Resumen */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Confirmadas', val: reservasHoy.filter(r => r.estado === 'confirmada').length, color: '#22C55E' },
                { label: 'Pendientes', val: reservasHoy.filter(r => r.estado === 'pendiente').length, color: '#F59E0B' },
                { label: 'Personas', val: reservasHoy.filter(r => r.estado !== 'cancelada').reduce((a, r) => a + r.personas, 0), color: '#3B82F6' },
              ].map(s => (
                <div key={s.label} style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: s.color }}>{s.val}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#707070' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {reservasHoy.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#707070' }}>
                <p style={{ fontSize: 40, margin: '0 0 12px' }}>📅</p>
                <p>Sin reservas para hoy</p>
              </div>
            )}

            {/* Ordenadas por hora */}
            {[...reservasHoy].sort((a, b) => a.hora.localeCompare(b.hora)).map(reserva => (
              <div key={reserva.id} style={{ background: '#141414', border: `1px solid ${bgEstado[reserva.estado]}`, borderRadius: 16, padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: '#D4AF37' }}>{reserva.hora}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100, background: bgEstado[reserva.estado], color: colorEstado[reserva.estado], fontWeight: 500 }}>
                        {reserva.estado}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{reserva.nombre}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707070' }}>👥 {reserva.personas} personas · {reserva.telefono}</p>
                    {reserva.notas && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#A0A0A0' }}>📝 {reserva.notas}</p>}
                  </div>
                  <span style={{ fontSize: 12, color: '#707070' }}>{tiempoTranscurrido(reserva.created_at)}</span>
                </div>

                {reserva.estado !== 'cancelada' && reserva.estado !== 'completada' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    {reserva.estado === 'pendiente' && (
                      <button onClick={() => confirmarReserva(reserva.id)} style={{ flex: 1, padding: 9, borderRadius: 10, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22C55E', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        ✓ Confirmar
                      </button>
                    )}
                    <button onClick={() => cancelarReserva(reserva.id)} style={{ flex: 1, padding: 9, borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: 12, cursor: 'pointer' }}>
                      ✕ Cancelar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* ── NUEVA RESERVA ── */}
        {tab === 'nueva' && (
          <>
            {exito ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <p style={{ fontSize: 56, margin: '0 0 12px' }}>✅</p>
                <h2 style={{ margin: 0, fontSize: 22 }}>¡Reserva creada!</h2>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Datos del cliente</p>
                {[
                  { key: 'nombre', label: 'Nombre completo *', type: 'text', placeholder: 'Ej: Martín García' },
                  { key: 'telefono', label: 'Teléfono', type: 'tel', placeholder: '11 1234-5678' },
                  { key: 'email', label: 'Email', type: 'email', placeholder: 'cliente@mail.com' },
                ].map(f => (
                  <div key={f.key}>
                    <p style={{ margin: '0 0 6px', fontSize: 12, color: '#707070' }}>{f.label}</p>
                    <input
                      type={f.type}
                      value={form[f.key as keyof typeof form]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      style={{ width: '100%', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 12, padding: '11px 14px', color: '#fff', fontSize: 14 }}
                    />
                  </div>
                ))}

                <p style={{ fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '8px 0 0' }}>Detalles</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <p style={{ margin: '0 0 6px', fontSize: 12, color: '#707070' }}>Fecha *</p>
                    <input type="date" value={form.fecha} onChange={e => setForm(prev => ({ ...prev, fecha: e.target.value }))}
                      style={{ width: '100%', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 12, padding: '11px 14px', color: '#fff', fontSize: 14 }} />
                  </div>
                  <div>
                    <p style={{ margin: '0 0 6px', fontSize: 12, color: '#707070' }}>Hora *</p>
                    <input type="time" value={form.hora} onChange={e => setForm(prev => ({ ...prev, hora: e.target.value }))}
                      style={{ width: '100%', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 12, padding: '11px 14px', color: '#fff', fontSize: 14 }} />
                  </div>
                </div>

                <div>
                  <p style={{ margin: '0 0 6px', fontSize: 12, color: '#707070' }}>Personas *</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['1', '2', '3', '4', '5', '6', '8', '10+'].map(n => (
                      <button key={n} onClick={() => setForm(prev => ({ ...prev, personas: n.replace('+', '') }))}
                        style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, cursor: 'pointer',
                          background: form.personas === n.replace('+', '') ? 'rgba(212,175,55,0.15)' : '#1C1C1C',
                          color: form.personas === n.replace('+', '') ? '#D4AF37' : '#A0A0A0',
                          border: form.personas === n.replace('+', '') ? '1px solid rgba(212,175,55,0.4)' : '1px solid #2A2A2A',
                        }}>{n}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <p style={{ margin: '0 0 6px', fontSize: 12, color: '#707070' }}>Notas especiales</p>
                  <textarea value={form.notas} onChange={e => setForm(prev => ({ ...prev, notas: e.target.value }))}
                    placeholder="Alergias, ocasión especial, preferencias..." rows={3}
                    style={{ width: '100%', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 12, padding: '11px 14px', color: '#fff', fontSize: 14, resize: 'none' }} />
                </div>

                <button onClick={handleSubmit} className="btn-gold" style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', fontSize: 15, cursor: 'pointer', marginTop: 8 }}>
                  Crear reserva
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
