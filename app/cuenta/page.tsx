'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowLeft, Award, Gift, LogOut, Mail, Phone, Sparkles, User } from 'lucide-react'
import { useStore } from '@/lib/store'
import { withBasePath } from '@/lib/base-path'
import { definicionDeRango, progresoAlSiguienteRango, RANGOS, type RangoCliente } from '@/lib/rangos'
import PublicThemeToggle from '@/components/menu/PublicThemeToggle'
import Footer from '@/components/Footer'

// Área del comensal: fuera del backoffice, con la misma identidad que la carta.
// El staff entra por /login; acá no hay nada de operación, sólo la cuenta de
// quien viene a comer.

interface ClientePublico {
  email: string
  nombre: string
  telefono: string | null
  puntos: number
  rango: RangoCliente
  created_at: string
  ultima_visita: string | null
}

interface Movimiento {
  id: string
  puntos: number
  motivo: string
  created_at: string
}

type Vista = 'cargando' | 'acceso' | 'cuenta'
type RespuestaCuenta = { ok?: boolean; cliente?: ClientePublico; movimientos?: Movimiento[]; error?: string }

export default function CuentaPage() {
  const { config, recompensasFidelidad } = useStore()
  const [vista, setVista] = useState<Vista>('cargando')
  const [modo, setModo] = useState<'login' | 'registro'>('login')
  const [cliente, setCliente] = useState<ClientePublico | null>(null)
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', nombre: '', telefono: '' })

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(withBasePath('/api/cuenta/me'), { cache: 'no-store' })
      if (res.ok) {
        const datos = await res.json() as RespuestaCuenta
        setCliente(datos.cliente || null)
        setMovimientos(datos.movimientos || [])
        setVista('cuenta')
        return
      }
    } catch {
      // Sin servidor (vista previa estática): se muestra el formulario igual.
    }
    setVista('acceso')
  }, [])

  useEffect(() => {
    void (async () => { await cargar() })()
  }, [cargar])

  const enviar = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setEnviando(true)
    try {
      const ruta = modo === 'login' ? '/api/cuenta/login' : '/api/cuenta/registro'
      const cuerpo = modo === 'login'
        ? { email: form.email, password: form.password }
        : form
      const res = await fetch(withBasePath(ruta), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      })
      const datos = await res.json().catch(() => ({})) as RespuestaCuenta
      if (!res.ok || !datos.ok) {
        setError(datos.error || 'No pudimos completar la operación.')
        return
      }
      setForm({ email: '', password: '', nombre: '', telefono: '' })
      await cargar()
    } catch {
      setError('No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  const salir = async () => {
    await fetch(withBasePath('/api/cuenta/logout'), { method: 'POST' }).catch(() => {})
    setCliente(null)
    setMovimientos([])
    setVista('acceso')
  }

  return (
    <div className="messa-cuenta-page">
      <header className="messa-cuenta-topbar">
        <Link href="/" className="messa-cuenta-back" aria-label="Volver a la carta"><ArrowLeft size={18} /><span>Carta</span></Link>
        <strong className="font-titulos">{config.nombre}</strong>
        <PublicThemeToggle />
      </header>

      {vista === 'cargando' && <div className="messa-cuenta-loading" role="status">Cargando tu cuenta…</div>}

      {vista === 'acceso' && (
        <main className="messa-cuenta-main">
          <section className="messa-cuenta-hero">
            <span className="messa-cuenta-eyebrow"><Sparkles size={14} /> Programa de fidelidad</span>
            <h1 className="font-titulos">Sumá puntos en cada visita</h1>
            <p>Creá tu cuenta y acumulá puntos cada vez que comés con nosotros. Subís de rango solo, sin tarjetas ni plásticos.</p>
            <ul className="messa-cuenta-rangos">
              {RANGOS.map(rango => (
                <li key={rango.rango}>
                  <span className="messa-cuenta-rango-punto" style={{ background: rango.color }} aria-hidden="true" />
                  <div><b>{rango.label}</b><small>{rango.desde === 0 ? 'Desde el primer pedido' : `Desde ${rango.desde} puntos`} · {rango.beneficio}</small></div>
                </li>
              ))}
            </ul>
          </section>

          <form className="messa-cuenta-form" onSubmit={enviar}>
            <div className="messa-cuenta-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={modo === 'login'} className={modo === 'login' ? 'active' : ''} onClick={() => { setModo('login'); setError('') }}>Entrar</button>
              <button type="button" role="tab" aria-selected={modo === 'registro'} className={modo === 'registro' ? 'active' : ''} onClick={() => { setModo('registro'); setError('') }}>Crear cuenta</button>
            </div>

            {modo === 'registro' && (
              <>
                <label className="messa-cuenta-campo">
                  <span><User size={15} aria-hidden="true" /> Nombre</span>
                  <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} autoComplete="name" required placeholder="Cómo te llamamos" />
                </label>
                <label className="messa-cuenta-campo">
                  <span><Phone size={15} aria-hidden="true" /> Teléfono <small>opcional</small></span>
                  <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} autoComplete="tel" inputMode="tel" placeholder="Para avisarte de tu reserva" />
                </label>
              </>
            )}

            <label className="messa-cuenta-campo">
              <span><Mail size={15} aria-hidden="true" /> Email</span>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} autoComplete="email" inputMode="email" required placeholder="tu@email.com" />
            </label>

            <label className="messa-cuenta-campo">
              <span>Contraseña</span>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} autoComplete={modo === 'login' ? 'current-password' : 'new-password'} required minLength={modo === 'registro' ? 8 : undefined} placeholder={modo === 'registro' ? 'Al menos 8 caracteres' : '••••••••'} />
            </label>

            {error && <p className="messa-cuenta-error" role="alert">{error}</p>}

            <button type="submit" className="messa-cuenta-submit" disabled={enviando}>
              {enviando ? 'Un momento…' : modo === 'login' ? 'Entrar a mi cuenta' : 'Crear mi cuenta'}
            </button>

            <p className="messa-cuenta-nota">¿Trabajás acá? El acceso del equipo es <Link href="/login">por esta puerta</Link>.</p>
          </form>
        </main>
      )}

      {vista === 'cuenta' && cliente && (
        <main className="messa-cuenta-main messa-cuenta-main--activa">
          <TarjetaSocio cliente={cliente} />

          <section className="messa-cuenta-panel">
            <h2 className="font-titulos">Recompensas</h2>
            {recompensasFidelidad.filter(r => r.activa).length === 0
              ? <p className="messa-cuenta-vacio">Todavía no hay recompensas cargadas.</p>
              : (
                <ul className="messa-cuenta-recompensas">
                  {recompensasFidelidad.filter(r => r.activa).map(recompensa => {
                    const alcanza = cliente.puntos >= recompensa.puntos_requeridos
                    return (
                      <li key={recompensa.id} className={alcanza ? 'alcanzada' : ''}>
                        <span className="messa-cuenta-recompensa-icono"><Gift size={17} aria-hidden="true" /></span>
                        <div><b>{recompensa.nombre}</b><small>{recompensa.descripcion}</small></div>
                        <span className="messa-cuenta-recompensa-puntos">
                          {alcanza ? 'Disponible' : `Faltan ${recompensa.puntos_requeridos - cliente.puntos}`}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            <p className="messa-cuenta-vacio">Pedí tu canje al mozo: lo aplica desde el sistema y te descuenta los puntos.</p>
          </section>

          <section className="messa-cuenta-panel">
            <h2 className="font-titulos">Movimientos</h2>
            {movimientos.length === 0
              ? <p className="messa-cuenta-vacio">Cuando cierres tu primera cuenta vas a ver acá tus puntos.</p>
              : (
                <ul className="messa-cuenta-movimientos">
                  {movimientos.map(movimiento => (
                    <li key={movimiento.id}>
                      <div><b>{movimiento.motivo}</b><small>{new Date(movimiento.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</small></div>
                      <span className={movimiento.puntos >= 0 ? 'suma' : 'resta'}>{movimiento.puntos >= 0 ? '+' : ''}{movimiento.puntos}</span>
                    </li>
                  ))}
                </ul>
              )}
          </section>

          <button type="button" className="messa-cuenta-salir" onClick={salir}><LogOut size={16} aria-hidden="true" /> Cerrar sesión</button>
        </main>
      )}

      <Footer nombre={config.nombre} />
    </div>
  )
}

function TarjetaSocio({ cliente }: { cliente: ClientePublico }) {
  const definicion = definicionDeRango(cliente.rango)
  const progreso = progresoAlSiguienteRango(cliente.puntos)

  return (
    <section className="messa-cuenta-tarjeta" style={{ '--rango-color': definicion.color } as React.CSSProperties}>
      <header>
        <span className="messa-cuenta-eyebrow"><Award size={14} aria-hidden="true" /> {definicion.label}</span>
        <strong className="font-titulos">{cliente.nombre}</strong>
        <small>{cliente.email}</small>
      </header>
      <div className="messa-cuenta-puntos">
        <b>{cliente.puntos.toLocaleString('es-AR')}</b>
        <span>puntos</span>
      </div>
      <p className="messa-cuenta-beneficio">{definicion.beneficio}</p>
      {progreso && (
        <div className="messa-cuenta-progreso">
          <div className="messa-cuenta-progreso-barra"><i style={{ width: `${progreso.porcentaje}%` }} /></div>
          <small>Te faltan <b>{progreso.faltan.toLocaleString('es-AR')}</b> puntos para {progreso.siguiente.label}</small>
        </div>
      )}
    </section>
  )
}
