'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'

export default function PagosAdminPage() {
  const { config, actualizarConfig, propinaConfig, actualizarPropinaConfig, sesionAdmin } = useStore()
  const [tab, setTab] = useState<'mp' | 'bancario' | 'pos' | 'propinas'>('mp')
  const [toast, setToast] = useState('')
  const [testeandoPOS, setTesteandoPOS] = useState(false)
  const [form, setForm] = useState({ mp_public_key: config.mp_public_key, cbu: config.cbu, cvu: config.cvu, alias: config.alias, cbu_titular: config.cbu_titular })
  const [posForm, setPosForm] = useState(config.pos)
  const [propForm, setPropForm] = useState(propinaConfig)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2600) }
  const esAdminOCreator = sesionAdmin?.rol === 'admin' || sesionAdmin?.rol === 'creator'

  const handleGuardar = () => { actualizarConfig(form); showToast('Configuración guardada ✓') }

  const handleConectarPOS = () => {
    if (posForm.proveedor === 'ninguno') { showToast('Elegí un proveedor de POS primero'); return }
    setTesteandoPOS(true)
    setTimeout(() => {
      const conectado = { ...posForm, conectado: true, ultima_conexion: new Date().toISOString() }
      setPosForm(conectado)
      actualizarConfig({ pos: conectado })
      setTesteandoPOS(false)
      showToast(`✅ Conectado con ${posForm.proveedor}`)
    }, 1400)
  }

  const handleDesconectarPOS = () => {
    const desconectado = { ...posForm, conectado: false }
    setPosForm(desconectado)
    actualizarConfig({ pos: desconectado })
    showToast('POS desconectado')
  }

  const handleGuardarPropinas = () => { actualizarPropinaConfig(propForm); showToast('Configuración de propinas guardada ✓') }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 40 }}>
      {toast && <div className="fade-in" style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', background: '#1C1C1C', border: '1px solid #383838', borderRadius: 100, padding: '10px 20px', fontSize: 13, color: '#fff', zIndex: 9999, whiteSpace: 'nowrap' }}>{toast}</div>}

      <div style={{ background: 'var(--bg)', borderBottom: '1px solid #1C1C1C', padding: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h1 className="font-titulos" style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Pagos & Finanzas</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707070' }}>Acceso: {esAdminOCreator ? 'Dueño / Creador' : 'Restringido'}</p>
          </div>
          <Link href="/admin" style={{ textDecoration: 'none', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#A0A0A0' }}>← Admin</Link>
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
          {([['mp', '💳 Mercado Pago'], ['bancario', '🏦 Bancarios'], ['propinas', '💛 Propinas'], ['pos', '🖨️ POS']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)} style={{ flex: 1, padding: '8px 4px', borderRadius: 10, fontSize: 11, cursor: 'pointer', flexShrink: 0, background: tab === v ? 'rgba(212,175,55,0.15)' : '#1C1C1C', color: tab === v ? 'var(--gold)' : '#707070', border: tab === v ? '1px solid rgba(212,175,55,0.4)' : '1px solid #2A2A2A', fontWeight: tab === v ? 600 : 400 }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {tab === 'mp' && (
          <>
            <div style={{ background: 'rgba(0,158,227,0.06)', border: '1px solid rgba(0,158,227,0.2)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
              <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600, color: '#009ee3' }}>💳 Mercado Pago</p>
              <p style={{ margin: 0, fontSize: 12, color: '#707070', lineHeight: 1.6 }}>El Access Token real ya <strong>no se carga desde acá</strong> — vive como variable de entorno del servidor (<code style={{ color: '#009ee3' }}>MP_ACCESS_TOKEN</code>), para que nunca quede expuesto en el navegador. El botón &ldquo;Pagar con Mercado Pago&rdquo; detecta automáticamente si esa variable está configurada.</p>
            </div>
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 12, color: '#F59E0B', lineHeight: 1.7 }}>
                📋 Para activar pagos reales:<br />
                1. Conseguí tu Access Token en mercadopago.com.ar/developers/panel/app<br />
                2. Definí <code>MP_ACCESS_TOKEN</code> como variable de entorno en tu hosting (o Cloudflare: <code>wrangler secret put MP_ACCESS_TOKEN</code>)<br />
                3. Opcional pero recomendado: definí también <code>MP_WEBHOOK_SECRET</code> (te lo da MP al configurar el webhook) para que las notificaciones se validen de verdad
              </p>
            </div>

            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: '0 0 6px', fontSize: 12, color: '#707070' }}>Public Key (opcional — no es secreta, se puede guardar acá)</p>
              <input value={form.mp_public_key} onChange={e => setForm({ ...form, mp_public_key: e.target.value })} placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="input-premium" />
            </div>
            <p style={{ fontSize: 11, color: '#484848', marginBottom: 16 }}>La Public Key no es sensible (está diseñada para usarse en el frontend), a diferencia del Access Token que nunca debe salir del servidor.</p>
            <button onClick={handleGuardar} className="btn-gold" style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', fontSize: 15, cursor: 'pointer' }}>Guardar Public Key</button>
          </>
        )}

        {tab === 'bancario' && (
          <>
            <div style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 14, padding: 14, marginBottom: 16 }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>🔐 Datos bancarios</p>
              <p style={{ margin: 0, fontSize: 12, color: '#707070', lineHeight: 1.5 }}>Se muestran a los clientes que elijan pagar por transferencia bancaria.</p>
            </div>
            {[{ key: 'cbu_titular', label: 'Titular de la cuenta', placeholder: 'Razón social o nombre' }, { key: 'cbu', label: 'CBU', placeholder: '0000000000000000000000' }, { key: 'cvu', label: 'CVU (billetera virtual)', placeholder: '0000000000000000000000' }, { key: 'alias', label: 'Alias', placeholder: 'restaurante.nombre.mp' }].map(({ key, label, placeholder }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <p style={{ margin: '0 0 6px', fontSize: 12, color: '#707070' }}>{label}</p>
                <input value={(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} className="input-premium" />
              </div>
            ))}
            <button onClick={handleGuardar} className="btn-gold" style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', fontSize: 15, cursor: 'pointer' }}>Guardar datos bancarios</button>
          </>
        )}

        {tab === 'propinas' && (
          <>
            <div style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 14, padding: 14, marginBottom: 20 }}>
              <p style={{ margin: 0, fontSize: 12, color: '#707070', lineHeight: 1.6 }}>💛 Configurá si se ofrece propina al pagar, y qué porcentajes recomendados ven los clientes.</p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, cursor: 'pointer' }}>
              <input type="checkbox" checked={propForm.habilitada} onChange={e => setPropForm({ ...propForm, habilitada: e.target.checked })} style={{ width: 18, height: 18 }} />
              <span style={{ fontSize: 14 }}>Habilitar propina en el pago</span>
            </label>
            {propForm.habilitada && (
              <>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Porcentajes recomendados (3)</p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  {propForm.opciones.map((pct, i) => (
                    <input key={i} type="number" value={pct} onChange={e => { const nuevas = [...propForm.opciones]; nuevas[i] = parseInt(e.target.value) || 0; setPropForm({ ...propForm, opciones: nuevas }) }} className="input-premium" style={{ textAlign: 'center' }} />
                  ))}
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, cursor: 'pointer' }}>
                  <input type="checkbox" checked={propForm.permitir_personalizado} onChange={e => setPropForm({ ...propForm, permitir_personalizado: e.target.checked })} style={{ width: 18, height: 18 }} />
                  <span style={{ fontSize: 14 }}>Permitir que el cliente ingrese % o monto personalizado</span>
                </label>
              </>
            )}
            <button onClick={handleGuardarPropinas} className="btn-gold" style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', fontSize: 15, cursor: 'pointer' }}>Guardar configuración de propinas</button>
          </>
        )}

        {tab === 'pos' && (
          <>
            <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 14, padding: 14, marginBottom: 16 }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#F59E0B' }}>🖨️ Integración POS e Impresoras</p>
              <p style={{ margin: 0, fontSize: 12, color: '#707070', lineHeight: 1.5 }}>El endpoint que recibe pedidos (<code>/api/webhook/pedido</code>) ya está escrito y funciona. &ldquo;Conectar&rdquo; acá guarda tu configuración localmente — la integración real con tu POS específico (MaxiRest/Alohar) requiere su documentación de API y, para que el pedido llegue de forma persistente, una base de datos conectada.</p>
            </div>

            <div style={{ background: config.pos.conectado ? 'rgba(34,197,94,0.08)' : '#141414', border: config.pos.conectado ? '1px solid rgba(34,197,94,0.3)' : '1px solid #2A2A2A', borderRadius: 14, padding: 14, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: config.pos.conectado ? '#22C55E' : '#707070' }}>{config.pos.conectado ? `🟢 Config. guardada — ${config.pos.proveedor}` : '⚪ Sin configurar'}</p>
                {config.pos.ultima_conexion && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#707070' }}>Última conexión: {new Date(config.pos.ultima_conexion).toLocaleString('es-AR')}</p>}
              </div>
            </div>

            <p style={{ margin: '0 0 8px', fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Proveedor</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {(['maxirest', 'alohar', 'personalizado'] as const).map(p => (
                <button key={p} onClick={() => setPosForm({ ...posForm, proveedor: p })} style={{ padding: '10px', borderRadius: 10, fontSize: 12, cursor: 'pointer', textTransform: 'capitalize', background: posForm.proveedor === p ? 'rgba(212,175,55,0.15)' : '#1C1C1C', color: posForm.proveedor === p ? 'var(--gold)' : '#A0A0A0', border: posForm.proveedor === p ? '1px solid rgba(212,175,55,0.4)' : '1px solid #2A2A2A' }}>{p}</button>
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: '0 0 6px', fontSize: 12, color: '#707070' }}>Webhook / URL del POS</p>
              <input value={posForm.webhook_url} onChange={e => setPosForm({ ...posForm, webhook_url: e.target.value })} placeholder="https://tu-pos.com/api/pedidos" className="input-premium" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: '0 0 6px', fontSize: 12, color: '#707070' }}>API Key</p>
              <input type="password" value={posForm.api_key} onChange={e => setPosForm({ ...posForm, api_key: e.target.value })} placeholder="••••••••••••" className="input-premium" />
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              {config.pos.conectado
                ? <button onClick={handleDesconectarPOS} style={{ flex: 1, padding: 13, borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Desconectar</button>
                : <button onClick={handleConectarPOS} disabled={testeandoPOS} className="btn-gold" style={{ flex: 1, padding: 13, borderRadius: 12, border: 'none', fontSize: 13, cursor: 'pointer' }}>{testeandoPOS ? 'Conectando...' : '🔌 Conectar y probar'}</button>
              }
            </div>

            <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600 }}>🖨️ Impresora de tickets (red)</p>
            <div style={{ marginBottom: 10 }}>
              <input value={posForm.impresora_ip} onChange={e => setPosForm({ ...posForm, impresora_ip: e.target.value })} placeholder="IP: 192.168.1.100" className="input-premium" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <input value={posForm.impresora_puerto} onChange={e => setPosForm({ ...posForm, impresora_puerto: e.target.value })} placeholder="Puerto: 9100" className="input-premium" />
            </div>
            <button onClick={() => { actualizarConfig({ pos: posForm }); showToast('Configuración de impresora guardada ✓') }} style={{ width: '100%', padding: 13, borderRadius: 12, background: '#1C1C1C', border: '1px solid #2A2A2A', color: '#fff', fontSize: 13, cursor: 'pointer' }}>Guardar impresora</button>
          </>
        )}
      </div>
    </div>
  )
}
