'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import MessaWordmark from '@/components/messa-wordmark'
import PublicThemeToggle from '@/components/menu/PublicThemeToggle'
import { useStore } from '@/lib/store'
import { withBasePath } from '@/lib/base-path'
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setCargando(true)
    setError('')
    try {
      const res = await fetch(withBasePath('/api/auth/login'), {
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
      <div className="messa-login__toolbar"><PublicThemeToggle compact /></div>

      <div className="messa-login__brand">
        <MessaWordmark className="messa-login__wordmark" />
        <p>Panel de administración</p>
      </div>

      <form onSubmit={handleSubmit} className="messa-login__card">
        <div className="messa-login__field">
          <label htmlFor="login-email">Email</label>
          <input id="login-email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="tu@restaurante.com" required className="input-premium" autoComplete="username" />
        </div>

        <div className="messa-login__field">
          <label htmlFor="login-password">Contraseña</label>
          <div className="messa-login__password">
            <input id="login-password" type={mostrarPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="••••••••" required className="input-premium" autoComplete="current-password" />
            <button type="button" aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setMostrarPassword(valor => !valor)}>
              {mostrarPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && <p className="messa-login__error" role="alert">{error}</p>}

        <button type="submit" disabled={cargando} className="messa-login__submit">
          {cargando ? 'Verificando…' : 'Iniciar sesión'}
        </button>

        <div className="messa-login__note">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>
            El login se verifica en el servidor con bcrypt. Las cuentas se configuran como
            variables de entorno (ver <code>.env.example</code>). Si el hash lleva <code>$</code>,
            escapalos como <code>\$</code> en el archivo <code>.env</code>.
          </span>
        </div>
      </form>

      <Link href="/" className="messa-login__back"><ArrowLeft size={15} />Volver al inicio</Link>
    </div>
  )
}
