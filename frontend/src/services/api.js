// ============================================================
//  services/api.js — v4
//  Cambios: getConfigTour, getCombustibleEstimado
// ============================================================

import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('agiday_token')
    if (token) config.headers['Authorization'] = `Bearer ${token}`
    return config
  },
  error => Promise.reject(error)
)

// ── Reportes / Gráficos ──────────────────────────────────
export const getResumenDashboard     = ()       => api.get('/reportes/resumen-dashboard')
export const getBalanceDiario        = (params) => api.get('/reportes/balance-diario', { params })
export const getBalanceMensual       = (params) => api.get('/reportes/balance-mensual', { params })
export const getRentabilidadVehiculo = (params) => api.get('/reportes/rentabilidad-vehiculo', { params })
export const getAniosDisponibles     = ()       => api.get('/reportes/anios-disponibles')
export const simularViaje            = (datos) => api.post('/reportes/simulacion', datos)
export const guardarSimulacion       = (datos) => api.post('/reportes/simulaciones-guardadas', datos)
export const getSimulacionesGuardadas = ()     => api.get('/reportes/simulaciones-guardadas')
export const getSimulacionGuardada   = (id)    => api.get(`/reportes/simulaciones-guardadas/${id}`)
export const eliminarSimulacionGuardada = (id) => api.delete(`/reportes/simulaciones-guardadas/${id}`)

// ── Registro de viajes ───────────────────────────────────
export const getRegistros     = (params) => api.get('/registro', { params })
export const crearRegistro    = (datos)  => api.post('/registro/', datos)
export const eliminarRegistro = (id)     => api.delete(`/registro/${id}`)

// ── Catálogos ────────────────────────────────────────────
export const getTours        = () => api.get('/registro/catalogos/tours')
export const getVehiculos    = () => api.get('/registro/catalogos/vehiculos')
export const getConductores  = () => api.get('/registro/catalogos/conductores')
export const getPlataformas        = ()         => api.get('/registro/catalogos/plataformas')
export const getPlataformasTour   = (id_tour) => api.get(`/registro/catalogos/plataformas/${id_tour}`)

// Devuelve id_config vigente + costos operativos del tour seleccionado
export const getConfigTour = (id_tour) =>
  api.get(`/registro/catalogos/config/${id_tour}`)

// Devuelve combustible estimado para tour + vehículo seleccionados
export const getCombustibleEstimado = (id_tour, id_vehiculo) =>
  api.get(`/registro/catalogos/combustible/${id_tour}/${id_vehiculo}`)

export default api