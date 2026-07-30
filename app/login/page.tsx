'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import MessaWordmark from '@/components/messa-wordmark'
import { useStore } from '@/lib/store'
import type { RolUsuario } from '@/types'

interface LoginResponse {
  ok?: boolean
  nombre?: string
  email?: string
  rol?: RolUsuario
  error?: string
}

export default function LoginPage() {
  const router = useRouter()
  const { setSesionAdmin } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json() as LoginResponse
      if (data.ok && data.nombre && data.email && data.rol) {
        setSesionAdmin({ nombre: data.nombre, email: data.email, rol: data.rol })
        router.push('/admin')
      } else {
        setError(data.error || 'Error al iniciar sesión')
      }
    } catch {
      setError('No se pudo conectar con el servidor')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="messa-login">
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <MessaWordmark className="messa-login__wordmark" />
        <p style={{ color: '#707070', fontSize: 13, margin: 0 }}>Panel de administración</p>
      </div>

      <form onSubmit={handleSubmit} className="messa-login__card">
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 6px', fontSize: 12, color: '#707070' }}>Email</p>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@restaurante.com" required className="input-premium" autoComplete="username" />
        </div>
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: '0 0 6px', fontSize: 12, color: '#707070' }}>Contraseña</p>
          <div style={{ position: 'relative' }}>
            <input type={mostrarPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="input-premium" style={{ paddingRight: 44 }} autoComplete="current-password" />
            <button type="button" aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setMostrarPassword(!mostrarPassword)} style={{ alignItems: 'center', display: 'flex', position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#707070', cursor: 'pointer' }}>{mostrarPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
        </div>

        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 12px', marginBottom: 16 }}><p style={{ margin: 0, fontSize: 12, color: '#EF4444' }}>{error}</p></div>}

        <button type="submit" disabled={cargando} className="messa-login__submit">
          {cargando ? 'Verificando...' : 'Iniciar sesión'}
        </button>

        <div style={{ marginTop: 18, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 12, padding: 12 }}>
          <p style={{ alignItems: 'flex-start', display: 'flex', gap: 7, margin: 0, fontSize: 11, color: '#707070', lineHeight: 1.7 }}>
            <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: 1 }} /> <span>El login se verifica en el servidor con bcrypt — las cuentas se configuran como variables de entorno (ver <code style={{ color: '#3B82F6' }}>.env.example</code>).</span>
          </p>
        </div>

        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 11, color: '#484848' }}>¿Olvidaste tu contraseña? El creador puede generar una nueva y actualizar la variable de entorno.</p>
        </div>
      </form>

      <Link href="/" style={{ alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none', textAlign: 'center', display: 'flex', marginTop: 20, color: '#707070', fontSize: 13 }}><ArrowLeft size={15} />Volver al inicio</Link>
    </div>
  )
}
