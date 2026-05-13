// ============================================================
//  services/api.js — Conexión con FastAPI
//  Todas las llamadas al backend pasan por aquí
// ============================================================

import axios from 'axios'

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
  headers: { 'Content-Type': 'application/json' }
})


api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('agiday_token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// ── Reportes / Gráficos ──────────────────────────────────
export const getResumenDashboard   = ()         => api.get('/reportes/resumen-dashboard')
export const getBalanceDiario      = (params)   => api.get('/reportes/balance-diario', { params })
export const getBalanceMensual     = (params)   => api.get('/reportes/balance-mensual', { params })
export const getRentabilidadVehiculo = (params) => api.get('/reportes/rentabilidad-vehiculo', { params })
export const getSimulacion         = ()         => api.get('/reportes/simulacion')

// ── Registro de viajes ───────────────────────────────────
export const getRegistros          = (params)   => api.get('/registro', { params })
export const crearRegistro         = (datos)    => api.post('/registro/', datos)
export const eliminarRegistro      = (id)       => api.delete(`/registro/${id}`)

// ── Catálogos (para formularios) ─────────────────────────
export const getTours        = () => api.get('/registro/catalogos/tours')
export const getVehiculos    = () => api.get('/registro/catalogos/vehiculos')
export const getConductores  = () => api.get('/registro/catalogos/conductores')
export const getPlataformas  = () => api.get('/registro/catalogos/plataformas')

export default api