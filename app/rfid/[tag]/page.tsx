import AccesoPorRfidClient from './rfid-client'

/**
 * Los identificadores de tarjeta tampoco se pueden enumerar: en la exportación
 * estática se genera una ruta de muestra y la resolución ocurre en el
 * navegador con la vinculación cargada en el dispositivo.
 */
export function generateStaticParams() {
  return [{ tag: 'tarjeta' }]
}

export default function AccesoPorRfidPage() {
  return <AccesoPorRfidClient />
}
