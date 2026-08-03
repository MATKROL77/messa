'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { withBasePath } from '@/lib/base-path'
import MessaWordmark from '@/components/messa-wordmark'

/**
 * Fija en este dispositivo a qué restaurante pertenece la dirección que se
 * abrió, y sigue a la carta.
 *
 * Se hace acá y no en el servidor porque el estado de la app vive en el
 * navegador: el servidor puede decir "bonafide es org-bonafide-x9", pero
 * quien tiene que recordarlo para las próximas pantallas es el dispositivo.
 */
export default function RestauranteEntrada({ slug }: { slug: string }) {
  const router = useRouter()
  const setOrganizacionActual = useStore(estado => estado.setOrganizacionActual)
  const [error, setError] = useState('')

  useEffect(() => {
    let vigente = true
    fetch(withBasePath(`/api/organizacion?slug=${encodeURIComponent(slug)}`))
      .then(async respuesta => {
        const datos = await respuesta.json() as { ok?: boolean; organizacion?: { id: string; nombre: string }; error?: string }
        if (!vigente) return
        if (!respuesta.ok || !datos.ok || !datos.organizacion) {
          setError(datos.error || 'No encontramos ese restaurante.')
          return
        }
        setOrganizacionActual(datos.organizacion.id)
        router.replace('/vista')
      })
      .catch(() => { if (vigente) setError('No pudimos conectarnos.') })
    return () => { vigente = false }
  }, [router, setOrganizacionActual, slug])

  return (
    <main className="messa-entrada">
      <MessaWordmark />
      {error ? (
        <>
          <h1>{error}</h1>
          <p>Revisá el enlace o pedile el QR al personal.</p>
          <Link href="/">Ir al inicio</Link>
        </>
      ) : (
        <p role="status">Abriendo la carta…</p>
      )}
    </main>
  )
}
