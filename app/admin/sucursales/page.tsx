'use client'

import { useState } from 'react'
import { Building2, MapPinned, PackageSearch, Pencil, Phone, Plus, Store, Trash2, UsersRound } from 'lucide-react'
import { AdminButton, AdminPanel, AdminSheet, AdminStatus, AdminToast, AdminWorkspace } from '@/components/admin/admin-ui'
import { useStore } from '@/lib/store'

export default function SucursalesPage() {
  const { sucursales, sucursalActualId, setSucursalActual, crearSucursal, editarSucursal, eliminarSucursal, mesas, insumos } = useStore()
  const [creando, setCreando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState({ nombre: '', direccion: '', telefono: '' })
  const [edicion, setEdicion] = useState({ nombre: '', direccion: '', telefono: '' })
  const [toast, setToast] = useState('')

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }

  const handleCrear = () => {
    if (!form.nombre.trim()) {
      showToast('Ingresá un nombre')
      return
    }
    crearSucursal(form.nombre, form.direccion, form.telefono)
    setForm({ nombre: '', direccion: '', telefono: '' })
    setCreando(false)
    showToast('Sucursal creada')
  }

  const handleEliminar = (id: string) => {
    const result = eliminarSucursal(id)
    showToast(result.ok ? 'Sucursal eliminada' : result.error ?? 'No se pudo eliminar')
  }

  return (
    <AdminWorkspace
      eyebrow="Estructura de operación"
      title="Sucursales"
      description="Cada local mantiene su propio salón, inventario y cierre; la identidad y la carta se comparten."
      actions={<AdminButton tone="primary" icon={Plus} onClick={() => setCreando(true)}>Nueva sucursal</AdminButton>}
    >
      <AdminToast>{toast}</AdminToast>

      <section className="messa-branch-grid">
        {sucursales.map(sucursal => {
          const mesasCount = mesas.filter(mesa => mesa.sucursal_id === sucursal.id).length
          const insumosCount = insumos.filter(insumo => insumo.sucursal_id === sucursal.id).length
          const esActual = sucursal.id === sucursalActualId
          return (
            <AdminPanel key={sucursal.id} className={`messa-branch-card${esActual ? ' is-active' : ''}`}>
              <header>
                <span><Store size={22} /></span>
                <div><h2>{sucursal.nombre}</h2><AdminStatus tone={esActual ? 'gold' : 'neutral'}>{esActual ? 'Sucursal activa' : 'Disponible'}</AdminStatus></div>
              </header>
              <dl>
                <div><dt><MapPinned size={15} />Dirección</dt><dd>{sucursal.direccion || 'Sin dirección'}</dd></div>
                <div><dt><Phone size={15} />Teléfono</dt><dd>{sucursal.telefono || 'Sin teléfono'}</dd></div>
              </dl>
              <div className="messa-branch-card__stats">
                <span><UsersRound size={16} /><b>{mesasCount}</b> mesas</span>
                <span><PackageSearch size={16} /><b>{insumosCount}</b> insumos</span>
              </div>
              <footer>
                {!esActual && <AdminButton tone="primary" icon={MapPinned} onClick={() => { setSucursalActual(sucursal.id); showToast(`Ahora trabajás en ${sucursal.nombre}`) }}>Usar esta sucursal</AdminButton>}
                <AdminButton tone="neutral" icon={Pencil} onClick={() => { setEditandoId(sucursal.id); setEdicion({ nombre: sucursal.nombre, direccion: sucursal.direccion, telefono: sucursal.telefono }) }}>Editar datos</AdminButton>
                {sucursales.length > 1 && <AdminButton tone="danger" icon={Trash2} onClick={() => handleEliminar(sucursal.id)}>Eliminar</AdminButton>}
              </footer>
            </AdminPanel>
          )
        })}
      </section>

      <AdminSheet
        open={creando}
        onClose={() => setCreando(false)}
        title="Nueva sucursal"
        eyebrow="Alta de local"
        footer={(
          <>
            <AdminButton tone="quiet" onClick={() => setCreando(false)}>Cancelar</AdminButton>
            <AdminButton tone="primary" icon={Building2} onClick={handleCrear}>Crear sucursal</AdminButton>
          </>
        )}
      >
        <div className="messa-form-stack">
          <label><span>Nombre</span><input value={form.nombre} onChange={event => setForm(current => ({ ...current, nombre: event.target.value }))} placeholder="Resto Puerto Madero" /></label>
          <label><span>Dirección</span><input value={form.direccion} onChange={event => setForm(current => ({ ...current, direccion: event.target.value }))} placeholder="Av. Alicia M. de Justo 1200" /></label>
          <label><span>Teléfono</span><input value={form.telefono} onChange={event => setForm(current => ({ ...current, telefono: event.target.value }))} placeholder="11 0000-0000" inputMode="tel" /></label>
          <p className="messa-form-help">Después de crearla podés sumar mesas y sus QR desde Mesas y códigos QR, y cargar su stock desde Inventario.</p>
        </div>
      </AdminSheet>

      <AdminSheet
        open={Boolean(editandoId)}
        onClose={() => setEditandoId(null)}
        title="Editar sucursal"
        eyebrow="Datos del local"
        footer={(
          <>
            <AdminButton tone="quiet" onClick={() => setEditandoId(null)}>Cancelar</AdminButton>
            <AdminButton tone="primary" icon={Building2} onClick={() => {
              if (!editandoId) return
              if (!edicion.nombre.trim()) { showToast('El nombre no puede quedar vacío'); return }
              editarSucursal(editandoId, edicion)
              setEditandoId(null)
              showToast('Sucursal actualizada')
            }}>Guardar cambios</AdminButton>
          </>
        )}
      >
        <div className="messa-form-stack">
          <label><span>Nombre</span><input value={edicion.nombre} onChange={event => setEdicion(current => ({ ...current, nombre: event.target.value }))} /></label>
          <label><span>Dirección</span><input value={edicion.direccion} onChange={event => setEdicion(current => ({ ...current, direccion: event.target.value }))} /></label>
          <label><span>Teléfono</span><input value={edicion.telefono} onChange={event => setEdicion(current => ({ ...current, telefono: event.target.value }))} inputMode="tel" /></label>
          <p className="messa-form-help">Estos datos se muestran en la portada pública y en el pie de la carta.</p>
        </div>
      </AdminSheet>
    </AdminWorkspace>
  )
}
