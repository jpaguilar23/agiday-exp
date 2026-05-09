// ============================================================
//  pages/Login.jsx — Página de inicio de sesión
// ============================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/useAuth'

export default function Login() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(null)
  const [cargando, setCargando] = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setCargando(true)
    try {
      const res = await axios.post('http://127.0.0.1:8000/auth/login', { email, password })
      login(res.data.access_token, res.data.usuario)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al iniciar sesión')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--fondo)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ width: '100%', maxWidth: 420, padding: '0 24px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{
            fontFamily: 'var(--font-titulo)', fontSize: 60, 
            color: 'var(--verde)', marginBottom: 6
          }}>
            Agiday.
          </h1>
          <p style={{ color: 'var(--gris-texto)', fontSize: 16 }}>
            Panel de Gestión — Ingresá para continuar
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 32 }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {error && (
              <div style={{
                background: 'var(--negativo-bg)', color: 'var(--negativo)',
                padding: '10px 14px', borderRadius: 'var(--radio-sm)',
                fontSize: 13, fontWeight: 500
              }}>
                ❌ {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                placeholder="admin@agiday.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={cargando}
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15, marginTop: 8 }}
            >
              {cargando ? '⏳ Ingresando...' : '→ Ingresar'}
            </button>

          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--gris-texto)' }}>
          Agiday Experience © 2026
        </p>
      </div>
    </div>
  )
}