'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import {
  Check,
  Copy,
  Download,
  KeyRound,
  Nfc,
  Plus,
  Printer,
  QrCode as QrCodeIcon,
  RefreshCw,
  ScanLine,
  Trash2,
  UsersRound,
} from 'lucide-react'
import AdminOperationShell from '@/components/admin-operation-shell'
import {
  AdminButton,
  AdminEmpty,
  AdminMetric,
  AdminPanel,
  AdminSheet,
  AdminStatus,
  AdminToast,
  AdminWorkspace,
} from '@/components/admin/admin-ui'
import { useStore } from '@/lib/store'
import type { Mesa } from '@/types'
import { formatearCodigo, normalizarTagRfid, urlDeMesa, urlDeRfid } from '@/lib/mesa-codigo'
import { appOrigin, withBasePath } from '@/lib/base-path'
import { codigoDeVistaPrevia, MODO_VISTA_PREVIA } from '@/lib/mesa-codigo-preview'

const FORMAS: { valor: Mesa['forma']; label: string }[] = [
  { valor: 'redonda', label: 'Redonda' },
  { valor: 'cuadrada', label: 'Cuadrada' },
  { valor: 'rectangular', label: 'Rectangular' },
]

const ESTADO_LABEL: Record<Mesa['estado'], { label: string; tone: 'green' | 'rose' | 'amber' | 'gold' | 'blue' }> = {
  libre: { label: 'Libre', tone: 'green' },
  ocupada: { label: 'Ocupada', tone: 'rose' },
  pedido: { label: 'Con pedido', tone: 'amber' },
  pagando: { label: 'Pagando', tone: 'gold' },
  pagada: { label: 'Pagada', tone: 'blue' },
}

