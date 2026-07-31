'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, QrCode } from 'lucide-react'
import MessaWordmark from '@/components/messa-wordmark'
import { useStore } from '@/lib/store'
import { formatearCodigo } from '@/lib/mesa-codigo'
import { resolverMesaPorCodigo } from '@/lib/acceso-mesa'

/**
 * Destino corto que se imprime dentro del QR de cada mesa: `/m/XXXX-XXXX`.
 * El servidor resuelve el código a su mesa y se entra con el permiso ya
 * validado, así el comensal nunca ve un id interno ni puede deducir el de la
 * mesa vecina.
 */
export default function AccesoPorCodigoClient() {
  const params = useParams()
  const router = useRouter()
  const codigo = decodeURIComponent(String(params.codigo || ''))
  const { initStore, mesas } = useStore()
  const [estado, setEstado] = useState<'resolviendo' | 'sin-mesa'>('resolviendo')

  useEffect(() => { initStore() }, [initStore])

  useEffect(() => {
    if (mesas.length === 0) return
    let vigente = true

    void resolverMesaPorCodigo(codigo, mesas).then(mesaId => {
      if (!vigente) return
      if (mesaId) router.replace(`/mesa/${mesaId}?c=${encodeURIComponent(formatearCodigo(codigo))}`)
      else setEstado('sin-mesa')
    })

    return () => { vigente = false }
  }, [codigo, mesas, router])

  if (estado === 'resolviendo') {
    return <div className="mesa-gate mesa-gate--loading" role="status" aria-live="polite"><span className="menu-spinner" /><p>Abriendo tu mesa…</p></div>
  }

  return (
    <main className="mesa-gate">
      <div className="mesa-gate__toolbar"><MessaWordmark /></div>
      <section className="mesa-gate__card">
        <span className="mesa-gate__icon" aria-hidden="true"><QrCode size={26} strokeWidth={1.7} /></span>
        <p className="eyebrow">CÓDIGO NO RECONOCIDO</p>
        <h1>Este QR no abre ninguna mesa</h1>
        <p className="mesa-gate__lead">
          El código <strong>{formatearCodigo(codigo)}</strong> no corresponde a ninguna mesa de este
          local. Pedile ayuda al personal de salón.
        </p>
        <Link href="/vista" className="mesa-gate__secondary"><BookOpen size={16} />Ver la carta mientras tanto</Link>
      </section>
    </main>
  )
}
