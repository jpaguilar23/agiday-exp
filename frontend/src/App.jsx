// ============================================================
//  App.jsx — Rutas principales
// ============================================================

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Registro from './pages/Registro'
import Historial from './pages/Historial'
import BalanceMensual from './pages/BalanceMensual'
import RentabilidadVehiculo from './pages/RentabilidadVehiculo'
import Simulador from './pages/Simulador'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index              element={<Dashboard />} />
          <Route path="registro"   element={<Registro />} />
          <Route path="historial"  element={<Historial />} />
          <Route path="mensual"    element={<BalanceMensual />} />
          <Route path="vehiculos"  element={<RentabilidadVehiculo />} />
          <Route path="simulador"  element={<Simulador />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}