export default function MesasQrPage() {
  const {
    mesas,
    sucursales,
    sucursalActualId,
    initStore,
    crearMesaLayout,
    eliminarMesaLayout,
    actualizarCapacidadMesa,
    regenerarCodigoMesa,
    regenerarCodigosSucursal,
    asignarRfidMesa,
    aplicarCodigosDelServidor,
  } = useStore()

  const [qrPorMesa, setQrPorMesa] = useState<Record<string, string>>({})
  const [errorCodigos, setErrorCodigos] = useState('')
  const [toast, setToast] = useState('')
  const [copiado, setCopiado] = useState('')
  const [editando, setEditando] = useState<Mesa | null>(null)
  const [creando, setCreando] = useState(false)
  const [nueva, setNueva] = useState<{ forma: Mesa['forma']; capacidad: number }>({ forma: 'redonda', capacidad: 4 })
  const [rfidMesa, setRfidMesa] = useState<Mesa | null>(null)
  const [rfidValor, setRfidValor] = useState('')
  const [rfidError, setRfidError] = useState('')
  const [confirmandoRegeneracion, setConfirmandoRegeneracion] = useState(false)

  useEffect(() => { initStore() }, [initStore])

  const sucursal = sucursales.find(item => item.id === sucursalActualId)
  const mesasSucursal = useMemo(
    () => mesas.filter(mesa => mesa.sucursal_id === sucursalActualId).sort((a, b) => a.numero - b.numero),
    [mesas, sucursalActualId],
  )
  const conCodigo = mesasSucursal.filter(mesa => mesa.codigo_acceso).length
  const conRfid = mesasSucursal.filter(mesa => mesa.rfid_tag).length
  const ocupadas = mesasSucursal.filter(mesa => mesa.estado !== 'libre').length
  const asientos = mesasSucursal.reduce((total, mesa) => total + mesa.capacidad, 0)

  const showToast = useCallback((mensaje: string) => {
    setToast(mensaje)
    window.setTimeout(() => setToast(''), 2600)
  }, [])

  // Los códigos los deriva el servidor a partir del id de la mesa y su versión;
  // acá sólo se piden y se cachean. Generarlos en el navegador no serviría: el
  // teléfono del comensal inventaría códigos distintos y el QR impreso no
  // abriría nada. La imagen del QR sí se dibuja localmente, sin servicios
  // externos.
  const firmaDeMesas = mesasSucursal.map(mesa => `${mesa.id}:${mesa.codigo_version || 0}`).join('|')

  useEffect(() => {
    if (!firmaDeMesas) return
    let vigente = true

    const pedidas = firmaDeMesas.split('|').map(entrada => {
      const [id, version] = entrada.split(':')
      return { id, version: Number(version) || 0 }
    })

    const dibujarQr = async (codigos: Record<string, string>) => {
      const origen = appOrigin()
      const entradas = await Promise.all(Object.entries(codigos).map(async ([mesaId, codigo]) => {
        const dataUrl = await QRCode.toDataURL(urlDeMesa(origen, codigo, MODO_VISTA_PREVIA ? mesaId : undefined), {
          errorCorrectionLevel: 'H',
          margin: 1,
          width: 512,
          color: { dark: '#171612ff', light: '#ffffffff' },
        })
        return [mesaId, dataUrl] as const
      }))
      if (vigente) setQrPorMesa(Object.fromEntries(entradas))
    }

    // En la vista previa estática no hay servidor que derive los códigos: se
    // calculan en el navegador con una semilla pública (ver mesa-codigo-preview).
    if (MODO_VISTA_PREVIA) {
      const codigos = Object.fromEntries(pedidas.map(mesa => [mesa.id, codigoDeVistaPrevia(mesa.id, mesa.version)]))
      aplicarCodigosDelServidor(codigos)
      void dibujarQr(codigos)
      return () => { vigente = false }
    }

    void (async () => {
      try {
        const respuesta = await fetch(withBasePath('/api/mesa/codigos'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mesas: pedidas }),
        })
        const datos = await respuesta.json() as { ok?: boolean; codigos?: Record<string, string>; error?: string }
        if (!vigente) return
        if (!datos.ok || !datos.codigos) {
          setErrorCodigos(datos.error || 'No se pudieron obtener los códigos del servidor.')
          return
        }
        setErrorCodigos('')
        aplicarCodigosDelServidor(datos.codigos)
        await dibujarQr(datos.codigos)
      } catch {
        if (vigente) setErrorCodigos('No se pudo contactar al servidor para generar los códigos.')
      }
    })()

    return () => { vigente = false }
  }, [aplicarCodigosDelServidor, firmaDeMesas])

  const copiar = async (texto: string, marca: string) => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(marca)
      window.setTimeout(() => setCopiado(''), 1800)
    } catch {
      showToast('Tu navegador bloqueó el portapapeles — copialo a mano')
    }
  }

  const descargarQr = (mesa: Mesa) => {
    const dataUrl = qrPorMesa[mesa.id]
    if (!dataUrl) return
    const enlace = document.createElement('a')
    enlace.href = dataUrl
    enlace.download = `messa-qr-mesa-${mesa.numero}-${formatearCodigo(mesa.codigo_acceso || '')}.png`
    enlace.click()
    showToast(`QR de la Mesa ${mesa.numero} descargado`)
  }

  const guardarRfid = () => {
    if (!rfidMesa) return
    const resultado = asignarRfidMesa(rfidMesa.id, rfidValor)
    if (!resultado.ok) { setRfidError(resultado.error || 'No se pudo vincular'); return }
    setRfidMesa(null)
    setRfidError('')
    showToast(rfidValor.trim() ? 'Tarjeta vinculada a la mesa' : 'Tarjeta desvinculada')
  }

  const handleEliminar = (mesa: Mesa) => {
    const resultado = eliminarMesaLayout(mesa.id)
    showToast(resultado.ok ? `Mesa ${mesa.numero} eliminada` : resultado.error || 'No se pudo eliminar')
    if (resultado.ok) setEditando(null)
  }

  return (
    <AdminOperationShell>
      <AdminWorkspace
        eyebrow="Acceso de comensales"
        title="Mesas y códigos QR"
        description={`Cada mesa de ${sucursal?.nombre || 'la sucursal'} tiene un código propio. Sin ese código, nadie puede abrir la mesa escribiendo la dirección a mano.`}
        className="messa-qr-workspace"
        actions={(
          <>
            <AdminButton tone="neutral" icon={Printer} onClick={() => window.print()}>Imprimir hoja de QR</AdminButton>
            <AdminButton tone="neutral" icon={RefreshCw} onClick={() => setConfirmandoRegeneracion(true)}>Regenerar todos</AdminButton>
            <AdminButton tone="primary" icon={Plus} onClick={() => setCreando(true)}>Nueva mesa</AdminButton>
          </>
        )}
      >
        <AdminToast>{toast}</AdminToast>

        {errorCodigos && (
          <AdminPanel className="messa-qr-alert">
            <p><strong>No se pudieron generar los códigos.</strong> {errorCodigos}</p>
            <p>Revisá que <code>SESSION_SECRET</code> esté configurado en el servidor y que tu sesión siga activa.</p>
          </AdminPanel>
        )}

        <section className="messa-metrics" aria-label="Resumen de mesas">
          <AdminMetric label="Mesas" value={`${mesasSucursal.length}`} detail={`${asientos} cubiertos configurados`} Icon={UsersRound} tone="gold" progress={100} />
          <AdminMetric label="Con QR activo" value={`${conCodigo}`} detail="Código de acceso asignado" Icon={QrCodeIcon} tone="green" progress={(conCodigo / Math.max(1, mesasSucursal.length)) * 100} />
          <AdminMetric label="Con RFID / NFC" value={`${conRfid}`} detail={conRfid ? 'Entrada por tarjeta' : 'Ninguna vinculada aún'} Icon={Nfc} tone={conRfid ? 'blue' : 'amber'} progress={(conRfid / Math.max(1, mesasSucursal.length)) * 100} />
          <AdminMetric label="En servicio" value={`${ocupadas}`} detail={`${mesasSucursal.length - ocupadas} libres ahora`} Icon={ScanLine} tone="rose" progress={(ocupadas / Math.max(1, mesasSucursal.length)) * 100} />
        </section>

        <AdminPanel
          eyebrow="Cómo funciona"
          title="Un código por mesa, no un número correlativo"
          detail="El QR lleva una dirección corta con el código de la mesa. Si alguien cambia la dirección a mano, MESSA le pide el código y no lo deja entrar."
        >
          <div className="messa-qr-explainer">
            <div><span><QrCodeIcon size={18} /></span><div><b>QR sobre la mesa</b><small>Imprimí la hoja y pegá cada QR en su mesa. Cada teléfono que lo escanee entra como comensal distinto y suma a la misma cuenta.</small></div></div>
            <div><span><Nfc size={18} /></span><div><b>Tarjeta RFID / NFC</b><small>Grabá en el tag la dirección que aparece al vincularlo. Apoyar el teléfono abre la carta sin escanear nada.</small></div></div>
            <div><span><KeyRound size={18} /></span><div><b>Si se filtra un código</b><small>Regenerá el de esa mesa: el QR viejo deja de funcionar al instante y sólo hay que reimprimir ese.</small></div></div>
          </div>
        </AdminPanel>

        {mesasSucursal.length === 0 ? (
          <AdminEmpty Icon={QrCodeIcon} title="Esta sucursal no tiene mesas" description="Creá la primera mesa para generar su código de acceso y su QR." action={<AdminButton tone="primary" icon={Plus} onClick={() => setCreando(true)}>Nueva mesa</AdminButton>} />
        ) : (
          <div className="messa-qr-grid">
            {mesasSucursal.map(mesa => {
              const codigo = mesa.codigo_acceso ? formatearCodigo(mesa.codigo_acceso) : ''
              const enlace = codigo ? urlDeMesa(appOrigin(), codigo, MODO_VISTA_PREVIA ? mesa.id : undefined) : ''
              const estado = ESTADO_LABEL[mesa.estado]
              return (
                <article className="messa-qr-card" key={mesa.id}>
                  <header>
                    <div><p className="messa-kicker">Mesa</p><h2>M{mesa.numero}</h2></div>
                    <AdminStatus tone={estado.tone}>{estado.label}</AdminStatus>
                  </header>

                  <div className="messa-qr-card__code">
                    {qrPorMesa[mesa.id]
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={qrPorMesa[mesa.id]} alt={`Código QR de la mesa ${mesa.numero}`} />
                      : <div className="messa-qr-card__placeholder" aria-hidden="true"><QrCodeIcon size={26} /></div>}
                    <button type="button" className="messa-qr-card__value" onClick={() => copiar(codigo, `codigo-${mesa.id}`)} title="Copiar código">
                      <span>{codigo || 'Sin código'}</span>
                      {copiado === `codigo-${mesa.id}` ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>

                  <dl className="messa-qr-card__meta">
                    <div><dt>Capacidad</dt><dd>{mesa.capacidad} personas · {FORMAS.find(item => item.valor === mesa.forma)?.label.toLowerCase()}</dd></div>
                    <div><dt>Dispositivos</dt><dd>{mesa.dispositivos.length || 'Ninguno'} en la mesa</dd></div>
                    <div><dt>RFID / NFC</dt><dd>{mesa.rfid_tag || 'Sin tarjeta vinculada'}</dd></div>
                  </dl>

                  <button type="button" className="messa-qr-card__link" onClick={() => copiar(enlace, `link-${mesa.id}`)} title="Copiar dirección del QR">
                    <span>{enlace || '—'}</span>
                    {copiado === `link-${mesa.id}` ? <Check size={14} /> : <Copy size={14} />}
                  </button>

                  <footer>
                    <AdminButton tone="neutral" icon={Download} onClick={() => descargarQr(mesa)} disabled={!qrPorMesa[mesa.id]}>PNG</AdminButton>
                    <AdminButton tone="neutral" icon={Nfc} onClick={() => { setRfidMesa(mesa); setRfidValor(mesa.rfid_tag || ''); setRfidError('') }}>RFID</AdminButton>
                    <AdminButton tone="neutral" icon={RefreshCw} onClick={() => { regenerarCodigoMesa(mesa.id); showToast(`Mesa ${mesa.numero}: código nuevo, reimprimí su QR`) }}>Nuevo código</AdminButton>
                    <AdminButton tone="quiet" icon={UsersRound} onClick={() => setEditando(mesa)}>Editar</AdminButton>
                  </footer>
                </article>
              )
            })}
          </div>
        )}

        {/* Hoja para imprimir: oculta en pantalla, una tarjeta por mesa al imprimir. */}
        <section className="messa-qr-print">
          <h1>{sucursal?.nombre || 'MESSA'} · códigos de mesa</h1>
          <div>
            {mesasSucursal.filter(mesa => mesa.codigo_acceso).map(mesa => (
              <article key={mesa.id}>
                {qrPorMesa[mesa.id] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrPorMesa[mesa.id]} alt="" />
                )}
                <strong>Mesa {mesa.numero}</strong>
                <span>{formatearCodigo(mesa.codigo_acceso as string)}</span>
                <small>Escaneá para ver la carta y pedir</small>
              </article>
            ))}
          </div>
        </section>

        <AdminSheet
          open={creando}
          onClose={() => setCreando(false)}
          eyebrow="Alta de mesa"
          title="Nueva mesa"
          footer={(
            <>
              <AdminButton tone="quiet" onClick={() => setCreando(false)}>Cancelar</AdminButton>
              <AdminButton tone="primary" icon={Plus} onClick={() => { crearMesaLayout(nueva.forma, nueva.capacidad); setCreando(false); showToast('Mesa creada con su código y su QR') }}>Crear mesa</AdminButton>
            </>
          )}
        >
          <div className="messa-form-stack">
            <label><span>Capacidad</span><input type="number" min={1} max={24} value={nueva.capacidad} onChange={event => setNueva(current => ({ ...current, capacidad: Math.max(1, Number(event.target.value) || 1) }))} /></label>
            <label><span>Forma</span><select value={nueva.forma} onChange={event => setNueva(current => ({ ...current, forma: event.target.value as Mesa['forma'] }))}>{FORMAS.map(item => <option key={item.valor} value={item.valor}>{item.label}</option>)}</select></label>
            <p className="messa-form-help">La mesa se numera sola y recibe un código de acceso propio. Después podés ubicarla en el plano desde Control de salón.</p>
          </div>
        </AdminSheet>

        <AdminSheet
          open={Boolean(editando)}
          onClose={() => setEditando(null)}
          eyebrow="Configuración"
          title={editando ? `Mesa ${editando.numero}` : 'Mesa'}
          footer={editando ? (
            <>
              <AdminButton tone="danger" icon={Trash2} onClick={() => handleEliminar(editando)}>Eliminar mesa</AdminButton>
              <AdminButton tone="primary" onClick={() => setEditando(null)}>Listo</AdminButton>
            </>
          ) : undefined}
        >
          {editando && (
            <div className="messa-form-stack">
              <label><span>Capacidad</span><input type="number" min={1} max={24} value={editando.capacidad} onChange={event => { const capacidad = Math.max(1, Number(event.target.value) || 1); actualizarCapacidadMesa(editando.id, capacidad, editando.forma); setEditando({ ...editando, capacidad }) }} /></label>
              <label><span>Forma</span><select value={editando.forma} onChange={event => { const forma = event.target.value as Mesa['forma']; actualizarCapacidadMesa(editando.id, editando.capacidad, forma); setEditando({ ...editando, forma }) }}>{FORMAS.map(item => <option key={item.valor} value={item.valor}>{item.label}</option>)}</select></label>
              <p className="messa-form-help">Sólo se pueden eliminar mesas libres, para no perder una cuenta abierta.</p>
            </div>
          )}
        </AdminSheet>

        <AdminSheet
          open={Boolean(rfidMesa)}
          onClose={() => { setRfidMesa(null); setRfidError('') }}
          eyebrow="Entrada por tarjeta"
          title={rfidMesa ? `RFID de la Mesa ${rfidMesa.numero}` : 'RFID'}
          footer={(
            <>
              <AdminButton tone="quiet" onClick={() => { setRfidMesa(null); setRfidError('') }}>Cancelar</AdminButton>
              <AdminButton tone="primary" icon={Nfc} onClick={guardarRfid}>Guardar tarjeta</AdminButton>
            </>
          )}
        >
          <div className="messa-form-stack">
            <label>
              <span>Identificador del tag</span>
              <input
                value={rfidValor}
                onChange={event => { setRfidValor(normalizarTagRfid(event.target.value)); setRfidError('') }}
                placeholder="Apoyá la tarjeta en el lector o escribí el UID"
                autoComplete="off"
                autoFocus
              />
            </label>
            {rfidError && <p className="messa-form-error" role="alert">{rfidError}</p>}
            <p className="messa-form-help">
              Los lectores RFID USB se comportan como un teclado: con el campo enfocado, apoyá la tarjeta y el identificador se escribe solo. Dejá el campo vacío para desvincularla.
            </p>

            {rfidMesa?.codigo_acceso && (
              <div className="messa-qr-nfc-url">
                <p className="messa-kicker">Dirección para grabar en el tag NFC de la mesa</p>
                <button type="button" onClick={() => copiar(urlDeMesa(appOrigin(), rfidMesa.codigo_acceso as string, MODO_VISTA_PREVIA ? rfidMesa.id : undefined), 'nfc')}>
                  <span>{urlDeMesa(appOrigin(), rfidMesa.codigo_acceso as string, MODO_VISTA_PREVIA ? rfidMesa.id : undefined)}</span>
                  {copiado === 'nfc' ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <p className="messa-form-help">
                  Es la misma dirección del QR: grabada en el tag, apoyar el teléfono abre la mesa en
                  cualquier dispositivo, sin depender de esta computadora.
                </p>
              </div>
            )}

            {rfidValor && (
              <div className="messa-qr-nfc-url">
                <p className="messa-kicker">Dirección del lector del atril</p>
                <button type="button" onClick={() => copiar(urlDeRfid(appOrigin(), rfidValor), 'lector')}>
                  <span>{urlDeRfid(appOrigin(), rfidValor)}</span>
                  {copiado === 'lector' ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <p className="messa-form-help">
                  Para los lectores USB que sólo emiten el identificador de la tarjeta. Resuelve la
                  mesa con la vinculación cargada en este dispositivo.
                </p>
              </div>
            )}
          </div>
        </AdminSheet>

        <AdminSheet
          open={confirmandoRegeneracion}
          onClose={() => setConfirmandoRegeneracion(false)}
          eyebrow="Confirmación"
          title="Regenerar todos los códigos"
          footer={(
            <>
              <AdminButton tone="quiet" onClick={() => setConfirmandoRegeneracion(false)}>Cancelar</AdminButton>
              <AdminButton tone="danger" icon={RefreshCw} onClick={() => { const total = regenerarCodigosSucursal(sucursalActualId); setConfirmandoRegeneracion(false); showToast(`${total} códigos regenerados`) }}>Regenerar {mesasSucursal.length} códigos</AdminButton>
            </>
          )}
        >
          <div className="messa-confirmation">
            <span><RefreshCw size={22} /></span>
            <h3>Todos los QR impresos dejan de servir</h3>
            <p>Vas a necesitar reimprimir la hoja completa y regrabar las tarjetas NFC. Hacelo sólo si se filtraron los códigos.</p>
          </div>
        </AdminSheet>
      </AdminWorkspace>
    </AdminOperationShell>
  )
}
