'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, QrCode, ScanLine, ShieldCheck } from 'lucide-react'
import MessaWordmark from '@/components/messa-wordmark'
import PublicThemeToggle from './PublicThemeToggle'

/**
 * Puerta de entrada a una mesa. Aparece cuando alguien llega a `/mesa/x` sin el
 * código que viaja en el QR — por ejemplo escribiendo la URL a mano para
 * colarse en la mesa de al lado. Deja escribir el código impreso en la
 * tarjetita por si el QR está rayado, y ofrece la carta en modo vista.
 */
export default function TableAccessGate({ mesaNumero, error, onSubmit }: {
  mesaNumero?: number
  error?: string
  onSubmit: (codigo: string) => void | Promise<void>
}) {
  const [codigo, setCodigo] = useState('')
  const [verificando, setVerificando] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!codigo.trim() || verificando) return
    setVerificando(true)
    try {
      await onSubmit(codigo)
    } finally {
      setVerificando(false)
    }
  }

  return (
    <main className="mesa-gate">
      <div className="mesa-gate__toolbar"><MessaWordmark /><PublicThemeToggle compact /></div>

      <section className="mesa-gate__card">
        <span className="mesa-gate__icon" aria-hidden="true"><QrCode size={26} strokeWidth={1.7} /></span>
        <p className="eyebrow">ACCESO A LA MESA</p>
        <h1>{mesaNumero ? `Mesa ${mesaNumero}` : 'Escaneá el QR de tu mesa'}</h1>
        <p className="mesa-gate__lead">
          Cada mesa tiene su propio código. Escaneá el QR que está sobre la mesa
          o escribí el código impreso debajo del código QR.
        </p>

        <form onSubmit={handleSubmit} className="mesa-gate__form">
          <label htmlFor="codigo-mesa">Código de la mesa</label>
          <input
            id="codigo-mesa"
            value={codigo}
            onChange={event => setCodigo(event.target.value.toUpperCase())}
            placeholder="XXXX-XXXX"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            inputMode="text"
            maxLength={12}
            aria-describedby={error ? 'codigo-mesa-error' : undefined}
            aria-invalid={Boolean(error)}
          />
          {error && <p className="mesa-gate__error" id="codigo-mesa-error" role="alert">{error}</p>}
          <button type="submit" className="mesa-gate__submit" disabled={!codigo.trim() || verificando}>
            {verificando ? 'Verificando…' : <>Entrar a la mesa <ArrowRight size={17} /></>}
          </button>
        </form>

        <div className="mesa-gate__note"><ShieldCheck size={16} aria-hidden="true" /><span>El código evita que alguien sume consumos a la cuenta de otra mesa.</span></div>
        <div className="mesa-gate__note"><ScanLine size={16} aria-hidden="true" /><span>Si tu mesa tiene tarjeta RFID/NFC, apoyá el teléfono sobre ella y entrás directo.</span></div>

        <Link href="/vista" className="mesa-gate__secondary"><BookOpen size={16} />Ver la carta sin pedir</Link>
      </section>
    </main>
  )
}
