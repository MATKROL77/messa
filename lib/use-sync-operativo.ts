'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import { withBasePath } from '@/lib/base-path'
import { MODO_VISTA_PREVIA } from '@/lib/mesa-codigo-preview'
import { accesoRecordado } from '@/lib/acceso-mesa'

/**
 * Mantiene igualadas entre todos los dispositivos las mesas, los pedidos, los
 * llamados al mozo, el plano del salón y —desde el panel— la carta, el stock,
 * la agenda, las finanzas y los ajustes del negocio.
 *
 * Sin esto, un pedido hecho desde el celular del comensal no llegaba nunca a
 * la pantalla de la cocina: cada navegador guardaba su propia copia y no había
 * ningún punto en común.
 *
 * Funciona por sondeo, no por websocket, a propósito: el runtime de Cloudflare
 * Workers no mantiene conexiones abiertas por sesión, y un ciclo de 4 segundos
 * es indistinguible de "instantáneo" para un salón. Además sobrevive a que el
 * celular se bloquee y vuelva, sin reconexiones que manejar.
 *
 * Si el servidor no responde —sin internet, sin base, vista previa estática—
 * no pasa nada: la app sigue funcionando exactamente como antes, contra el
 * almacenamiento local. La sincronización es una mejora, no un requisito.
 */

const INTERVALO_MS = 4000

type TipoEntidad = 'mesa' | 'pedido' | 'llamado' | 'elemento' | 'carta' | 'stock' | 'agenda' | 'finanzas' | 'ajustes'
interface Entidad { id: string; tipo: TipoEntidad; payload: unknown; updated_at: string }

/** Dominios que se comparten como un paquete entero, no entidad por entidad. */
const PAQUETES = ['carta', 'stock', 'agenda', 'finanzas', 'ajustes'] as const
const esPaquete = (tipo: string) => (PAQUETES as readonly string[]).includes(tipo)

/**
 * Huella corta y estable de un objeto. Sirve para saber si un paquete cambió
 * sin guardar una copia entera de la carta en memoria para comparar.
 */
function huella(valor: unknown): string {
  const texto = JSON.stringify(valor)
  let h = 0
  for (let i = 0; i < texto.length; i += 1) h = (h * 31 + texto.charCodeAt(i)) | 0
  return `${texto.length}:${h}`
}

function selloDe(item: { updated_at?: string; created_at?: string }): string {
  return item.updated_at || item.created_at || new Date(0).toISOString()
}

/**
 * El ciclo vive a nivel de módulo, no dentro del componente.
 *
 * El panel monta este hook en su layout, y ese layout se vuelve a montar en
 * cada navegación. Con el estado dentro del componente, cada vez que alguien
 * pasaba de una pantalla a otra el ciclo empezaba de cero: volvía a la vuelta
 * "sólo traer" y nunca llegaba a publicar lo recién editado. Una reserva
 * creada y un clic después no se subía nunca.
 *
 * Acá arranca una sola vez por pestaña y sigue vivo mientras la pestaña exista.
 * No hace falta apagarlo: son cuatro segundos de sondeo que además mantienen el
 * panel al día aunque el usuario esté mirando otra pantalla.
 */
const CLAVE_MEMORIA = 'messa-sync-v1'

const sync = {
  enviadas: new Map<string, string>(),
  /**
   * Huella de cada dominio tal como quedó acordada con el servidor. Si la
   * huella local difiere, hay ediciones sin publicar.
   *
   * Se guarda en el navegador porque una recarga borraba esta memoria: la
   * vuelta siguiente traía la copia del servidor y pisaba lo que la persona
   * acababa de editar y todavía no se había subido.
   */
  huellas: new Map<string, string>(),
  desde: '1970-01-01T00:00:00Z',
  enVuelo: false,
  /**
   * La PRIMERA vuelta sólo trae, no manda. Es la diferencia entre que un
   * navegador recién abierto se ponga al día y que pise la carta real del
   * restaurante con el catálogo de demostración que trae de fábrica.
   */
  yaTrajo: false,
  arrancado: false,
  /** Credenciales y alcance vigentes, que el ciclo lee en cada vuelta. */
  mesaId: undefined as string | undefined,
  incluirConfiguracion: false,
}

