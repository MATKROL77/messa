export const formatPrecio = (precio: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(precio)
}

export const formatPrecioCarta = (precio: number, precioPendiente?: boolean): string => {
  return precioPendiente ? 'Precio a definir' : formatPrecio(precio)
}

export const generarId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
}

export const obtenerDispositivoId = (): string => {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('mf_device_id')
  if (!id) {
    id = 'dev_' + generarId()
    localStorage.setItem('mf_device_id', id)
  }
  return id
}

export const tiempoTranscurrido = (fecha: string): string => {
  const diff = Date.now() - new Date(fecha).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

export const tiempoEnMinutos = (fecha: string): number => {
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 60000)
}

export const clsx = (...classes: (string | boolean | undefined | null)[]): string => {
  return classes.filter(Boolean).join(' ')
}

export const validarEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export const limpiarIconoLegacy = (texto: string): string => {
  return texto.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, '').trimStart()
}
