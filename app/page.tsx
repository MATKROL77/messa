'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, Clock3, MapPin, Sparkles, Utensils } from 'lucide-react'
import { useStore } from '@/lib/store'
import DishMedia from '@/components/menu/DishMedia'
import Footer from '@/components/Footer'

export default function Home() {
  const { initStore, config, platos, sucursales, sucursalActualId } = useStore()
  useEffect(() => { initStore() }, [initStore])
  const featured = platos.find(plato => plato.destacado && plato.disponible) || platos.find(plato => plato.disponible)
  const branch = sucursales.find(item => item.id === sucursalActualId)

  return <main className="messa-home">
    {/* Dos puertas distintas y bien separadas: la de los comensales (su cuenta
        y sus puntos) y la del equipo (el backoffice). */}
    <nav className="messa-home__nav">
      <Link href="/" className="messa-wordmark">MESSA</Link>
      <span className="messa-home__links">
        <Link href="/cuenta" className="messa-home__account-link"><Sparkles size={15} aria-hidden="true" />Mi cuenta</Link>
        <Link href="/login" className="messa-home__staff-link">Acceso al equipo</Link>
      </span>
    </nav>
    <section className="messa-home__hero">
      <div className="messa-home__intro"><p className="eyebrow">DINING, MADE PRECISE</p><h1>La mesa empieza<br />antes del primer bocado.</h1><p>Una experiencia culinaria más simple, más íntima y hecha a tu ritmo.</p><Link href="/vista" className="messa-home__cta">Explorar la carta <ArrowRight size={18} /></Link></div>
      {featured && <div className="messa-home__dish"><DishMedia plato={featured} variant="hero" /><div className="messa-home__dish-label"><span>SELECCIÓN DEL CHEF</span><strong>{featured.nombre}</strong></div></div>}
    </section>
    <section className="messa-home__info"><div><MapPin size={19} /><span><b>{branch?.nombre || config.nombre}</b><small>{branch?.direccion || 'Ubicación a confirmar'}</small></span></div><div><Clock3 size={19} /><span><b>Abierto hoy</b><small>Horarios del restaurante</small></span></div><div><Utensils size={19} /><span><b>Pedido desde la mesa</b><small>Escaneá el QR al sentarte</small></span></div></section>
    <Footer nombre={config.nombre} />
  </main>
}
