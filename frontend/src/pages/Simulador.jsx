// ============================================================
//  pages/Simulador.jsx — Tabla de simulación de escenarios
//  Equivale a la hoja "Costos e ingresos" del Excel
// ============================================================

import { useEffect, useState } from 'react'
import { getSimulacion } from '../services/api'

const euros = (n) => `€${Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`

export default function Simulador() {
  const [datos, setDatos]       = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    getSimulacion()
      .then(r => setDatos(r.data))
      .finally(() => setCargando(false))
  }, [])

  if (cargando) return <div className="loading"><div className="spinner" />Calculando escenarios...</div>

  // Agrupar por vehículo
  const vehiculos = [...new Set(datos.map(d => d.nombre_vehiculo))]
  const pasajeros = [2, 3, 4, 5, 6, 7, 8]

  const getCelda = (vehiculo, n, campo) => {
    const fila = datos.find(d => d.nombre_vehiculo === vehiculo && d.n_pasajeros === n)
    return fila ? fila[campo] : null
  }

  return (
    <div>
      <div className="card fade-up">
        <div className="card-header">
          <div>
            <div className="card-titulo">Simulador de Escenarios</div>
            <div className="card-subtitulo">
              Balance estimado por vehículo y número de pasajeros
            </div>
          </div>
          <span className="badge badge-amarillo">Precios vigentes</span>
        </div>

        {/* Tabla SIN degustación */}
        <p style={{ fontWeight: 600, marginBottom: 10, color: 'var(--verde)', fontSize: 13 }}>
          🍽️ Sin degustación
        </p>
        <div className="tabla-wrapper" style={{ marginBottom: 28 }}>
          <table>
            <thead>
              <tr>
                <th>Vehículo</th>
                {pasajeros.map(n => <th key={n}>{n} pax</th>)}
              </tr>
            </thead>
            <tbody>
              {vehiculos.map(v => (
                <tr key={v}>
                  <td style={{ fontWeight: 500 }}>{v}</td>
                  {pasajeros.map(n => {
                    const val = getCelda(v, n, 'balance_estimado_sin_deg')
                    return (
                      <td key={n} className={`td-monto ${val >= 0 ? 'td-positivo' : 'td-negativo'}`}>
                        {val !== null ? euros(val) : '—'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tabla CON degustación */}
        <p style={{ fontWeight: 600, marginBottom: 10, color: 'var(--verde)', fontSize: 13 }}>
          🥂 Con degustación
        </p>
        <div className="tabla-wrapper">
          <table>
            <thead>
              <tr>
                <th>Vehículo</th>
                {pasajeros.map(n => <th key={n}>{n} pax</th>)}
              </tr>
            </thead>
            <tbody>
              {vehiculos.map(v => (
                <tr key={v}>
                  <td style={{ fontWeight: 500 }}>{v}</td>
                  {pasajeros.map(n => {
                    const val = getCelda(v, n, 'balance_estimado_con_deg')
                    return (
                      <td key={n} className={`td-monto ${val >= 0 ? 'td-positivo' : 'td-negativo'}`}>
                        {val !== null ? euros(val) : '—'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}