// Las 3 cuentas "oficiales" del sistema viven ahora en variables de entorno del
// SERVIDOR, nunca en el bundle de cliente ni en localStorage. Para cambiar una
// contraseña: generá un hash nuevo con `node scripts/generar-hash.js "nueva"`,
// actualizá la variable de entorno correspondiente, y redeployá.
//
// Esto reemplaza al MASTER_PASSWORD hardcodeado que existía antes en
// lib/store.ts — ya no está en el código fuente en ningún lado.

export type RolFijo = 'creator' | 'admin' | 'gerente' | 'editor' | 'staff'

export interface CuentaFija {
  email: string
  passwordHash: string
  nombre: string
  rol: RolFijo
}

export function obtenerCuentasFijas(): CuentaFija[] {
  const cuentas: CuentaFija[] = []

  // Cuenta local aislada para revisar el panel en localhost. Se configura en
  // .env.local y no se incluye en builds ni en el bundle del cliente.
  if (process.env.MESSA_LOCAL_ADMIN_EMAIL && process.env.MESSA_LOCAL_ADMIN_PASSWORD_HASH) {
    cuentas.push({
      email: process.env.MESSA_LOCAL_ADMIN_EMAIL,
      passwordHash: process.env.MESSA_LOCAL_ADMIN_PASSWORD_HASH,
      nombre: process.env.MESSA_LOCAL_ADMIN_NOMBRE || 'Administrador local',
      rol: 'admin',
    })
  }

  if (process.env.CREATOR_EMAIL && process.env.CREATOR_PASSWORD_HASH) {
    cuentas.push({ email: process.env.CREATOR_EMAIL, passwordHash: process.env.CREATOR_PASSWORD_HASH, nombre: process.env.CREATOR_NOMBRE || 'Creador', rol: 'creator' })
  }
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_HASH) {
    cuentas.push({ email: process.env.ADMIN_EMAIL, passwordHash: process.env.ADMIN_PASSWORD_HASH, nombre: process.env.ADMIN_NOMBRE || 'Dueño del restaurante', rol: 'admin' })
  }
  if (process.env.GERENTE_EMAIL && process.env.GERENTE_PASSWORD_HASH) {
    cuentas.push({ email: process.env.GERENTE_EMAIL, passwordHash: process.env.GERENTE_PASSWORD_HASH, nombre: process.env.GERENTE_NOMBRE || 'Gerente', rol: 'gerente' })
  }
  if (process.env.EDITOR_EMAIL && process.env.EDITOR_PASSWORD_HASH) {
    cuentas.push({ email: process.env.EDITOR_EMAIL, passwordHash: process.env.EDITOR_PASSWORD_HASH, nombre: process.env.EDITOR_NOMBRE || 'Editor', rol: 'editor' })
  }
  if (process.env.STAFF_EMAIL && process.env.STAFF_PASSWORD_HASH) {
    cuentas.push({ email: process.env.STAFF_EMAIL, passwordHash: process.env.STAFF_PASSWORD_HASH, nombre: process.env.STAFF_NOMBRE || 'Personal de salón', rol: 'staff' })
  }

  return cuentas
}
