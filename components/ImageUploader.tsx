'use client'
import { useState, useRef } from 'react'
import PlatoImg from './PlatoImg'

const MAX_DIMENSION = 1000 // px, lado más largo
const CALIDAD_JPEG = 0.8
const MAX_BYTES_ORIGINAL = 15 * 1024 * 1024 // 15MB antes de comprimir

// Comprime la imagen en el navegador (redimensiona + reencodea a JPEG) antes
// de guardarla. Esto reduce drásticamente el peso que termina viviendo en
// localStorage. Para producción real con muchos platos/fotos, lo correcto es
// subir el archivo a un storage real (Supabase Storage o Cloudflare R2) y
// guardar solo la URL — ver LEEME.md para los pasos exactos.
function comprimirImagen(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('No se pudo procesar la imagen'))
      img.onload = () => {
        let { width, height } = img
        if (width > height && width > MAX_DIMENSION) { height = Math.round((height * MAX_DIMENSION) / width); width = MAX_DIMENSION }
        else if (height > MAX_DIMENSION) { width = Math.round((width * MAX_DIMENSION) / height); height = MAX_DIMENSION }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas no soportado')); return }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', CALIDAD_JPEG))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

export default function ImageUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [arrastrando, setArrastrando] = useState(false)
  const [urlTemp, setUrlTemp] = useState('')
  const [error, setError] = useState('')
  const [comprimiendo, setComprimiendo] = useState(false)
  const [pesoFinal, setPesoFinal] = useState<number | null>(null)
  const inputFileRef = useRef<HTMLInputElement>(null)

  const procesarArchivo = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('El archivo debe ser una imagen'); return }
    if (file.size > MAX_BYTES_ORIGINAL) { setError('La imagen no puede pesar más de 15MB'); return }
    setError('')
    setComprimiendo(true)
    try {
      const dataUrl = await comprimirImagen(file)
      setPesoFinal(Math.round((dataUrl.length * 3) / 4)) // estimación de bytes desde base64
      onChange(dataUrl)
    } catch {
      setError('No se pudo procesar la imagen. Probá con otro archivo.')
    } finally {
      setComprimiendo(false)
    }
  }

  return (
    <div>
      <p style={{ margin: '0 0 8px', fontSize: 12, color: '#707070', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Imagen del plato</p>

      {value && (
        <div style={{ position: 'relative', height: 140, borderRadius: 12, overflow: 'hidden', marginBottom: 10, border: '1px solid #2A2A2A' }}>
          <PlatoImg src={value} alt="preview" />
          <button onClick={() => { onChange(''); setPesoFinal(null) }} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14 }}>✕</button>
          {pesoFinal && <span style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, padding: '3px 8px', borderRadius: 100 }}>~{(pesoFinal / 1024).toFixed(0)} KB comprimida</span>}
        </div>
      )}

      <div
        onDragOver={e => { e.preventDefault(); setArrastrando(true) }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={e => { e.preventDefault(); setArrastrando(false); const f = e.dataTransfer.files?.[0]; if (f) procesarArchivo(f) }}
        onClick={() => !comprimiendo && inputFileRef.current?.click()}
        style={{
          border: `2px dashed ${arrastrando ? '#D4AF37' : '#2A2A2A'}`, borderRadius: 12, padding: '20px 14px',
          textAlign: 'center', cursor: comprimiendo ? 'wait' : 'pointer', background: arrastrando ? 'rgba(212,175,55,0.06)' : '#1C1C1C',
          transition: 'all 0.15s', marginBottom: 10
        }}
      >
        {comprimiendo ? (
          <p style={{ margin: 0, fontSize: 13, color: '#A0A0A0' }}>Comprimiendo imagen...</p>
        ) : (
          <>
            <p style={{ margin: '0 0 4px', fontSize: 24 }}>📸</p>
            <p style={{ margin: 0, fontSize: 13, color: '#A0A0A0', fontWeight: 500 }}>Arrastrá una imagen acá o tocá para elegir</p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#707070' }}>Desde tu galería o cualquier carpeta · se comprime automáticamente</p>
          </>
        )}
        <input ref={inputFileRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) procesarArchivo(f); e.target.value = '' }} style={{ display: 'none' }} />
      </div>

      {error && <p style={{ color: '#EF4444', fontSize: 12, margin: '0 0 10px' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={urlTemp}
          onChange={e => setUrlTemp(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && urlTemp.trim()) { onChange(urlTemp.trim()); setPesoFinal(null); setUrlTemp('') } }}
          placeholder="O pegá cualquier URL de imagen (https://...)"
          style={{ flex: 1, background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 12, padding: '10px 14px', color: '#fff', fontSize: 13 }}
        />
        <button onClick={() => { if (urlTemp.trim()) { onChange(urlTemp.trim()); setPesoFinal(null); setUrlTemp('') } }} style={{ padding: '8px 16px', borderRadius: 10, background: '#2A2A2A', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13 }}>Usar URL</button>
      </div>
      <p style={{ margin: '8px 0 0', fontSize: 10, color: '#484848', lineHeight: 1.5 }}>Nota: las fotos comprimidas se guardan en el almacenamiento local del navegador. Para muchos platos con fotos propias, lo ideal a futuro es conectar Supabase Storage o R2 (ver LEEME.md).</p>
    </div>
  )
}
