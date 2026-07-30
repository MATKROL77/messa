'use client'

import { useState } from 'react'
import { CheckCircle2, KeyRound, PlugZap, ShieldAlert, Truck, Unplug, Webhook } from 'lucide-react'
import { AdminButton, AdminPanel, AdminSheet, AdminStatus, AdminToast, AdminWorkspace } from '@/components/admin/admin-ui'
import { useStore } from '@/lib/store'

export default function IntegracionesPage() {
  const { deliveryIntegraciones, actualizarDeliveryIntegracion } = useStore()
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState({ api_key: '', webhook_url: '' })
  const [conectando, setConectando] = useState(false)
  const [toast, setToast] = useState('')
  const seleccionada = deliveryIntegraciones.find(integracion => integracion.id === editandoId) ?? null
  const conectadas = deliveryIntegraciones.filter(integracion => integracion.conectado).length

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }

  const openEditor = (id: string) => {
    const integracion = deliveryIntegraciones.find(item => item.id === id)
    if (!integracion) return
    setForm({ api_key: integracion.api_key, webhook_url: integracion.webhook_url })
    setEditandoId(id)
  }

  const handleConectar = () => {
    if (!seleccionada) return
    if (!form.api_key.trim()) {
      showToast('Ingresá una API key')
      return
    }
    setConectando(true)
    window.setTimeout(() => {
      actualizarDeliveryIntegracion(seleccionada.id, {
        api_key: form.api_key,
        webhook_url: form.webhook_url,
        conectado: true,
        ultima_conexion: new Date().toISOString(),
      })
      setConectando(false)
      setEditandoId(null)
      showToast('Configuración guardada')
    }, 700)
  }

  return (
    <AdminWorkspace
      eyebrow="Canales externos"
      title="Apps de delivery"
      description="Prepará cada canal para centralizar su operación en la misma cocina."
      actions={<AdminStatus tone={conectadas ? 'green' : 'neutral'}>{conectadas} de {deliveryIntegraciones.length} configuradas</AdminStatus>}
    >
      <AdminToast>{toast}</AdminToast>

      <AdminPanel className="messa-info-callout" eyebrow="Estado real" title="Conexión técnica pendiente">
        <div className="messa-info-callout__content">
          <span><ShieldAlert size={20} /></span>
          <p>MESSA ya dispone del endpoint receptor. La activación real requiere convenio comercial, credenciales oficiales y persistencia de servidor para cada plataforma.</p>
        </div>
      </AdminPanel>

      <section className="messa-integration-grid">
        {deliveryIntegraciones.map(integracion => (
          <AdminPanel key={integracion.id} className="messa-integration-card">
            <header>
              <span><Truck size={20} /></span>
              <div>
                <h2>{integracion.nombre}</h2>
                <p>Comisión estimada · {integracion.comision_porcentaje}%</p>
              </div>
              <AdminStatus tone={integracion.conectado ? 'green' : 'neutral'}>{integracion.conectado ? 'Configurada' : 'Sin configurar'}</AdminStatus>
            </header>
            <p>Los pedidos de este canal se identificarán por origen y compartirán el flujo de preparación del salón.</p>
            <footer>
              {integracion.conectado ? (
                <>
                  <AdminButton tone="neutral" icon={KeyRound} onClick={() => openEditor(integracion.id)}>Editar acceso</AdminButton>
                  <AdminButton tone="danger" icon={Unplug} onClick={() => { actualizarDeliveryIntegracion(integracion.id, { conectado: false }); showToast('Integración desconectada') }}>Desconectar</AdminButton>
                </>
              ) : (
                <AdminButton tone="primary" icon={PlugZap} onClick={() => openEditor(integracion.id)}>Configurar conexión</AdminButton>
              )}
            </footer>
          </AdminPanel>
        ))}
      </section>

      <AdminPanel eyebrow="Endpoint disponible" title="Webhook genérico" detail="Para plataformas o canales propios que entreguen pedidos en formato compatible.">
        <div className="messa-webhook">
          <Webhook size={18} />
          <code>POST /api/webhook/delivery</code>
          <AdminStatus tone="blue">Servidor</AdminStatus>
        </div>
      </AdminPanel>

      <AdminSheet
        open={Boolean(seleccionada)}
        onClose={() => setEditandoId(null)}
        title={seleccionada ? `Conectar ${seleccionada.nombre}` : 'Conectar canal'}
        eyebrow="Credenciales de delivery"
        footer={(
          <>
            <AdminButton tone="quiet" onClick={() => setEditandoId(null)}>Cancelar</AdminButton>
            <AdminButton tone="primary" icon={CheckCircle2} disabled={conectando} onClick={handleConectar}>{conectando ? 'Verificando…' : 'Guardar conexión'}</AdminButton>
          </>
        )}
      >
        <div className="messa-form-stack">
          <label><span>API key o token</span><input value={form.api_key} onChange={event => setForm(current => ({ ...current, api_key: event.target.value }))} placeholder="Ingresá la credencial oficial" autoComplete="off" /></label>
          <label><span>Webhook asignado</span><input value={form.webhook_url} onChange={event => setForm(current => ({ ...current, webhook_url: event.target.value }))} placeholder="https://…" inputMode="url" /></label>
          <p className="messa-form-help">La credencial queda en el estado local de esta demo. En producción debe guardarse cifrada del lado del servidor.</p>
        </div>
      </AdminSheet>
    </AdminWorkspace>
  )
}
