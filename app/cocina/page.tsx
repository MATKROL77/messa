'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, ChefHat, CircleCheckBig, Clock3, PackageCheck, Printer, ReceiptText, Truck, X } from 'lucide-react'
import AdminOperationShell from '@/components/admin-operation-shell'
import { useStore } from '@/lib/store'
import type { Pedido } from '@/types'
import { formatPrecio, tiempoEnMinutos, tiempoTranscurrido } from '@/lib/utils'
import { AdminButton, AdminEmpty, AdminMetric, AdminPanel, AdminSegmented, AdminSheet, AdminStatus, AdminToast, AdminWorkspace } from '@/components/admin/admin-ui'
import ComandaImpresa from '@/components/admin/comanda-impresa'
import DishMedia from '@/components/menu/DishMedia'

type Filtro = 'activos' | 'en_cocina' | 'listo' | 'entregado'

export default function CocinaPage() {
  const { pedidos, marcarPedidoListo, marcarPedidoEntregado, cancelarPedido, insumos, sucursalActualId, sucursales, config } = useStore()
  const [filtro, setFiltro] = useState<Filtro>('activos')
  const [seleccionado, setSeleccionado] = useState<Pedido | null>(null)
  const [toast, setToast] = useState('')
  const [, tick] = useState(0)
  useEffect(() => {
    const interval = window.setInterval(() => tick(value => value + 1), 15000)
    return () => window.clearInterval(interval)
  }, [])

  const sucursal = sucursales.find(item => item.id === sucursalActualId)
  const actuales = pedidos.filter(pedido => pedido.sucursal_id === sucursalActualId && pedido.estado !== 'cancelado')
  const enCocina = actuales.filter(pedido => pedido.estado === 'en_cocina')
  const listos = actuales.filter(pedido => pedido.estado === 'listo')
  const entregados = actuales.filter(pedido => pedido.estado === 'entregado')
  const urgentes = enCocina.filter(pedido => tiempoEnMinutos(pedido.created_at) >= 20)
  const criticos = insumos.filter(item => item.sucursal_id === sucursalActualId && item.activo && item.cantidad <= item.cantidad_critica)
  const filtrados = useMemo(() => actuales
    .filter(pedido => filtro === 'activos' ? ['en_cocina', 'listo'].includes(pedido.estado) : pedido.estado === filtro)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()), [actuales, filtro])

  /**
   * Una comanda por MESA, no por teléfono.
   *
   * Cuatro personas sentadas juntas pedían desde sus cuatro celulares y a la
   * cocina le entraban cuatro comandas de la misma mesa: hay que cocinarlas
   * juntas igual, y salen juntas al salón. Se agrupan los pedidos que siguen
   * vivos de una misma mesa.
   *
   * No se fusionan los pedidos guardados, sólo se muestran juntos. Cada uno
   * conserva de qué teléfono vino, que es lo que permite después dividir la
   * cuenta o anular lo de una sola persona.
   *
   * Los pedidos ya entregados no arrastran: si la mesa pide el postre una
   * hora después, entra como comanda nueva, que es lo correcto.
   */
  const comandas = useMemo(() => {
    const porMesa = new Map<string, Pedido[]>()
    for (const pedido of filtrados) {
      const grupo = porMesa.get(pedido.mesa_id)
      if (grupo) grupo.push(pedido); else porMesa.set(pedido.mesa_id, [pedido])
    }
    return [...porMesa.values()].map(pedidos => {
      const items = pedidos.flatMap(pedido => pedido.items)
      return {
        id: pedidos[0].id,
        pedidos,
        mesa_numero: pedidos[0].mesa_numero,
        origen: pedidos[0].origen,
        // El reloj corre desde la PRIMERA ronda: es lo que lleva esperando la
        // mesa, no lo que lleva esperando el último en pedir.
        created_at: pedidos[0].created_at,
        // El estado del conjunto es el del más atrasado: si falta un plato,
        // la mesa no está lista.
        estado: pedidos.some(pedido => pedido.estado === 'en_cocina') ? 'en_cocina' : pedidos[0].estado,
        items,
        total: pedidos.reduce((suma, pedido) => suma + pedido.total, 0),
      }
    }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }, [filtrados])

  const showToast = (mensaje: string) => {
    setToast(mensaje)
    window.setTimeout(() => setToast(''), 2200)
  }

  /** Las rondas de una mesa se marcan juntas: salen juntas al salón. */
  const rondasDe = (pedido: Pedido) =>
    comandas.find(comanda => comanda.pedidos.some(item => item.id === pedido.id))?.pedidos || [pedido]

  const listo = (pedido: Pedido) => {
    const rondas = rondasDe(pedido)
    rondas.forEach(item => marcarPedidoListo(item.id))
    setSeleccionado(null)
    showToast(`Mesa ${pedido.mesa_numero} lista${rondas.length > 1 ? ` (${rondas.length} rondas)` : ''}`)
  }
  const entregar = (pedido: Pedido) => {
    const rondas = rondasDe(pedido)
    rondas.forEach(item => marcarPedidoEntregado(item.id))
    setSeleccionado(null)
    showToast(`Mesa ${pedido.mesa_numero} entregada`)
  }
  const cancelar = (pedido: Pedido) => {
    // Anular sí es por pedido, no por mesa: se anula lo de una persona, no la
    // comida de los otros tres.
    cancelarPedido(pedido.id)
    setSeleccionado(null)
    showToast('Pedido anulado')
  }

  return (
    <AdminOperationShell>
      <AdminWorkspace
        eyebrow="Operación de cocina"
        title="Ver pedidos"
        description={`Comandas en tiempo real, prioridades y entrega para ${sucursal?.nombre || 'la sucursal actual'}.`}
        actions={<AdminSegmented<Filtro> value={filtro} onChange={setFiltro} label="Filtrar pedidos" items={[{ value: 'activos', label: 'Activos', count: enCocina.length + listos.length }, { value: 'en_cocina', label: 'En cocina', count: enCocina.length }, { value: 'listo', label: 'Listos', count: listos.length }, { value: 'entregado', label: 'Entregados', count: entregados.length }]} />}
      >
        <AdminToast>{toast}</AdminToast>

        <div className="messa-metrics">
          <AdminMetric label="En preparación" value={`${enCocina.length}`} detail="Comandas activas" Icon={ChefHat} tone="gold" progress={Math.min(100, enCocina.length * 12)} />
          <AdminMetric label="Listos para salir" value={`${listos.length}`} detail="Esperando despacho" Icon={CircleCheckBig} tone={listos.length ? 'green' : 'blue'} progress={Math.min(100, listos.length * 20)} />
          <AdminMetric label="Con demora" value={`${urgentes.length}`} detail="Más de 20 minutos" Icon={AlertTriangle} tone={urgentes.length ? 'rose' : 'green'} progress={(urgentes.length / Math.max(enCocina.length, 1)) * 100} />
          <AdminMetric label="Stock a revisar" value={`${criticos.length}`} detail="Insumos críticos" Icon={PackageCheck} tone={criticos.length ? 'amber' : 'green'} progress={(criticos.length / Math.max(insumos.length, 1)) * 100} />
        </div>

        <AdminPanel eyebrow="Flujo del servicio" title={filtro === 'activos' ? 'Pedidos activos' : filtro.replace('_', ' ')} detail="Abrí una comanda para ver ingredientes, notas y acciones.">
          {comandas.length ? <div className="messa-order-board">{comandas.map(comanda => {
            const minutos = tiempoEnMinutos(comanda.created_at)
            const tone = comanda.estado === 'listo' ? 'green' : minutos >= 20 ? 'rose' : minutos >= 12 ? 'amber' : 'blue'
            const tiempoObjetivo = Math.max(...comanda.items.map(item => item.plato.tiempo_preparacion_minutos || 15), 15)
            return (
              <button type="button" className={`messa-order-card messa-order-card--${tone}`} key={comanda.id} onClick={() => setSeleccionado(comanda.pedidos[0])}>
                <header>
                  <span>
                    <b>Mesa {comanda.mesa_numero}</b>
                    <small>{comanda.origen === 'mesa' ? 'Salón' : comanda.origen}{comanda.pedidos.length > 1 ? ` · ${comanda.pedidos.length} rondas` : ''}</small>
                  </span>
                  <AdminStatus tone={tone}>{comanda.estado === 'en_cocina' ? `${minutos} min` : 'Listo'}</AdminStatus>
                </header>
                <div className="messa-order-card__items">
                  {comanda.items.slice(0, 5).map(item => <span key={item.id}><strong>{item.cantidad}×</strong>{item.plato.nombre}</span>)}
                  {comanda.items.length > 5 && <small>+{comanda.items.length - 5} ítems más</small>}
                </div>
                {/* Las fotos van DEBAJO de la lista y no flotando encima: antes
                    estaban en posición absoluta y tapaban los nombres de los
                    platos, que es justo lo que la cocina necesita leer. */}
                <div className="messa-order-card__media" aria-hidden="true">
                  {comanda.items.slice(0, 3).map(item => <DishMedia key={item.id} plato={item.plato} />)}
                </div>
                <footer><span><Clock3 size={13} /> Objetivo {tiempoObjetivo} min</span><strong>{formatPrecio(comanda.total)}</strong></footer>
              </button>
            )
          })}</div> : <AdminEmpty Icon={ChefHat} title="La cocina está al día" description="No hay pedidos para el filtro seleccionado." />}
        </AdminPanel>

        <AdminSheet
          open={Boolean(seleccionado)}
          onClose={() => setSeleccionado(null)}
          eyebrow={seleccionado ? `Mesa ${seleccionado.mesa_numero}` : ''}
          title="Detalle de la comanda"
          footer={seleccionado && (
            <>
              <AdminButton tone="danger" icon={X} onClick={() => cancelar(seleccionado)}>Cancelar</AdminButton>
              <AdminButton tone="neutral" icon={Printer} onClick={() => window.print()}>Imprimir</AdminButton>
              {seleccionado.estado === 'en_cocina' && <AdminButton tone="primary" icon={Check} onClick={() => listo(seleccionado)}>Marcar listo</AdminButton>}
              {seleccionado.estado === 'listo' && <AdminButton tone="primary" icon={Truck} onClick={() => entregar(seleccionado)}>Confirmar entrega</AdminButton>}
            </>
          )}
        >
          {seleccionado && <div className="messa-ticket">
            <header><ReceiptText size={18} /><span><b>Pedido #{seleccionado.id.slice(-5).toUpperCase()}</b><small>{tiempoTranscurrido(seleccionado.created_at)} · {seleccionado.items.length} ítems</small></span></header>
            <div>{seleccionado.items.map(item => {
              const opciones = item.plato.modificadores.flatMap(modificador => modificador.opciones).filter(opcion => item.modificadores_elegidos.includes(opcion.id)).map(opcion => opcion.nombre)
              const removidos = item.plato.ingredientes.filter(ingrediente => item.ingredientes_removidos.includes(ingrediente.id)).map(ingrediente => ingrediente.nombre)
              return <article key={item.id}><DishMedia plato={item.plato} className="messa-ticket__dish-media" /><strong>{item.cantidad}</strong><span><b>{item.plato.nombre}</b>{opciones.length > 0 && <small>{opciones.join(' · ')}</small>}{removidos.length > 0 && <small>Sin: {removidos.join(', ')}</small>}{item.plato.notas_cocina && <small>{item.plato.notas_cocina}</small>}{item.notas && <em>{item.notas}</em>}</span><small>{item.plato.tiempo_preparacion_minutos || 15} min</small></article>
            })}</div>
            <footer><span>Total</span><strong>{formatPrecio(seleccionado.total)}</strong></footer>
          </div>}
          {seleccionado && <ComandaImpresa pedido={seleccionado} restaurante={config.nombre} />}
        </AdminSheet>
      </AdminWorkspace>
    </AdminOperationShell>
  )
}
