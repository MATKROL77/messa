'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { withBasePath } from '@/lib/base-path'
import MessaWordmark from '@/components/messa-wordmark'

export default function DemoEntrada() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    let vigente = true
    fetch(withBasePath('/api/auth/demo'), { method: 'POST' })
      .then(async respuesta => {
        const datos = await respuesta.json().catch(() => ({})) as { ok?: boolean; error?: string }
        if (!vigente) return
        if (!respuesta.ok || !datos.ok) { setError(datos.error || 'No pudimos abrir la demostración.'); return }
        router.replace('/admin')
      })
      .catch(() => { if (vigente) setError('No pudimos conectarnos.') })
    return () => { vigente = false }
  }, [router])

  return (
    <main className="messa-entrada">
      <MessaWordmark />
      {error ? (
        <>
          <h1>{error}</h1>
          <Link href="/">Ir al inicio</Link>
        </>
      ) : (
        <p role="status">Abriendo la demostración…</p>
      )}
    </main>
  )
}
