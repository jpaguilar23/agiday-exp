// ============================================================
//  pages/BalanceMensual.jsx
// ============================================================

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getBalanceMensual } from '../services/api'

const euros = (n) => `€${Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`

export default function BalanceMensual() {
  const [datos, setDatos]       = useState([])
  const [cargando, setCargando] = useState(true)
  const [anio, setAnio]         = useState(new Date().getFullYear())

  useEffect(() => {
    getBalanceMensual({ anio })
      .then(r => setDatos(r.data))
      .finally(() => setCargando(false))
  }, [anio])

  if (cargando) return <div className="loading"><div className="spinner" />Cargando...</div>

  return (
    <div>
      {/* Filtro año */}
      <div className="card fade-up" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label className="form-label">Año:</label>
          <select className="form-select" style={{ width: 120 }}
            value={anio} onChange={e => setAnio(e.target.value)}>
            {[2024, 2025, 2026].map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Gráfico */}
      <div className="card fade-up">
        <div className="card-header">
          <div>
            <div className="card-titulo">Balance mensual {anio}</div>
            <div className="card-subtitulo">Ingresos, gastos y balance neto por mes</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={datos}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F1F3" />
            <XAxis dataKey="mes_nombre" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `€${v}`} />
            <Tooltip formatter={(v) => euros(v)} />
            <Legend />
            <Bar dataKey="ingreso_neto"        name="Ingreso neto"   fill="#1B4D3E" radius={[4,4,0,0]} />
            <Bar dataKey="gastos_operativos"   name="Gastos op."     fill="#F5A623" radius={[4,4,0,0]} />
            <Bar dataKey="balance_mensual_neto" name="Balance neto"  fill="#2D7A4F" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla resumen */}
      <div className="card fade-up">
        <div className="card-header">
          <div className="card-titulo">Detalle por mes</div>
        </div>
        <div className="tabla-wrapper">
          <table>
            <thead>
              <tr>
                <th>Mes</th>
                <th>Viajes</th>
                <th>Pasajeros</th>
                <th>Ingreso bruto</th>
                <th>Comisiones</th>
                <th>Gastos op.</th>
                <th>Gastos fijos</th>
                <th>Balance neto</th>
                <th>€/pasajero</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((d, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{d.mes_nombre}</td>
                  <td>{d.total_viajes}</td>
                  <td>{d.total_pasajeros}</td>
                  <td className="td-monto">{euros(d.ingreso_bruto)}</td>
                  <td className="td-monto" style={{ color: 'var(--negativo)' }}>-{euros(d.comision_plataformas)}</td>
                  <td className="td-monto" style={{ color: 'var(--negativo)' }}>-{euros(d.gastos_operativos)}</td>
                  <td className="td-monto" style={{ color: 'var(--negativo)' }}>-{euros(d.gastos_fijos_agencia)}</td>
                  <td className={`td-monto ${d.balance_mensual_neto >= 0 ? 'td-positivo' : 'td-negativo'}`}>
                    {euros(d.balance_mensual_neto)}
                  </td>
                  <td className="td-monto">{euros(d.promedio_ganancia_por_pasajero)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}