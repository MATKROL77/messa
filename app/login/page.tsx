'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useStore } from '@/lib/store'

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
      const data = await res.json()
      if (data.ok) {
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
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <p style={{ fontSize: 44, margin: '0 0 8px' }}>🍽️</p>
        <h1 className="font-titulos" style={{ fontSize: 28, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.3px' }}>Menu<span style={{ color: 'var(--gold)' }}>Flow</span></h1>
        <p style={{ color: '#707070', fontSize: 13, margin: 0 }}>Panel de administración</p>
      </div>

      <form onSubmit={handleSubmit} style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 20, padding: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 6px', fontSize: 12, color: '#707070' }}>Email</p>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@restaurante.com" required className="input-premium" autoComplete="username" />
        </div>
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: '0 0 6px', fontSize: 12, color: '#707070' }}>Contraseña</p>
          <div style={{ position: 'relative' }}>
            <input type={mostrarPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="input-premium" style={{ paddingRight: 44 }} autoComplete="current-password" />
            <button type="button" onClick={() => setMostrarPassword(!mostrarPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#707070', cursor: 'pointer' }}>{mostrarPassword ? '🙈' : '👁️'}</button>
          </div>
        </div>

        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 12px', marginBottom: 16 }}><p style={{ margin: 0, fontSize: 12, color: '#EF4444' }}>{error}</p></div>}

        <button type="submit" disabled={cargando} className="btn-gold" style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', fontSize: 15, cursor: 'pointer' }}>
          {cargando ? 'Verificando...' : 'Iniciar sesión'}
        </button>

        <div style={{ marginTop: 18, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 12, padding: 12 }}>
          <p style={{ margin: 0, fontSize: 11, color: '#707070', lineHeight: 1.7 }}>
            🔐 El login se verifica en el servidor con bcrypt — las cuentas se configuran como variables de entorno (ver <code style={{ color: '#3B82F6' }}>.env.example</code>). Ya no hay contraseñas de demo en el código.
          </p>
        </div>

        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 11, color: '#484848' }}>¿Olvidaste tu contraseña? El creador puede generar una nueva y actualizar la variable de entorno.</p>
        </div>
      </form>

      <Link href="/" style={{ textDecoration: 'none', textAlign: 'center', display: 'block', marginTop: 20, color: '#707070', fontSize: 13 }}>← Volver al inicio</Link>
    </div>
  )
}
