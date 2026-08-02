'use client'

import { useState } from 'react'
import { AlertTriangle, Check, Palette, Save, Sparkles, Type } from 'lucide-react'
import { AdminButton, AdminPanel, AdminToast, AdminWorkspace } from '@/components/admin/admin-ui'
import MessaWordmark from '@/components/messa-wordmark'
import { useStore } from '@/lib/store'

const FUENTES = [
  { valor: "'Playfair Display', Georgia, serif", label: 'Playfair Display', desc: 'Elegante · serif clásica' },
  { valor: "'Inter', -apple-system, sans-serif", label: 'Inter', desc: 'Moderna · sans-serif limpia' },
  { valor: "Georgia, 'Times New Roman', serif", label: 'Georgia', desc: 'Tradicional · editorial' },
  { valor: "-apple-system, 'Segoe UI', sans-serif", label: 'Sistema', desc: 'Nativa del dispositivo' },
]

const PALETAS = [
  { nombre: 'MESSA dorado', primario: '#C69A3F', fondo: '#F4F0E7' },
  { nombre: 'Oliva editorial', primario: '#8B8452', fondo: '#F2EFE5' },
  { nombre: 'Borgoña cálido', primario: '#985F59', fondo: '#F3EDEA' },
  { nombre: 'Azul piedra', primario: '#627F91', fondo: '#EDF0F1' },
  { nombre: 'Cobre', primario: '#A96D47', fondo: '#F2ECE6' },
  { nombre: 'Nocturno', primario: '#D2B467', fondo: '#181713' },
]

/** Luminancia relativa de un color hexadecimal (fórmula de la WCAG). */
function luminancia(hex: string): number {
  const limpio = hex.replace('#', '')
  const completo = limpio.length === 3 ? limpio.split('').map(c => c + c).join('') : limpio
  const canales = [0, 2, 4].map(i => parseInt(completo.slice(i, i + 2), 16) / 255)
  const lineal = canales.map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
  return 0.2126 * lineal[0] + 0.7152 * lineal[1] + 0.0722 * lineal[2]
}

function contraste(a: string, b: string): number {
  try {
    const [alta, baja] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
    return (alta + 0.05) / (baja + 0.05)
  } catch {
    return 21
  }
}

/** Tinta legible sobre un fondo: negra si el fondo es claro, blanca si es oscuro. */
function tintaSobre(fondo: string): string {
  return luminancia(fondo) > 0.42 ? '#1d1b17' : '#fffaf0'
}

export default function TemaPage() {
  const { tema, actualizarTema } = useStore()
  const [form, setForm] = useState(tema)
  const [toast, setToast] = useState('')

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2500)
  }

  const handleGuardar = () => {
    actualizarTema(form)
    showToast('Identidad aplicada')
  }

  const contrasteTitulo = contraste(form.color_primario, form.color_fondo)

  return (
    <AdminWorkspace
      eyebrow="Sistema de marca"
      title="Identidad de MESSA"
      description="Ajustá marca, paleta y tipografía sin perder consistencia entre carta, mesa y operación."
      actions={<AdminButton tone="primary" icon={Save} onClick={handleGuardar}>Aplicar identidad</AdminButton>}
    >
      <AdminToast>{toast}</AdminToast>

      <div className="messa-brand-layout">
        <div className="messa-brand-controls">
          <AdminPanel eyebrow="Marca" title="Nombre visible" detail="Se aplica a los espacios que admiten marca blanca.">
            <div className="messa-form-stack">
              <label><span>Nombre de la plataforma</span><input value={form.nombre_marca} onChange={event => setForm(current => ({ ...current, nombre_marca: event.target.value }))} placeholder="MESSA" /></label>
            </div>
          </AdminPanel>

          <AdminPanel eyebrow="Color" title="Paletas editoriales" detail="Selecciones pensadas para mantener contraste en claro y oscuro.">
            <div className="messa-palette-grid">
              {PALETAS.map(paleta => {
                const active = form.color_primario.toLowerCase() === paleta.primario.toLowerCase()
                return (
                  <button type="button" key={paleta.nombre} className={active ? 'active' : ''} onClick={() => setForm(current => ({ ...current, color_primario: paleta.primario, color_fondo: paleta.fondo }))}>
                    <i style={{ '--brand-color': paleta.primario, '--brand-bg': paleta.fondo } as React.CSSProperties} />
                    <span>{paleta.nombre}</span>
                    {active && <Check size={15} />}
                  </button>
                )
              })}
            </div>
            <div className="messa-color-fields">
              <label><span>Color de marca</span><div><input type="color" value={form.color_primario} onChange={event => setForm(current => ({ ...current, color_primario: event.target.value }))} /><input value={form.color_primario} onChange={event => setForm(current => ({ ...current, color_primario: event.target.value }))} /></div></label>
              <label><span>Color de fondo</span><div><input type="color" value={form.color_fondo} onChange={event => setForm(current => ({ ...current, color_fondo: event.target.value }))} /><input value={form.color_fondo} onChange={event => setForm(current => ({ ...current, color_fondo: event.target.value }))} /></div></label>
            </div>
          </AdminPanel>

          <AdminPanel eyebrow="Tipografía" title="Voz editorial" detail="La opción elegida se usa en títulos y momentos de marca.">
            <div className="messa-font-list">
              {FUENTES.map(font => {
                const active = form.fuente_titulos === font.valor
                return (
                  <button type="button" key={font.valor} className={active ? 'active' : ''} onClick={() => setForm(current => ({ ...current, fuente_titulos: font.valor }))}>
                    <Type size={17} />
                    <span><b style={{ fontFamily: font.valor }}>{font.label}</b><small>{font.desc}</small></span>
                    {active && <Check size={15} />}
                  </button>
                )
              })}
            </div>
          </AdminPanel>
        </div>

        <AdminPanel eyebrow="Vista previa" title="Aplicación en vivo" className="messa-brand-preview-panel">
          <div className="messa-brand-preview" style={{ background: form.color_fondo }}>
            <span><Sparkles size={17} /></span>
            <MessaWordmark />
            <h2 style={{ color: form.color_primario, fontFamily: form.fuente_titulos }}>{form.nombre_marca || 'MESSA'}</h2>
            <p>From mess to mesa.</p>
            <button type="button" style={{ background: form.color_primario, color: tintaSobre(form.color_primario) }}>Acción principal</button>
            <div><Palette size={16} />Una identidad cuidada en cada punto de contacto.</div>
          </div>
          {/* La vista previa muestra el color TAL CUAL se eligió, sin corregirlo:
              si lo maquillara, el dueño elegiría un color que después no se lee
              en la carta real. En vez de eso se avisa. */}
          {contrasteTitulo < 4.5 && (
            <p className="messa-brand-warning" role="status">
              <AlertTriangle size={15} aria-hidden="true" />
              Con este color el nombre queda en {contrasteTitulo.toFixed(1)}:1 sobre el fondo.
              Para que se lea cómodo conviene 4.5:1 — probá un tono más oscuro.
            </p>
          )}
        </AdminPanel>
      </div>
    </AdminWorkspace>
  )
}
