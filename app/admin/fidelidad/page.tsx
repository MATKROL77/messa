'use client'

import { useCallback, useEffect, useState } from 'react'
import { Award, Coins, Gift, Plus, Save, Star, Trash2, UsersRound } from 'lucide-react'
import { AdminButton, AdminEmpty, AdminMetric, AdminPanel, AdminSheet, AdminStatus, AdminToast, AdminWorkspace } from '@/components/admin/admin-ui'
import { useStore } from '@/lib/store'
import { definicionDeRango, type RangoCliente } from '@/lib/rangos'
import { withBasePath } from '@/lib/base-path'

interface ClienteRegistrado {
  email: string
  nombre: string
  telefono: string | null
  puntos: number
  rango: RangoCliente
  ultima_visita: string | null
}

type RespuestaPadron = { ok?: boolean; clientes?: ClienteRegistrado[]; error?: string }

export default function FidelidadPage() {
  const {
    fidelidadConfig,
    actualizarFidelidadConfig,
    recompensasFidelidad,
    agregarRecompensa,
    eliminarRecompensa,
    otorgarPuntos,
    puntosClientes,
  } = useStore()
  const [form, setForm] = useState(fidelidadConfig)
  const [ajuste, setAjuste] = useState({ email: '', puntos: 100 })
  const [creandoRecompensa, setCreandoRecompensa] = useState(false)
  const [nuevaRecompensa, setNuevaRecompensa] = useState({ nombre: '', descripcion: '', puntos_requeridos: 100, activa: true })
  const [toast, setToast] = useState('')
  const clientesTop = Object.entries(puntosClientes).sort((a, b) => b[1] - a[1]).slice(0, 10)

  // Cuentas reales (tabla `clientes` de Supabase). Conviven con el ranking
  // local de arriba: ese sale de los pagos registrados en este navegador, éste
  // es el padrón compartido entre todos los dispositivos.
  const [registrados, setRegistrados] = useState<ClienteRegistrado[]>([])
  const [estadoPadron, setEstadoPadron] = useState<'cargando' | 'listo' | 'sin-base'>('cargando')
  const [avisoPadron, setAvisoPadron] = useState('')

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }

  const cargarRegistrados = useCallback(async () => {
    try {
      const res = await fetch(withBasePath('/api/admin/clientes'), { cache: 'no-store' })
      const datos = await res.json().catch(() => ({})) as RespuestaPadron
      if (res.ok && datos.ok) {
        setRegistrados(datos.clientes || [])
        setEstadoPadron('listo')
        setAvisoPadron('')
        return
      }
      setEstadoPadron('sin-base')
      setAvisoPadron(datos.error || 'No pudimos leer el padrón de clientes.')
    } catch {
      setEstadoPadron('sin-base')
      setAvisoPadron('No pudimos conectarnos con la base de datos.')
    }
  }, [])

  // El padrón se pide una vez al abrir el módulo. La carga va dentro de una
  // función async declarada en el efecto (mismo patrón que /admin/mesas): así el
  // estado se actualiza cuando responde la red, no en el render.
  useEffect(() => {
    void (async () => { await cargarRegistrados() })()
  }, [cargarRegistrados])

  const handleGuardar = () => {
    actualizarFidelidadConfig(form)
    showToast('Reglas de fidelidad guardadas')
  }

  const handleCrearRecompensa = () => {
    if (!nuevaRecompensa.nombre.trim()) {
      showToast('Ingresá un nombre')
      return
    }
    agregarRecompensa(nuevaRecompensa)
    setNuevaRecompensa({ nombre: '', descripcion: '', puntos_requeridos: 100, activa: true })
    setCreandoRecompensa(false)
    showToast('Recompensa creada')
  }

  return (
    <AdminWorkspace
      eyebrow="Relación con clientes"
      title="Programa de fidelidad"
      description="Convertí compras y reseñas verificadas en una experiencia de retorno medible."
      actions={(
        <>
          <AdminStatus tone={form.habilitado ? 'green' : 'neutral'}>{form.habilitado ? 'Programa activo' : 'Programa pausado'}</AdminStatus>
          <AdminButton tone="primary" icon={Save} onClick={handleGuardar}>Guardar reglas</AdminButton>
        </>
      )}
    >
      <AdminToast>{toast}</AdminToast>

      <section className="messa-metrics">
        <AdminMetric label="Cuentas registradas" value={`${registrados.length}`} detail={`${Object.keys(puntosClientes).length} saldos locales sin cuenta`} Icon={UsersRound} tone="blue" progress={Math.min(100, registrados.length * 4)} />
        <AdminMetric label="Recompensas" value={`${recompensasFidelidad.length}`} detail="Beneficios configurados" Icon={Gift} tone="gold" progress={Math.min(100, recompensasFidelidad.length * 16)} />
        <AdminMetric label="Por reseña" value={`${form.puntos_por_resena} pts`} detail="Sólo después de pagar" Icon={Star} tone="amber" progress={Math.min(100, form.puntos_por_resena)} />
        <AdminMetric label="Cada $1.000" value={`${form.puntos_por_1000_gastado} pts`} detail="Por consumo cobrado" Icon={Coins} tone="green" progress={Math.min(100, form.puntos_por_1000_gastado * 5)} />
      </section>

      <div className="messa-two-column">
        <AdminPanel eyebrow="Reglas del programa" title="Cómo se obtienen puntos" detail="Estos valores se aplican a las próximas operaciones.">
          <label className="messa-switch-row">
            <span><b>Programa disponible</b><small>Permite acumular y canjear puntos.</small></span>
            <input type="checkbox" checked={form.habilitado} onChange={event => setForm(current => ({ ...current, habilitado: event.target.checked }))} />
          </label>
          <div className="messa-form-grid">
            <label><span>Puntos por reseña verificada</span><input type="number" min={0} value={form.puntos_por_resena} onChange={event => setForm(current => ({ ...current, puntos_por_resena: Number.parseInt(event.target.value) || 0 }))} /></label>
            <label><span>Puntos por cada $1.000</span><input type="number" min={0} value={form.puntos_por_1000_gastado} onChange={event => setForm(current => ({ ...current, puntos_por_1000_gastado: Number.parseInt(event.target.value) || 0 }))} /></label>
          </div>
          <p className="messa-form-help">Con la regla actual, un consumo de $10.000 suma {form.puntos_por_1000_gastado * 10} puntos.</p>
        </AdminPanel>

        <AdminPanel eyebrow="Actividad" title="Clientes destacados" detail="Ranking local por saldo de puntos.">
          {clientesTop.length ? (
            <div className="messa-ranking">
              {clientesTop.map(([email, points], index) => (
                <div key={email}><span>{index + 1}</span><p><b>{email}</b><small>Cliente identificado</small></p><strong>{points} pts</strong></div>
              ))}
            </div>
          ) : (
            <AdminEmpty Icon={Award} title="Todavía no hay saldos" description="Los clientes aparecen cuando pagan con email y acumulan sus primeros puntos." />
          )}

          {/* Ajuste manual: hace falta para canjear una recompensa (restando
              puntos) o compensar a un cliente sin tener que tocar la base. */}
          <div className="messa-loyalty-adjust">
            <p className="messa-kicker">Ajuste manual de saldo</p>
            <div className="messa-form-grid">
              <label><span>Email del cliente</span><input type="email" value={ajuste.email} onChange={event => setAjuste(current => ({ ...current, email: event.target.value }))} placeholder="cliente@email.com" autoComplete="off" /></label>
              <label><span>Puntos (negativo para canjear)</span><input type="number" value={ajuste.puntos} onChange={event => setAjuste(current => ({ ...current, puntos: Number.parseInt(event.target.value) || 0 }))} /></label>
            </div>
            <AdminButton tone="neutral" icon={Coins} onClick={async () => {
              const email = ajuste.email.trim().toLowerCase()
              if (!email.includes('@')) { showToast('Ingresá un email válido'); return }
              if (!ajuste.puntos) { showToast('Indicá cuántos puntos sumar o restar'); return }

              // Si el cliente tiene cuenta, el ajuste va a la base y lo ve en
              // su celular. Si no, queda el saldo local de siempre.
              if (registrados.some(cliente => cliente.email === email)) {
                const res = await fetch(withBasePath('/api/admin/clientes'), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email, puntos: ajuste.puntos, motivo: 'Ajuste desde el backoffice' }),
                }).catch(() => null)
                const datos = await res?.json().catch(() => ({})) as RespuestaPadron | undefined
                if (!res?.ok || !datos?.ok) { showToast(datos?.error || 'No pudimos aplicar el ajuste'); return }
                await cargarRegistrados()
              } else {
                otorgarPuntos(email, ajuste.puntos)
              }
              showToast(`${ajuste.puntos > 0 ? '+' : ''}${ajuste.puntos} puntos para ${email}`)
              setAjuste({ email: '', puntos: 100 })
            }}>Aplicar ajuste</AdminButton>
          </div>
        </AdminPanel>
      </div>

      <AdminPanel
        eyebrow="Padrón compartido"
        title="Cuentas de clientes"
        detail="Comensales registrados en /cuenta. A diferencia del ranking local, este padrón es el mismo en todos los dispositivos."
        action={<AdminButton tone="quiet" icon={UsersRound} onClick={cargarRegistrados}>Actualizar</AdminButton>}
      >
        {estadoPadron === 'cargando' && <p className="messa-form-help">Cargando el padrón…</p>}
        {estadoPadron === 'sin-base' && (
          <AdminEmpty Icon={UsersRound} title="El padrón todavía no está disponible" description={avisoPadron} />
        )}
        {estadoPadron === 'listo' && (registrados.length ? (
          <div className="messa-client-table" role="table">
            <div className="messa-client-row messa-client-row--header" role="row">
              <span role="columnheader">Cliente</span>
              <span role="columnheader">Rango</span>
              <span role="columnheader">Puntos</span>
              <span role="columnheader">Última visita</span>
            </div>
            {registrados.map(cliente => {
              const rango = definicionDeRango(cliente.rango)
              return (
                <div className="messa-client-row" role="row" key={cliente.email}>
                  <span role="cell"><b>{cliente.nombre}</b><small>{cliente.email}</small></span>
                  <span role="cell">
                    <em className="messa-client-rank" style={{ '--rango-color': rango.color } as React.CSSProperties}>{rango.label}</em>
                  </span>
                  <span role="cell"><strong>{cliente.puntos.toLocaleString('es-AR')}</strong></span>
                  <span role="cell">{cliente.ultima_visita ? new Date(cliente.ultima_visita).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : '—'}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <AdminEmpty Icon={UsersRound} title="Todavía no hay cuentas" description="Los comensales se registran desde /cuenta y aparecen acá al instante." />
        ))}
      </AdminPanel>

      <AdminPanel
        eyebrow="Catálogo de beneficios"
        title="Recompensas canjeables"
        detail="Definí objetivos simples y claros para fomentar la próxima visita."
        action={<AdminButton tone="primary" icon={Plus} onClick={() => setCreandoRecompensa(true)}>Nueva recompensa</AdminButton>}
      >
        {recompensasFidelidad.length ? (
          <div className="messa-reward-grid">
            {recompensasFidelidad.map(recompensa => (
              <article key={recompensa.id}>
                <span><Gift size={19} /></span>
                <div><h3>{recompensa.nombre}</h3><p>{recompensa.descripcion || 'Sin descripción'}</p><AdminStatus tone="gold">{recompensa.puntos_requeridos} puntos</AdminStatus></div>
                <button type="button" aria-label={`Eliminar ${recompensa.nombre}`} onClick={() => eliminarRecompensa(recompensa.id)}><Trash2 size={16} /></button>
              </article>
            ))}
          </div>
        ) : <AdminEmpty Icon={Gift} title="No hay recompensas" description="Creá el primer beneficio para que los clientes tengan un objetivo visible." />}
      </AdminPanel>

      <AdminSheet
        open={creandoRecompensa}
        onClose={() => setCreandoRecompensa(false)}
        title="Nueva recompensa"
        eyebrow="Beneficio canjeable"
        footer={(
          <>
            <AdminButton tone="quiet" onClick={() => setCreandoRecompensa(false)}>Cancelar</AdminButton>
            <AdminButton tone="primary" icon={Gift} onClick={handleCrearRecompensa}>Crear recompensa</AdminButton>
          </>
        )}
      >
        <div className="messa-form-stack">
          <label><span>Nombre</span><input value={nuevaRecompensa.nombre} onChange={event => setNuevaRecompensa(current => ({ ...current, nombre: event.target.value }))} placeholder="Postre de cortesía" /></label>
          <label><span>Descripción</span><textarea rows={3} value={nuevaRecompensa.descripcion} onChange={event => setNuevaRecompensa(current => ({ ...current, descripcion: event.target.value }))} placeholder="Qué incluye y cómo se canjea" /></label>
          <label><span>Puntos requeridos</span><input type="number" min={1} value={nuevaRecompensa.puntos_requeridos} onChange={event => setNuevaRecompensa(current => ({ ...current, puntos_requeridos: Number.parseInt(event.target.value) || 0 }))} /></label>
        </div>
      </AdminSheet>
    </AdminWorkspace>
  )
}
