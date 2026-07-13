import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Cliente de Supabase — listo para usar, pero TODAVÍA NO conectado al store
// (lib/store.ts sigue leyendo/escribiendo en localStorage). Conectarlo del
// todo implica reemplazar cada acción del store por una llamada a Supabase +
// una suscripción realtime — ver LEEME.md → "Conectar Supabase" para la guía
// paso a paso. El schema listo para correr está en supabase/schema.sql.
//
// No lanza error si faltan las variables de entorno: devuelve `null` para
// que el resto de la app (que hoy no depende de esto) no se rompa.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

export const supabaseConfigurado = Boolean(supabaseUrl && supabaseAnonKey)
