// ============================================================
//  pages/RentabilidadVehiculo.jsx
// ============================================================

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getRentabilidadVehiculo } from '../services/api'

const euros = (n) => `€${Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`

export function RentabilidadVehiculo() {
  const [datos, setDatos]       = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    getRentabilidadVehiculo({ anio: new Date().getFullYear() })
      .then(r => setDatos(r.data))
      .finally(() => setCargando(false))
  }, [])

  if (cargando) return <div className="loading"><div className="spinner" />Cargando...</div>

  return (
    <div>
      <div className="card fade-up">
        <div className="card-header">
          <div>
            <div className="card-titulo">Rentabilidad por vehículo</div>
            <div className="card-subtitulo">Balance acumulado por vehículo este año</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={datos}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F1F3" />
            <XAxis dataKey="nombre_vehiculo" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `€${v}`} />
            <Tooltip formatter={v => euros(v)} />
            <Legend />
            <Bar dataKey="ingreso_neto"  name="Ingreso neto" fill="#1B4D3E" radius={[4,4,0,0]} />
            <Bar dataKey="gastos_totales" name="Gastos"      fill="#F5A623" radius={[4,4,0,0]} />
            <Bar dataKey="balance"        name="Balance"     fill="#2D7A4F" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card fade-up">
        <div className="card-header"><div className="card-titulo">Detalle por vehículo</div></div>
        <div className="tabla-wrapper">
          <table>
            <thead>
              <tr>
                <th>Vehículo</th><th>Mes</th><th>Viajes</th><th>Pasajeros</th>
                <th>Prom. pax/viaje</th><th>Ingreso neto</th><th>Gastos</th>
                <th>Balance</th><th>Balance/viaje</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((d, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{d.nombre_vehiculo}</td>
                  <td>{d.mes?.slice(0,7)}</td>
                  <td>{d.viajes_realizados}</td>
                  <td>{d.pasajeros_transportados}</td>
                  <td>{d.promedio_pasajeros_por_viaje}</td>
                  <td className="td-monto">{euros(d.ingreso_neto)}</td>
                  <td className="td-monto td-negativo">-{euros(d.gastos_totales)}</td>
                  <td className={`td-monto ${d.balance >= 0 ? 'td-positivo' : 'td-negativo'}`}>
                    {euros(d.balance)}
                  </td>
                  <td className="td-monto">{euros(d.balance_promedio_por_viaje)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default RentabilidadVehiculo