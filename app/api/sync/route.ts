import { NextRequest, NextResponse } from 'next/server'
import { verificarToken, ORGANIZACION_POR_DEFECTO } from '@/lib/session'
import { resolverVersion, hayClaveDeCodigos } from '@/lib/mesa-codigo-server'
import { db, filtro, baseDatosLista, ErrorSupabase } from '@/lib/supabase-admin'

/**
 * Sincronización del estado operativo entre dispositivos.
 *
 * Antes de esto, mesas, pedidos y llamados vivían sólo en el navegador de cada
 * dispositivo: un pedido hecho desde el celular del comensal no existía para
 * la computadora de la cocina. Cada equipo tenía su propia realidad.
 *
 * Una sola llamada hace las dos cosas —empuja lo que cambió acá y devuelve lo
 * que cambió allá— para que el celular de un comensal no gaste dos viajes de
 * red por ciclo.
 *
 * Resolución de conflictos: gana la versión más nueva de CADA entidad, no del
 * conjunto. Dos mozos tocando mesas distintas al mismo tiempo no se pisan; dos
 * tocando la MISMA mesa sí — el último en escribir manda. Para un salón real
 * alcanza; si algún día hace falta más, el paso siguiente es mover la decisión
 * a Postgres con una función que compare por campo.
 */

type TipoOperativo = 'mesa' | 'pedido' | 'llamado' | 'elemento' | 'bitacora'
/**
 * Los datos que edita el dueño desde un solo lugar viajan agrupados por
 * dominio, no entidad por entidad: la carta entera en un paquete, el stock en
 * otro. Es más simple y el riesgo real —dos personas editando la MISMA carta
 * al mismo tiempo desde equipos distintos— casi no existe en un restaurante.
 * Separarlos por dominio evita lo que sí podría pasar: que guardar un gasto
 * pise un cambio de la carta.
 */
type TipoPaquete = 'carta' | 'stock' | 'agenda' | 'finanzas' | 'ajustes'
type TipoEntidad = TipoOperativo | TipoPaquete

interface Entidad {
  id: string
  tipo: TipoEntidad
  sucursal_id: string
  payload: unknown
  updated_at: string
}

interface Solicitud {
  sucursalId?: string
  /**
   * Sólo la usa el comensal, que no tiene sesión. Del equipo NO se lee: la
   * suya sale del token firmado, porque un dato que manda el navegador no
   * puede decidir a qué restaurante se entra.
   */
  organizacionId?: string
  /** Marca de tiempo de la última sincronización; se devuelve lo posterior. */
  desde?: string
  entidades?: Entidad[]
  /** Credencial del comensal: sin sesión de equipo, tiene que probar su mesa. */
  mesaId?: string
  codigo?: string
}

const TIPOS_OPERATIVOS: TipoOperativo[] = ['mesa', 'pedido', 'llamado', 'elemento', 'bitacora']
const TIPOS_PAQUETE: TipoPaquete[] = ['carta', 'stock', 'agenda', 'finanzas', 'ajustes']
const TIPOS: TipoEntidad[] = [...TIPOS_OPERATIVOS, ...TIPOS_PAQUETE]
const MAX_ENTIDADES = 400

