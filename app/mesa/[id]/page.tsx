import { Suspense } from 'react'
import MesaClient from './mesa-client'
import { idsDeMesaEstaticos } from '@/lib/mesas-estaticas'

/**
 * La experiencia de mesa es completamente cliente; este archivo existe sólo
 * para poder declarar `generateStaticParams`, que es lo que permite publicar
 * MESSA también como sitio estático. En el despliegue con servidor la ruta
 * sigue siendo dinámica y atiende cualquier id de mesa.
 */
export function generateStaticParams() {
  return idsDeMesaEstaticos()
}

export default function MesaPage() {
  // `MesaClient` lee la query (`?c=`, la vuelta de Mercado Pago), así que
  // necesita una frontera de Suspense para poder prerenderizarse.
  return (
    <Suspense fallback={<div className="mesa-gate mesa-gate--loading" role="status"><span className="menu-spinner" /><p>Abriendo tu mesa…</p></div>}>
      <MesaClient />
    </Suspense>
  )
}
