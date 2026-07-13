// ============================================================
//  pages/RentabilidadVehiculo.jsx — v4
//  Fix: setState fuera del cuerpo síncrono del useEffect
// ============================================================

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getRentabilidadVehiculo, getAniosDisponibles } from '../services/api'

const euros = (n) => `€${Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`

const MESES = [
  { valor: 0,  label: 'Todos los meses' },
  { valor: 1,  label: 'Enero' },
  { valor: 2,  label: 'Febrero' },
  { valor: 3,  label: 'Marzo' },
  { valor: 4,  label: 'Abril' },
  { valor: 5,  label: 'Mayo' },
  { valor: 6,  label: 'Junio' },
  { valor: 7,  label: 'Julio' },
  { valor: 8,  label: 'Agosto' },
  { valor: 9,  label: 'Septiembre' },
  { valor: 10, label: 'Octubre' },
  { valor: 11, label: 'Noviembre' },
  { valor: 12, label: 'Diciembre' },
]

export function RentabilidadVehiculo() {
  const [datos, setDatos]       = useState([])
  const [anios, setAnios]       = useState([])
  const [anio, setAnio]         = useState(new Date().getFullYear())
  const [mes, setMes]           = useState(0)
  const [cargando, setCargando] = useState(true)

  // Cargar años disponibles una sola vez al montar
  useEffect(() => {
    getAniosDisponibles()
      .then(r => {
        const lista = r.data.length ? r.data : [new Date().getFullYear()]
        setAnios(lista)
        setAnio(prev => lista.includes(prev) ? prev : lista[lista.length - 1])
      })
      .catch(() => setAnios([new Date().getFullYear()]))
  }, [])

  // Cargar datos cuando cambia año o mes — sin setState directo en el cuerpo
  useEffect(() => {
    const params = { anio }
    if (mes > 0) params.mes = mes

    getRentabilidadVehiculo(params)
      .then(r => {
        setDatos(r.data)
        setCargando(false)
      })
      .catch(() => setCargando(false))
  }, [anio, mes])

  const mesLabel = MESES.find(m => m.valor === mes)?.label || ''

  return (
    <div>
      {/* Filtros */}
      <div className="card fade-up" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label className="form-label">Año:</label>
            <select className="form-select" style={{ width: 120 }}
              value={anio} onChange={e => { setCargando(true); setAnio(parseInt(e.target.value)) }}>
              {anios.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label className="form-label">Mes:</label>
            <select className="form-select" style={{ width: 170 }}
              value={mes} onChange={e => { setCargando(true); setMes(parseInt(e.target.value)) }}>
              {MESES.map(m => <option key={m.valor} value={m.valor}>{m.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {cargando ? (
        <div className="loading"><div className="spinner" />Cargando...</div>
      ) : (
        <>
          <div className="card fade-up">
            <div className="card-header">
              <div>
                <div className="card-titulo">Rentabilidad por vehículo</div>
                <div className="card-subtitulo">
                  Balance acumulado por vehículo — {mes > 0 ? `${mesLabel} ${anio}` : `todo ${anio}`}
                </div>
              </div>
            </div>
            {datos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🚐</div>
                <p>No hay viajes registrados en {mes > 0 ? `${mesLabel} ${anio}` : anio}.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={datos}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F1F3" />
                  <XAxis dataKey="nombre_vehiculo" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `€${v}`} />
                  <Tooltip formatter={v => euros(v)} />
                  <Legend />
                  <Legend payload={[
                    { value: 'Ingreso neto', type: 'square', color: '#1B4D3E' },
                    { value: 'Gastos',       type: 'square', color: '#F5A623' },
                    { value: 'Balance',      type: 'square', color: '#2D7A4F'  },
                  ]} />
                  <Bar dataKey="balance"        name="Balance"      fill="#2D7A4F" radius={[4,4,0,0]} />
                  <Bar dataKey="gastos_totales" name="Gastos"       fill="#F5A623" radius={[4,4,0,0]} />
                  <Bar dataKey="ingreso_neto"   name="Ingreso neto" fill="#1B4D3E" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {datos.length > 0 && (
            <div className="card fade-up">
              <div className="card-header"><div className="card-titulo">Detalle por vehículo</div></div>
              <div className="tabla-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Vehículo</th><th>Viajes</th><th>Pasajeros</th>
                      <th>Prom. pax/viaje</th><th>Ingreso neto</th><th>Gastos</th>
                      <th>Balance</th><th>Balance/viaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.map((d, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500 }}>{d.nombre_vehiculo}</td>
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
          )}
        </>
      )}
    </div>
  )
}

export default RentabilidadVehiculo