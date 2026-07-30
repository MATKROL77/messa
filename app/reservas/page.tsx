'use client'

import { useState } from 'react'
import { CalendarCheck, CalendarClock, Check, Clock3, Plus, UserRoundCheck, UsersRound, X } from 'lucide-react'
import AdminOperationShell from '@/components/admin-operation-shell'
import { useStore } from '@/lib/store'
import { AdminButton, AdminEmpty, AdminMetric, AdminPanel, AdminSheet, AdminStatus, AdminToast, AdminWorkspace } from '@/components/admin/admin-ui'

export default function ReservasPage() {
  const { reservas, crearReserva, cancelarReserva, confirmarReserva, sucursalActualId, sucursales } = useStore()
  const [creando, setCreando] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ nombre: '', telefono: '', email: '', fecha: new Date().toISOString().slice(0, 10), hora: '', personas: 2, notas: '' })
  const hoy = new Date().toISOString().slice(0, 10)
  const sucursal = sucursales.find(item => item.id === sucursalActualId)
  const reservasSucursal = reservas.filter(reserva => (!reserva.sucursal_id || reserva.sucursal_id === sucursalActualId) && reserva.fecha === hoy)
  const confirmadas = reservasSucursal.filter(reserva => reserva.estado === 'confirmada')
  const pendientes = reservasSucursal.filter(reserva => reserva.estado === 'pendiente')
  const personas = reservasSucursal.filter(reserva => reserva.estado !== 'cancelada').reduce((total, reserva) => total + reserva.personas, 0)
  const proxima = [...reservasSucursal].filter(reserva => reserva.estado !== 'cancelada').sort((a, b) => a.hora.localeCompare(b.hora))[0]

  const showToast = (mensaje: string) => {
    setToast(mensaje)
    window.setTimeout(() => setToast(''), 2300)
  }

  const crear = () => {
    if (!form.nombre.trim() || !form.hora) return showToast('Completá nombre y hora')
    crearReserva({ ...form, sucursal_id: sucursalActualId })
    setForm({ nombre: '', telefono: '', email: '', fecha: hoy, hora: '', personas: 2, notas: '' })
    setCreando(false)
    showToast('Reserva creada')
  }

  return (
    <AdminOperationShell>
      <AdminWorkspace
        eyebrow="Agenda del salón"
        title="Reservas"
        description={`Llegadas, confirmaciones y capacidad prevista para hoy en ${sucursal?.nombre || 'la sucursal actual'}.`}
        actions={<AdminButton tone="primary" icon={Plus} onClick={() => setCreando(true)}>Nueva reserva</AdminButton>}
      >
        <AdminToast>{toast}</AdminToast>

        <div className="messa-metrics">
          <AdminMetric label="Reservas de hoy" value={`${reservasSucursal.length}`} detail={proxima ? `Próxima a las ${proxima.hora}` : 'Agenda disponible'} Icon={CalendarCheck} tone="gold" progress={Math.min(100, reservasSucursal.length * 10)} />
          <AdminMetric label="Confirmadas" value={`${confirmadas.length}`} detail="Llegadas aseguradas" Icon={UserRoundCheck} tone="green" progress={(confirmadas.length / Math.max(reservasSucursal.length, 1)) * 100} />
          <AdminMetric label="Pendientes" value={`${pendientes.length}`} detail="Requieren contacto" Icon={CalendarClock} tone={pendientes.length ? 'amber' : 'green'} progress={(pendientes.length / Math.max(reservasSucursal.length, 1)) * 100} />
          <AdminMetric label="Cubiertos previstos" value={`${personas}`} detail="Personas no canceladas" Icon={UsersRound} tone="blue" progress={Math.min(100, (personas / 80) * 100)} />
        </div>

        <div className="messa-reservations-layout">
          <AdminPanel eyebrow="Hoy" title="Línea de llegadas" detail={new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}>
            {reservasSucursal.length ? (
              <div className="messa-reservation-timeline">
                {[...reservasSucursal].sort((a, b) => a.hora.localeCompare(b.hora)).map(reserva => {
                  const tone = reserva.estado === 'confirmada' ? 'green' : reserva.estado === 'pendiente' ? 'amber' : reserva.estado === 'cancelada' ? 'rose' : 'blue'
                  return (
                    <article key={reserva.id}>
                      <time>{reserva.hora}</time>
                      <i className={`messa-reservation-dot messa-reservation-dot--${tone}`} />
                      <div>
                        <header><span><b>{reserva.nombre}</b><small>{reserva.personas} personas · {reserva.telefono || 'sin teléfono'}</small></span><AdminStatus tone={tone}>{reserva.estado}</AdminStatus></header>
                        {reserva.notas && <p>{reserva.notas}</p>}
                        {['pendiente', 'confirmada'].includes(reserva.estado) && <footer>{reserva.estado === 'pendiente' && <AdminButton tone="neutral" icon={Check} onClick={() => { confirmarReserva(reserva.id); showToast('Reserva confirmada') }}>Confirmar</AdminButton>}<AdminButton tone="quiet" icon={X} onClick={() => { cancelarReserva(reserva.id); showToast('Reserva cancelada') }}>Cancelar</AdminButton></footer>}
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : <AdminEmpty Icon={CalendarCheck} title="Agenda despejada" description="No hay reservas cargadas para hoy." action={<AdminButton tone="neutral" icon={Plus} onClick={() => setCreando(true)}>Crear reserva</AdminButton>} />}
          </AdminPanel>

          <AdminPanel eyebrow="Capacidad" title="Pulso del servicio" detail="Distribución prevista por hora.">
            <div className="messa-capacity-bars">
              {['19:00', '20:00', '21:00', '22:00', '23:00'].map(hora => {
                const valor = reservasSucursal.filter(reserva => reserva.hora.startsWith(hora.slice(0, 2)) && reserva.estado !== 'cancelada').reduce((total, reserva) => total + reserva.personas, 0)
                return <div key={hora}><span><b>{hora}</b><small>{valor} cubiertos</small></span><i><b style={{ height: `${Math.max(6, Math.min(100, (valor / 24) * 100))}%` }} /></i></div>
              })}
            </div>
            <div className="messa-service-note"><Clock3 size={16} /><span><b>Ventana sugerida</b><small>{personas > 45 ? 'Refuerzo recomendado entre 21 y 22 h.' : 'Capacidad operativa dentro del rango.'}</small></span></div>
          </AdminPanel>
        </div>

        <AdminSheet open={creando} onClose={() => setCreando(false)} eyebrow="Nueva llegada" title="Crear reserva" footer={<><AdminButton tone="neutral" onClick={() => setCreando(false)}>Cancelar</AdminButton><AdminButton tone="primary" onClick={crear}>Confirmar reserva</AdminButton></>}>
          <div className="messa-product-form">
            <Field label="Nombre" wide><input className="input-premium" value={form.nombre} onChange={event => setForm({ ...form, nombre: event.target.value })} /></Field>
            <Field label="Teléfono"><input className="input-premium" value={form.telefono} onChange={event => setForm({ ...form, telefono: event.target.value })} /></Field>
            <Field label="Email"><input className="input-premium" type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></Field>
            <Field label="Fecha"><input className="input-premium" type="date" value={form.fecha} onChange={event => setForm({ ...form, fecha: event.target.value })} /></Field>
            <Field label="Hora"><input className="input-premium" type="time" value={form.hora} onChange={event => setForm({ ...form, hora: event.target.value })} /></Field>
            <Field label="Personas" wide><div className="messa-people-picker">{[1, 2, 3, 4, 5, 6, 8, 10].map(valor => <button type="button" className={form.personas === valor ? 'active' : ''} key={valor} onClick={() => setForm({ ...form, personas: valor })}>{valor}</button>)}</div></Field>
            <Field label="Notas" wide><textarea className="input-premium" rows={3} value={form.notas} onChange={event => setForm({ ...form, notas: event.target.value })} /></Field>
          </div>
        </AdminSheet>
      </AdminWorkspace>
    </AdminOperationShell>
  )
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <div className={`messa-form-field${wide ? ' messa-form-field--wide' : ''}`}><label>{label}</label>{children}</div>
}
