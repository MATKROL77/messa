import { createHmac, timingSafeEqual } from 'crypto'

// Sesión firmada sin base de datos: el server firma { email, rol, exp } con una
// clave secreta que SOLO vive en variables de entorno (SESSION_SECRET). El
// cliente no puede falsificarla porque no conoce el secreto — a diferencia del
// esquema anterior, donde todo (incluida la password maestra) vivía en el
// bundle de JS y cualquiera podía leerlo o modificarlo con las devtools.
//
// Esto NO reemplaza a una base de datos real: sirve para validar los 3 roles
// fijos definidos por variables de entorno (ver .env.example). Para usuarios
// creados dinámicamente en tiempo de ejecución hace falta persistencia real
// (Supabase/D1) — ver LEEME.md.

export interface SesionPayload {
  email: string
  nombre: string
  rol: 'creator' | 'admin' | 'gerente' | 'editor' | 'staff'
  exp: number
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error('SESSION_SECRET no está configurado. Definilo en tus variables de entorno (ver .env.example).')
  }
  return secret
}

function sign(data: string): string {
  return createHmac('sha256', getSecret()).update(data).digest('base64url')
}

export function crearToken(payload: SesionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const firma = sign(data)
  return `${data}.${firma}`
}

export function verificarToken(token: string | undefined | null): SesionPayload | null {
  if (!token) return null
  const [data, firma] = token.split('.')
  if (!data || !firma) return null
  try {
    const firmaEsperada = sign(data)
    const a = Buffer.from(firma)
    const b = Buffer.from(firmaEsperada)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    const payload: SesionPayload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'))
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}
