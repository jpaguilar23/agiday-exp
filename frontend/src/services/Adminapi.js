// ============================================================
//  services/adminApi.js — Llamadas al panel administrativo
// ============================================================

import axios from 'axios'

const api = axios.create({ baseURL: 'http://127.0.0.1:8000' })

// Interceptor para agregar token automáticamente
api.interceptors.request.use(config => {
  const token = localStorage.getItem('agiday_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Vehículos ────────────────────────────────────────────────
export const adminGetVehiculos    = ()       => api.get('/admin/vehiculos')
export const adminCrearVehiculo   = (data)   => api.post('/admin/vehiculos', data)
export const adminEditarVehiculo  = (id, d)  => api.put(`/admin/vehiculos/${id}`, d)
export const adminEliminarVehiculo= (id)     => api.delete(`/admin/vehiculos/${id}`)

// ── Conductores ──────────────────────────────────────────────
export const adminGetConductores    = ()      => api.get('/admin/conductores')
export const adminCrearConductor    = (data)  => api.post('/admin/conductores', data)
export const adminEditarConductor   = (id, d) => api.put(`/admin/conductores/${id}`, d)
export const adminEliminarConductor = (id)    => api.delete(`/admin/conductores/${id}`)
export const adminCrearHonorario    = (data)  => api.post('/admin/honorarios', data)
export const adminEliminarHonorario = (id)    => api.delete(`/admin/honorarios/${id}`)

// ── Tours ────────────────────────────────────────────────────
export const adminGetTours      = ()      => api.get('/admin/tours')
export const adminCrearTour     = (data)  => api.post('/admin/tours', data)
export const adminEditarTour    = (id, d) => api.put(`/admin/tours/${id}`, d)
export const adminEliminarTour  = (id)    => api.delete(`/admin/tours/${id}`)
export const adminCrearConfig   = (data)  => api.post('/admin/config-tour', data)
export const adminEditarConfig  = (id, d) => api.put(`/admin/config-tour/${id}`, d)
export const adminEliminarConfig= (id)    => api.delete(`/admin/config-tour/${id}`)

// ── Plataformas ──────────────────────────────────────────────
export const adminGetPlataformas     = ()      => api.get('/admin/plataformas')
export const adminCrearPlataforma    = (data)  => api.post('/admin/plataformas', data)
export const adminEditarPlataforma   = (id, d) => api.put(`/admin/plataformas/${id}`, d)
export const adminEliminarPlataforma = (id)    => api.delete(`/admin/plataformas/${id}`)

// ── Costos fijos ─────────────────────────────────────────────
export const adminGetCostos     = ()      => api.get('/admin/costos-fijos')
export const adminCrearCosto    = (data)  => api.post('/admin/costos-fijos', data)
export const adminEditarCosto   = (id, d) => api.put(`/admin/costos-fijos/${id}`, d)
export const adminEliminarCosto = (id)    => api.delete(`/admin/costos-fijos/${id}`)

// ── Registro (editar viajes) ─────────────────────────────────
export const adminEditarRegistro = (id, d) => api.put(`/admin/registro/${id}`, d)

// ── Usuarios ─────────────────────────────────────────────────
export const adminGetUsuarios     = ()      => api.get('/admin/usuarios')
export const adminCrearUsuario    = (data)  => api.post('/admin/usuarios', data)
export const adminEditarUsuario   = (id, d) => api.put(`/admin/usuarios/${id}`, d)
export const adminEliminarUsuario = (id)    => api.delete(`/admin/usuarios/${id}`)

// ── Tarifas por tour + plataforma ─────────────────────────────
export const adminGetTarifas         = ()      => api.get('/admin/tarifas')
export const adminGetTarifasPorTour  = (id)    => api.get(`/admin/tarifas/tour/${id}`)
export const adminCrearTarifa        = (data)  => api.post('/admin/tarifas', data)
export const adminEditarTarifa       = (id, d) => api.put(`/admin/tarifas/${id}`, d)
export const adminEliminarTarifa     = (id)    => api.delete(`/admin/tarifas/${id}`)

// ── Costos vehículo + tour (combustible estimado) ─────────────
export const adminGetCostosVehiculoTour        = ()   => api.get('/admin/costos-vehiculo-tour')
export const adminGetCostosVehiculoTourPorTour = (id) => api.get(`/admin/costos-vehiculo-tour/tour/${id}`)
export const adminCrearCostoVehiculoTour        = (data)  => api.post('/admin/costos-vehiculo-tour', data)
export const adminEditarCostoVehiculoTour       = (id, d) => api.put(`/admin/costos-vehiculo-tour/${id}`, d)
export const adminEliminarCostoVehiculoTour     = (id)    => api.delete(`/admin/costos-vehiculo-tour/${id}`)