function recordar() {
  try {
    window.localStorage.setItem(CLAVE_MEMORIA, JSON.stringify({
      huellas: [...sync.huellas.entries()],
      desde: sync.desde,
    }))
  } catch {
    // Almacenamiento bloqueado (modo privado): se sigue sin memoria entre
    // recargas, que es el comportamiento anterior.
  }
}

function recuperar() {
  try {
    const crudo = window.localStorage.getItem(CLAVE_MEMORIA)
    if (!crudo) return
    const datos = JSON.parse(crudo) as { huellas?: [string, string][]; desde?: string }
    if (Array.isArray(datos.huellas)) sync.huellas = new Map(datos.huellas)
    // `desde` NO se recupera: al abrir conviene traerlo todo de nuevo, que es
    // barato y garantiza arrancar al día aunque la pestaña estuviera cerrada.
  } catch {
    // Memoria corrupta: se arranca de cero, sin consecuencias.
  }
}

async function unaVuelta() {
  if (sync.enVuelo) return
  sync.enVuelo = true
  try {
    const estado = useStore.getState()
    const sucursalId = estado.sucursalActualId
    if (!sucursalId) return

    // Sólo se manda lo que cambió desde el último envío. Mandar todo en cada
    // vuelta funcionaría, pero haría que dos dispositivos se pisaran
    // reescribiendo lo mismo una y otra vez.
    const candidatas: Entidad[] = []
    const agregar = (tipo: TipoEntidad, id: string, payload: { updated_at?: string; created_at?: string }) => {
      const sello = selloDe(payload)
      if (sync.enviadas.get(`${tipo}:${id}`) === sello) return
      candidatas.push({ id, tipo, payload, updated_at: sello })
    }

    estado.mesas.filter(m => m.sucursal_id === sucursalId).forEach(m => agregar('mesa', m.id, m))
    estado.pedidos.filter(p => p.sucursal_id === sucursalId).forEach(p => agregar('pedido', p.id, p))
    estado.llamadosMozo.forEach(l => agregar('llamado', l.id, l))
    estado.elementosPlano.filter(e => e.sucursal_id === sucursalId).forEach(e => agregar('elemento', e.id, e))

    // Carta, stock, agenda, finanzas y ajustes: sólo desde el panel, y sólo
    // cuando cambiaron de verdad. Van con el id de la sucursal para que dos
    // locales no compartan la misma carta.
    //
    // `conCambiosLocales` es la clave para no perder trabajo: si un dominio
    // tiene ediciones sin publicar, este dispositivo las sube y NO acepta la
    // copia del servidor para ese dominio en esta misma vuelta. Sin esa regla,
    // recargar la página justo después de guardar una reserva la borraba.
    const conCambiosLocales = new Set<string>()
    if (sync.incluirConfiguracion) {
      for (const tipo of PAQUETES) {
        const paquete = estado.armarPaquete(tipo)
        if (!paquete) continue
        const marca = huella(paquete)
        if (sync.huellas.get(tipo) === marca) continue

        // "Hay ediciones sin publicar" sólo tiene sentido si existe una
        // referencia previa acordada con el servidor. En un dispositivo recién
        // abierto no hay ninguna, y sus datos son los de fábrica: sin esta
        // condición los tomaba por ediciones propias, se negaba a aceptar los
        // reales y encima intentaba imponer la demo al resto del local.
        if (sync.huellas.has(tipo)) conCambiosLocales.add(tipo)

        candidatas.push({ id: `${tipo}:${sucursalId}`, tipo, payload: paquete, updated_at: new Date().toISOString() })
      }
    }

    const aEnviar = sync.yaTrajo ? candidatas : []

    const respuesta = await fetch(withBasePath('/api/sync'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sucursalId,
        desde: sync.desde,
        entidades: aEnviar,
        // Credencial del comensal cuando no hay sesión de equipo.
        ...(sync.mesaId ? { mesaId: sync.mesaId, codigo: accesoRecordado(sync.mesaId) || '' } : {}),
      }),
    })
    if (!respuesta.ok) return
    const datos = await respuesta.json() as { ok?: boolean; cambios?: Entidad[]; ahora?: string }
    if (!datos.ok) return

    aEnviar.forEach(e => sync.enviadas.set(`${e.tipo}:${e.id}`, e.updated_at))
    if (datos.ahora) sync.desde = datos.ahora

    if (datos.cambios?.length) {
      const entidades = datos.cambios.filter(c => !esPaquete(c.tipo))
      // Un dominio con ediciones locales sin publicar no se pisa con la copia
      // del servidor: las nuestras acaban de subir y son las más nuevas.
      const paquetes = datos.cambios.filter(c => esPaquete(c.tipo) && !conCambiosLocales.has(c.tipo))
      if (entidades.length) useStore.getState().aplicarEstadoRemoto(entidades)
      for (const paquete of paquetes) {
        useStore.getState().aplicarPaqueteRemoto(paquete.tipo, paquete.payload as Record<string, unknown>)
      }
      datos.cambios.forEach(e => sync.enviadas.set(`${e.tipo}:${e.id}`, e.updated_at))
    }

    // Recién ahora este dispositivo tiene derecho a mandar lo suyo.
    if (!sync.yaTrajo) sync.yaTrajo = true

    // La huella de un dominio se actualiza SÓLO si quedó realmente acordado con
    // el servidor: porque lo mandamos, o porque aceptamos su versión.
    //
    // Recalcularlas todas al final parecía más simple, pero en la primera
    // vuelta —que sólo trae— marcaba como "ya sincronizado" algo que nunca se
    // había enviado. Consecuencia: una reserva creada y la página recargada
    // enseguida no se subía NUNCA, porque la vuelta siguiente ya no veía
    // ningún cambio pendiente.
    if (sync.incluirConfiguracion) {
      // La huella se toma de lo que REALMENTE viajó, no del estado actual del
      // store. Si alguien guarda algo mientras la petición está en vuelo, el
      // estado ya cambió: anotar ese estado daría por sincronizado un dato que
      // el servidor nunca recibió, y se perdería para siempre.
      for (const enviado of aEnviar) {
        if (esPaquete(enviado.tipo)) sync.huellas.set(enviado.tipo, huella(enviado.payload))
      }
      // Para lo que se aceptó del servidor, en cambio, la huella se toma del
      // estado local YA fusionado: al aplicar la carta se normaliza contra el
      // catálogo aprobado, así que la huella del payload crudo no coincidiría
      // y los dispositivos se quedarían republicándosela entre ellos.
      const actual = useStore.getState()
      for (const cambio of datos.cambios || []) {
        if (esPaquete(cambio.tipo) && !conCambiosLocales.has(cambio.tipo)) {
          const paquete = actual.armarPaquete(cambio.tipo)
          if (paquete) sync.huellas.set(cambio.tipo, huella(paquete))
        }
      }
      recordar()
    }
  } catch {
    // Sin red o sin base: se reintenta en la próxima vuelta. La app sigue
    // andando con el estado local.
  } finally {
    sync.enVuelo = false
  }
}

export function useSyncOperativo(opciones: { mesaId?: string; incluirConfiguracion?: boolean } = {}) {
  const { mesaId, incluirConfiguracion = false } = opciones

  useEffect(() => {
    if (MODO_VISTA_PREVIA) return
    sync.mesaId = mesaId
    // Una vez que una pantalla del panel habilitó la configuración, el ciclo la
    // sigue publicando: apagarla al navegar dejaría a medias lo que el dueño
    // acaba de editar.
    if (incluirConfiguracion) sync.incluirConfiguracion = true

    if (!sync.arrancado) {
      sync.arrancado = true
      recuperar()
      void unaVuelta()
      window.setInterval(() => { void unaVuelta() }, INTERVALO_MS)
      // Al volver de segundo plano conviene sincronizar en el acto: el mozo
      // desbloquea el teléfono y espera ver el salón al día, no dentro de 4 s.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void unaVuelta()
      })
    } else {
      // Al entrar a una pantalla nueva, ponerse al día sin esperar el ciclo.
      void unaVuelta()
    }
  }, [mesaId, incluirConfiguracion])
}