export async function POST(req: NextRequest) {
  if (!baseDatosLista) {
    return NextResponse.json({ ok: false, error: 'sin-base' }, { status: 503 })
  }

  let body: Solicitud
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Solicitud inválida' }, { status: 400 })
  }

  const sucursalId = (body.sucursalId || '').trim()
  if (!sucursalId) return NextResponse.json({ ok: false, error: 'Falta la sucursal' }, { status: 400 })

  // Dos puertas de entrada. El equipo entra con su sesión; el comensal, con el
  // código que sólo se obtiene escaneando el QR físico de su mesa.
  const sesionStaff = verificarToken(req.cookies.get('mf_session')?.value)
  let mesaDelComensal: string | null = null
  // El restaurante del equipo sale de su token; el del comensal, de su código.
  let organizacionId = sesionStaff?.organizacionId || ORGANIZACION_POR_DEFECTO
  if (!sesionStaff) {
    if (!hayClaveDeCodigos()) return NextResponse.json({ ok: false, error: 'sin-clave' }, { status: 503 })
    const mesaId = (body.mesaId || '').trim()
    const codigo = (body.codigo || '').trim()
    const organizacionPedida = (body.organizacionId || '').trim() || ORGANIZACION_POR_DEFECTO
    // El código se deriva CON la organización, así que decir "soy de este
    // restaurante" no alcanza: hay que traer un código que sólo existe si
    // realmente lo es. Un QR del local de al lado no valida acá.
    if (!mesaId || !codigo || resolverVersion(mesaId, codigo, organizacionPedida) === null) {
      return NextResponse.json({ ok: false, error: 'Sin acceso a esta mesa.' }, { status: 403 })
    }
    mesaDelComensal = mesaId
    organizacionId = organizacionPedida
  }

  // La vitrina del portfolio mira y toca, pero no escribe. Se corta acá, en
  // el servidor, y no sólo en la pantalla: es lo único que garantiza que un
  // visitante curioso con las herramientas de desarrollo no pueda tocar los
  // datos de un restaurante real. Sigue LEYENDO con normalidad, para que la
  // demostración se vea viva.
  const soloMira = sesionStaff?.rol === 'vitrina'

  const entrantes = (soloMira ? [] : body.entidades || [])
    .filter(e => e && typeof e.id === 'string' && TIPOS.includes(e.tipo) && e.payload)
    .slice(0, MAX_ENTIDADES)
    // Un comensal sólo puede escribir sobre SU mesa y sobre pedidos de esa
    // mesa. Sin esto, cualquiera con un código válido podría reescribir el
    // salón entero desde su teléfono.
    .filter(e => {
      if (!mesaDelComensal) return true
      // El plano y la configuración los toca el panel; un teléfono nunca.
      if (e.tipo === 'elemento') return false
      // La bitácora la escribe el panel. Si un teléfono pudiera agregar
      // líneas, el registro dejaría de servir como prueba de nada.
      if (e.tipo === 'bitacora') return false
      if (TIPOS_PAQUETE.includes(e.tipo as TipoPaquete)) return false
      if (e.tipo === 'mesa') return e.id === mesaDelComensal
      const payload = e.payload as { mesa_id?: string }
      return payload?.mesa_id === mesaDelComensal
    })

  try {
    if (entrantes.length) {
      await db.insertar(
        'estado_operativo',
        entrantes.map(e => ({
          id: e.id,
          tipo: e.tipo,
          organizacion_id: organizacionId,
          sucursal_id: sucursalId,
          payload: e.payload,
          updated_at: e.updated_at || new Date().toISOString(),
        })),
        true, // upsert
      )
    }

    // `desde` viene del reloj del SERVIDOR (lo devolvemos abajo), no del
    // dispositivo: si un celular está atrasado unos minutos, filtrar por su
    // hora le escondería cambios reales.
    const desde = body.desde || '1970-01-01T00:00:00Z'
    const cambios = await db.seleccionar<Entidad>(
      'estado_operativo',
      `?organizacion_id=eq.${filtro(organizacionId)}&sucursal_id=eq.${filtro(sucursalId)}&updated_at=gt.${filtro(desde)}&select=id,tipo,payload,updated_at&order=updated_at.asc&limit=1000`,
    )

    return NextResponse.json({ ok: true, cambios, ahora: new Date().toISOString() })
  } catch (error) {
    if (error instanceof ErrorSupabase && error.tablaFaltante) {
      return NextResponse.json(
        { ok: false, error: 'Falta correr supabase/migration_05_estado_operativo.sql' },
        { status: 503 },
      )
    }
    console.error('Error sincronizando el estado operativo', error)
    return NextResponse.json({ ok: false, error: 'No se pudo sincronizar' }, { status: 500 })
  }
}
