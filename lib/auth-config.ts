// Las 3 cuentas "oficiales" del sistema viven ahora en variables de entorno del
// SERVIDOR, nunca en el bundle de cliente ni en localStorage. Para cambiar una
// contraseña: generá un hash nuevo con `node scripts/generar-hash.js "nueva"`,
// actualizá la variable de entorno correspondiente, y redeployá.
//
// Esto reemplaza al MASTER_PASSWORD hardcodeado que existía antes en
// lib/store.ts — ya no está en el código fuente en ningún lado.

export type RolFijo = 'creator' | 'admin' | 'editor'

export interface CuentaFija {
  email: string
  passwordHash: string
  nombre: string
  rol: RolFijo
}

export function obtenerCuentasFijas(): CuentaFija[] {
  const cuentas: CuentaFija[] = []

  if (process.env.CREATOR_EMAIL && process.env.CREATOR_PASSWORD_HASH) {
    cuentas.push({ email: process.env.CREATOR_EMAIL, passwordHash: process.env.CREATOR_PASSWORD_HASH, nombre: process.env.CREATOR_NOMBRE || 'Creador', rol: 'creator' })
  }
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_HASH) {
    cuentas.push({ email: process.env.ADMIN_EMAIL, passwordHash: process.env.ADMIN_PASSWORD_HASH, nombre: process.env.ADMIN_NOMBRE || 'Dueño del restaurante', rol: 'admin' })
  }
  if (process.env.EDITOR_EMAIL && process.env.EDITOR_PASSWORD_HASH) {
    cuentas.push({ email: process.env.EDITOR_EMAIL, passwordHash: process.env.EDITOR_PASSWORD_HASH, nombre: process.env.EDITOR_NOMBRE || 'Editor', rol: 'editor' })
  }

  return cuentas
}
