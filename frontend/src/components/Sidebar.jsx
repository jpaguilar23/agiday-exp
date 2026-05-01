// ============================================================
//  components/Sidebar.jsx
// ============================================================

import { useLocation, useNavigate } from 'react-router-dom'

const navItems = [
  { seccion: 'Principal' },
  { path: '/',            icon: '📊', label: 'Dashboard' },
  { seccion: 'Operaciones' },
  { path: '/registro',    icon: '✈️',  label: 'Registrar Viaje' },
  { path: '/historial',   icon: '📋', label: 'Historial' },
  { seccion: 'Análisis' },
  { path: '/mensual',     icon: '📅', label: 'Balance Mensual' },
  { path: '/vehiculos',   icon: '🚐', label: 'Por Vehículo' },
  { path: '/simulador',   icon: '🔮', label: 'Simulador' },
]

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img 
          src="https://www.agidaytravel.com/wp-content/uploads/2023/01/airbnb-experiencias.png" 
          alt="Agiday Logo" 
          style={{ width: '170px', marginBottom: '5px', display: 'block', marginLeft: '-22px' }}
        />
        <span>Panel de Gestión</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item, i) =>
          item.seccion ? (
            <div key={i} className="nav-section-label">{item.seccion}</div>
          ) : (
            <button
              key={item.path}
              className={`nav-item ${location.pathname === item.path ? 'activo' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          )
        )}
      </nav>

      <div className="sidebar-footer">
        Agiday Experience © 2025
      </div>
    </aside>
  )
}