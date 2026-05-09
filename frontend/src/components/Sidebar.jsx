// ============================================================
//  components/Sidebar.jsx — Con sección admin y logout
// ============================================================

import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

const navItems = [
  { seccion: 'Principal' },
  { path: '/',           icon: '📊', label: 'Dashboard' },
  { seccion: 'Operaciones' },
  { path: '/registro',   icon: '✈️',  label: 'Registrar Viaje' },
  { path: '/historial',  icon: '📋', label: 'Historial' },
  { seccion: 'Análisis' },
  { path: '/mensual',    icon: '📅', label: 'Balance Mensual' },
  { path: '/vehiculos',  icon: '🚐', label: 'Por Vehículo' },
  { path: '/simulador',  icon: '🔮', label: 'Simulador' },
]

const navAdmin = [
  { seccion: 'Administración' },
  { path: '/admin', icon: '⚙️', label: 'Panel Admin' },
]

export default function Sidebar() {
  const navigate   = useNavigate()
  const loc        = useLocation()
  const { usuario, esAdmin, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const items = esAdmin ? [...navItems, ...navAdmin] : navItems

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>Agiday.</h1>
        <span>Panel de Gestión</span>
      </div>

      <nav className="sidebar-nav">
        {items.map((item, i) =>
          item.seccion ? (
            <div key={i} className="nav-section-label">{item.seccion}</div>
          ) : (
            <button key={item.path}
              className={`nav-item ${loc.pathname === item.path ? 'activo' : ''}`}
              onClick={() => navigate(item.path)}>
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          )
        )}
      </nav>

      <div className="sidebar-footer">
        <div style={{ marginBottom: 8, color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
          👤 {usuario?.nombre}
          {esAdmin && <span style={{ color: 'var(--amarillo)', marginLeft: 6, fontSize: 10 }}>ADMIN</span>}
        </div>
        <button onClick={handleLogout}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
            fontSize: 12, cursor: 'pointer', padding: 0 }}>
          → Cerrar sesión
        </button>
      </div>
    </aside>
  )
}