// ============================================================
//  components/Layout.jsx
// ============================================================

import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'

const titulos = {
  '/':          'Dashboard',
  '/registro':  'Registrar Viaje',
  '/historial': 'Historial de Viajes',
  '/mensual':   'Balance Mensual',
  '/vehiculos': 'Rentabilidad por Vehículo',
  '/simulador': 'Simulador de Escenarios',
}

export default function Layout() {
  const location = useLocation()
  const titulo = titulos[location.pathname] || 'Agiday'

  const hoy = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-titulo">{titulo}</div>
          <div className="topbar-fecha">{hoy}</div>
        </header>
        <main className="page-body">
          <Outlet />
        </main>
      </div>
    </div>
  )
}