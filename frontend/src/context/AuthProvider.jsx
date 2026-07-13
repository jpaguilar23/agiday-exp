// src/context/AuthProvider.jsx
import { useState, useEffect } from 'react'
import axios from 'axios'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const guardado = localStorage.getItem('agiday_usuario')
    return guardado ? JSON.parse(guardado) : null
  })

  // Configurar axios solo una vez al montar, de forma segura
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(config => {
    const token = localStorage.getItem('agiday_token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  })
  return () => {
    axios.interceptors.request.eject(interceptor)
  }
}, [])

  const login = (token, userData) => {
    localStorage.setItem('agiday_token', token)
    localStorage.setItem('agiday_usuario', JSON.stringify(userData))
   
    setUsuario(userData)
  }

  const logout = () => {
    localStorage.removeItem('agiday_token')
    localStorage.removeItem('agiday_usuario')

    setUsuario(null)
  }

  return (
    <AuthContext.Provider value={{
      usuario,
      login,
      logout,
      esAdmin: usuario?.rol === 'admin',
      cargando: false
    }}>
      {children}
    </AuthContext.Provider>
  )
}