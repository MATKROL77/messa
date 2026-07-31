'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, ScanLine } from 'lucide-react'
import MessaWordmark from '@/components/messa-wordmark'
import { useStore } from '@/lib/store'
import { formatearCodigo, normalizarTagRfid } from '@/lib/mesa-codigo'

/**
 * Entrada por lector RFID. Los lectores USB del atril emiten el UID de la
 * tarjeta, no una dirección: esta ruta traduce ese UID a su mesa usando la
 * vinculación que cargó el equipo y entra con el código ya resuelto.
 *
 * Para los tags NFC pegados en la mesa —que sí guardan una dirección— se graba
 * directamente el enlace `/m/<codigo>`, el mismo del QR: así funcionan en
 * cualquier teléfono sin depender de la vinculación local.
 */
export default function AccesoPorRfidClient() {
  const params = useParams()
  const router = useRouter()
  const tag = normalizarTagRfid(decodeURIComponent(String(params.tag || '')))
  const { initStore, mesas, buscarMesaPorRfid } = useStore()

  useEffect(() => { initStore() }, [initStore])

  const mesa = mesas.length ? buscarMesaPorRfid(tag) : null

  useEffect(() => {
    if (!mesa) return
    // Si este dispositivo ya tiene el código de la mesa (porque pasó por el
    // panel), entra directo; si no, la mesa lo pide en la pantalla de acceso.
    router.replace(mesa.codigo_acceso
      ? `/mesa/${mesa.id}?c=${encodeURIComponent(formatearCodigo(mesa.codigo_acceso))}`
      : `/mesa/${mesa.id}`)
  }, [mesa, router])

  if (mesa) {
    return <div className="mesa-gate mesa-gate--loading" role="status" aria-live="polite"><span className="menu-spinner" /><p>Leyendo tu tarjeta…</p></div>
  }

  return (
    <main className="mesa-gate">
      <div className="mesa-gate__toolbar"><MessaWordmark /></div>
      <section className="mesa-gate__card">
        <span className="mesa-gate__icon" aria-hidden="true"><ScanLine size={26} strokeWidth={1.7} /></span>
        <p className="eyebrow">TARJETA SIN MESA</p>
        <h1>Esta tarjeta todavía no tiene mesa</h1>
        <p className="mesa-gate__lead">
          El identificador <strong>{tag || '—'}</strong> no está vinculado a ninguna mesa. El equipo
          puede vincularlo desde Administración → Mesas y códigos QR.
        </p>
        <Link href="/vista" className="mesa-gate__secondary"><BookOpen size={16} />Ver la carta mientras tanto</Link>
      </section>
    </main>
  )
}
