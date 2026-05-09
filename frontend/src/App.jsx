import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import { useAuth } from './context/useAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Registro from './pages/Registro'
import Historial from './pages/Historial'
import BalanceMensual from './pages/BalanceMensual'
import RentabilidadVehiculo from './pages/RentabilidadVehiculo'
import Simulador from './pages/Simulador'
import AdminPanel from './pages/AdminPanel'

function RutaProtegida({ children }) {
  const { usuario, cargando } = useAuth()
  if (cargando) return null
  if (!usuario) return <Navigate to="/login" replace />
  return children
}

function RutaAdmin({ children }) {
  const { esAdmin, cargando } = useAuth()
  if (cargando) return null
  if (!esAdmin) return <Navigate to="/" replace />
  return children
}

function Rutas() {
  const { usuario } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<RutaProtegida><Layout /></RutaProtegida>}>
        <Route index            element={<Dashboard />} />
        <Route path="registro"  element={<Registro />} />
        <Route path="historial" element={<Historial />} />
        <Route path="mensual"   element={<BalanceMensual />} />
        <Route path="vehiculos" element={<RentabilidadVehiculo />} />
        <Route path="simulador" element={<Simulador />} />
        <Route path="admin"     element={<RutaAdmin><AdminPanel /></RutaAdmin>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Rutas />
      </AuthProvider>
    </BrowserRouter>
  )
}