// Cliente de Supabase con SERVICE ROLE — sólo servidor.
//
// La service role key saltea Row Level Security, así que esta clave NO puede
// tocar el bundle del navegador bajo ninguna circunstancia. Por eso:
//   · la variable NO lleva prefijo NEXT_PUBLIC_, así que Next.js no la
//     inyecta en el bundle de cliente ni aunque se importe por error;
//   · vive únicamente en los secrets del Worker (wrangler secret put);
//   · este módulo sólo se importa desde route handlers (app/api/**).
//
// Usa fetch contra PostgREST en vez de @supabase/supabase-js: en el runtime de
// Cloudflare Workers es una dependencia menos y el control de errores es
// explícito.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const baseDatosLista = Boolean(url && serviceKey)

/** Error con el status HTTP de PostgREST, para distinguir "no existe la tabla"
 *  (404 / PGRST205) de un fallo real. */
export class ErrorSupabase extends Error {
  status: number
  codigo?: string
  constructor(mensaje: string, status: number, codigo?: string) {
    super(mensaje)
    this.name = 'ErrorSupabase'
    this.status = status
    this.codigo = codigo
  }
  /** true cuando la tabla todavía no fue creada (falta correr la migración). */
  get tablaFaltante() {
    return this.status === 404 || this.codigo === 'PGRST205' || this.codigo === '42P01'
  }
}

interface OpcionesRest {
  metodo?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  query?: string
  body?: unknown
  /** Prefer: return=representation devuelve la fila resultante. */
  devolverFila?: boolean
  /** Prefer: resolution=merge-duplicates convierte el insert en upsert. */
  upsert?: boolean
}

async function rest<T>(tabla: string, opciones: OpcionesRest = {}): Promise<T> {
  if (!url || !serviceKey) {
    throw new ErrorSupabase('Supabase no está configurado en el servidor', 503)
  }

  const { metodo = 'GET', query = '', body, devolverFila, upsert } = opciones
  const prefer: string[] = []
  if (devolverFila) prefer.push('return=representation')
  else if (metodo !== 'GET') prefer.push('return=minimal')
  if (upsert) prefer.push('resolution=merge-duplicates')

  const res = await fetch(`${url}/rest/v1/${tabla}${query}`, {
    method: metodo,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...(prefer.length ? { Prefer: prefer.join(',') } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  })

  if (!res.ok) {
    let mensaje = `Supabase respondió ${res.status}`
    let codigo: string | undefined
    try {
      const detalle = await res.json() as { message?: string; code?: string }
      if (detalle?.message) mensaje = detalle.message
      if (detalle?.code) codigo = detalle.code
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    throw new ErrorSupabase(mensaje, res.status, codigo)
  }

  if (res.status === 204) return undefined as T
  const texto = await res.text()
  return (texto ? JSON.parse(texto) : undefined) as T
}

export const db = {
  /** Devuelve las filas que matcheen la query PostgREST (`?email=eq.x`). */
  seleccionar<T>(tabla: string, query = ''): Promise<T[]> {
    return rest<T[]>(tabla, { query })
  },
  /** Primera fila o null. */
  async primera<T>(tabla: string, query: string): Promise<T | null> {
    const filas = await rest<T[]>(tabla, { query: `${query}&limit=1` })
    return filas?.[0] ?? null
  },
  async insertar<T>(tabla: string, fila: unknown, upsert = false): Promise<T> {
    const filas = await rest<T[]>(tabla, { metodo: 'POST', body: fila, devolverFila: true, upsert })
    return filas[0]
  },
  async actualizar<T>(tabla: string, query: string, cambios: unknown): Promise<T | null> {
    const filas = await rest<T[]>(tabla, { metodo: 'PATCH', query, body: cambios, devolverFila: true })
    return filas?.[0] ?? null
  },
  eliminar(tabla: string, query: string): Promise<void> {
    return rest<void>(tabla, { metodo: 'DELETE', query })
  },
}

/** Escapa un valor para usarlo en un filtro PostgREST (`?email=eq.<valor>`). */
export function filtro(valor: string): string {
  return encodeURIComponent(valor)
}
