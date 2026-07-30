'use client'

import { useState } from 'react'
import { HeartHandshake, Landmark, LockKeyhole, PlugZap, Printer, Save, ShieldCheck, Webhook } from 'lucide-react'
import { AdminButton, AdminPanel, AdminSegmented, AdminStatus, AdminToast, AdminWorkspace } from '@/components/admin/admin-ui'
import { useStore } from '@/lib/store'

type PaymentTab = 'mp' | 'bancario' | 'propinas' | 'pos'

export default function PagosAdminPage() {
  const { config, actualizarConfig, propinaConfig, actualizarPropinaConfig, sesionAdmin } = useStore()
  const [tab, setTab] = useState<PaymentTab>('mp')
  const [toast, setToast] = useState('')
  const [testeandoPOS, setTesteandoPOS] = useState(false)
  const [form, setForm] = useState({ mp_public_key: config.mp_public_key, cbu: config.cbu, cvu: config.cvu, alias: config.alias, cbu_titular: config.cbu_titular })
  const [posForm, setPosForm] = useState(config.pos)
  const [propForm, setPropForm] = useState(propinaConfig)
  const esAdminOCreator = sesionAdmin?.rol === 'admin' || sesionAdmin?.rol === 'creator'
  const camposBancarios: { key: keyof typeof form; label: string; placeholder: string }[] = [
    { key: 'cbu_titular', label: 'Titular de la cuenta', placeholder: 'Razón social o nombre' },
    { key: 'cbu', label: 'CBU', placeholder: '0000000000000000000000' },
    { key: 'cvu', label: 'CVU', placeholder: '0000000000000000000000' },
    { key: 'alias', label: 'Alias', placeholder: 'restaurante.nombre' },
  ]

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }

  const saveGeneral = () => {
    actualizarConfig(form)
    showToast('Configuración guardada')
  }

  const handleConectarPOS = () => {
    if (posForm.proveedor === 'ninguno') {
      showToast('Elegí un proveedor de POS')
      return
    }
    setTesteandoPOS(true)
    window.setTimeout(() => {
      const conectado = { ...posForm, conectado: true, ultima_conexion: new Date().toISOString() }
      setPosForm(conectado)
      actualizarConfig({ pos: conectado })
      setTesteandoPOS(false)
      showToast(`Configuración guardada para ${posForm.proveedor}`)
    }, 900)
  }

  const disconnectPOS = () => {
    const desconectado = { ...posForm, conectado: false }
    setPosForm(desconectado)
    actualizarConfig({ pos: desconectado })
    showToast('POS desconectado')
  }

  return (
    <AdminWorkspace
      eyebrow="Cobros y configuración"
      title="Pagos y finanzas"
      description="Centralizá medios de pago, datos bancarios, propinas y conexiones de punto de venta."
      actions={<AdminStatus tone={esAdminOCreator ? 'gold' : 'neutral'}>{esAdminOCreator ? 'Acceso administrador' : 'Acceso restringido'}</AdminStatus>}
    >
      <AdminToast>{toast}</AdminToast>
      <div className="messa-module-tabs">
        <AdminSegmented<PaymentTab>
          value={tab}
          onChange={setTab}
          label="Sección de pagos"
          items={[
            { value: 'mp', label: 'Mercado Pago' },
            { value: 'bancario', label: 'Datos bancarios' },
            { value: 'propinas', label: 'Propinas' },
            { value: 'pos', label: 'POS e impresora' },
          ]}
        />
      </div>

      {tab === 'mp' && (
        <AdminPanel eyebrow="Checkout digital" title="Mercado Pago" detail="La credencial secreta permanece siempre del lado del servidor.">
          <div className="messa-info-callout__content">
            <span><ShieldCheck size={20} /></span>
            <p>El Access Token se configura como <code>MP_ACCESS_TOKEN</code> en el hosting. La Public Key no es secreta y puede guardarse desde este panel.</p>
          </div>
          <div className="messa-form-stack messa-form-stack--spaced">
            <label><span>Public Key</span><input value={form.mp_public_key} onChange={event => setForm(current => ({ ...current, mp_public_key: event.target.value }))} placeholder="APP_USR-…" autoComplete="off" /></label>
            <p className="messa-form-help"><LockKeyhole size={14} />El Access Token nunca se envía al navegador. Para validar notificaciones también podés definir <code>MP_WEBHOOK_SECRET</code>.</p>
            <AdminButton tone="primary" icon={Save} onClick={saveGeneral}>Guardar Public Key</AdminButton>
          </div>
        </AdminPanel>
      )}

      {tab === 'bancario' && (
        <AdminPanel eyebrow="Transferencias" title="Datos bancarios" detail="El comensal ve estos datos cuando elige transferencia.">
          <div className="messa-form-grid">
            {camposBancarios.map(field => (
              <label key={field.key}><span>{field.label}</span><input value={form[field.key]} onChange={event => setForm(current => ({ ...current, [field.key]: event.target.value }))} placeholder={field.placeholder} /></label>
            ))}
          </div>
          <div className="messa-form-actions"><AdminButton tone="primary" icon={Landmark} onClick={saveGeneral}>Guardar datos bancarios</AdminButton></div>
        </AdminPanel>
      )}

      {tab === 'propinas' && (
        <AdminPanel eyebrow="Experiencia de pago" title="Propinas sugeridas" detail="Ofrecé opciones claras sin interferir con el cierre de la cuenta.">
          <label className="messa-switch-row">
            <span><b>Ofrecer propina</b><small>Se muestra antes de elegir el medio de pago.</small></span>
            <input type="checkbox" checked={propForm.habilitada} onChange={event => setPropForm(current => ({ ...current, habilitada: event.target.checked }))} />
          </label>
          {propForm.habilitada && (
            <>
              <div className="messa-form-grid messa-form-grid--three">
                {propForm.opciones.map((percentage, index) => (
                  <label key={index}><span>Opción {index + 1} (%)</span><input type="number" min={0} max={100} value={percentage} onChange={event => {
                    const opciones = [...propForm.opciones]
                    opciones[index] = Number.parseInt(event.target.value) || 0
                    setPropForm(current => ({ ...current, opciones }))
                  }} /></label>
                ))}
              </div>
              <label className="messa-switch-row">
                <span><b>Importe personalizado</b><small>Permite elegir otro porcentaje o monto.</small></span>
                <input type="checkbox" checked={propForm.permitir_personalizado} onChange={event => setPropForm(current => ({ ...current, permitir_personalizado: event.target.checked }))} />
              </label>
            </>
          )}
          <div className="messa-form-actions"><AdminButton tone="primary" icon={HeartHandshake} onClick={() => { actualizarPropinaConfig(propForm); showToast('Propinas actualizadas') }}>Guardar propinas</AdminButton></div>
        </AdminPanel>
      )}

      {tab === 'pos' && (
        <div className="messa-two-column">
          <AdminPanel eyebrow="Punto de venta" title="Conexión POS" detail="Prepará el acceso al proveedor que use la sucursal.">
            <div className="messa-status-line"><AdminStatus tone={posForm.conectado ? 'green' : 'neutral'}>{posForm.conectado ? `Configurado · ${posForm.proveedor}` : 'Sin configurar'}</AdminStatus></div>
            <div className="messa-form-stack">
              <label><span>Proveedor</span><select value={posForm.proveedor} onChange={event => setPosForm(current => ({ ...current, proveedor: event.target.value as typeof current.proveedor }))}><option value="ninguno">Elegir proveedor</option><option value="maxirest">MaxiRest</option><option value="alohar">Alohar</option><option value="personalizado">Personalizado</option></select></label>
              <label><span>Webhook / URL del POS</span><input value={posForm.webhook_url} onChange={event => setPosForm(current => ({ ...current, webhook_url: event.target.value }))} placeholder="https://…" inputMode="url" /></label>
              <label><span>API key</span><input type="password" value={posForm.api_key} onChange={event => setPosForm(current => ({ ...current, api_key: event.target.value }))} placeholder="Credencial privada" autoComplete="new-password" /></label>
            </div>
            <div className="messa-form-actions">
              {posForm.conectado
                ? <AdminButton tone="danger" onClick={disconnectPOS}>Desconectar</AdminButton>
                : <AdminButton tone="primary" icon={PlugZap} disabled={testeandoPOS} onClick={handleConectarPOS}>{testeandoPOS ? 'Verificando…' : 'Guardar conexión'}</AdminButton>}
            </div>
          </AdminPanel>

          <AdminPanel eyebrow="Salida local" title="Impresora de tickets" detail="Configuración de red para el equipo de la sucursal.">
            <div className="messa-form-stack">
              <label><span>Dirección IP</span><input value={posForm.impresora_ip} onChange={event => setPosForm(current => ({ ...current, impresora_ip: event.target.value }))} placeholder="192.168.1.100" inputMode="decimal" /></label>
              <label><span>Puerto</span><input value={posForm.impresora_puerto} onChange={event => setPosForm(current => ({ ...current, impresora_puerto: event.target.value }))} placeholder="9100" inputMode="numeric" /></label>
              <p className="messa-form-help"><Webhook size={14} />El receptor de pedidos disponible es <code>/api/webhook/pedido</code>.</p>
            </div>
            <div className="messa-form-actions"><AdminButton tone="neutral" icon={Printer} onClick={() => { actualizarConfig({ pos: posForm }); showToast('Impresora guardada') }}>Guardar impresora</AdminButton></div>
          </AdminPanel>
        </div>
      )}
    </AdminWorkspace>
  )
}
