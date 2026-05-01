// ============================================================
//  pages/Historial.jsx — Listado de viajes registrados
// ============================================================

import { useEffect, useState } from 'react'
import { getRegistros, eliminarRegistro } from '../services/api'

const euros = (n) => `€${Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`

export default function Historial() {
  const [datos, setDatos]           = useState([])
  const [cargando, setCargando]     = useState(true)
  const [eliminando, setEliminando] = useState(null)
  const [recargar, setRecargar]     = useState(0)

  useEffect(() => {
    getRegistros()
      .then(r => {
        setDatos(r.data)
        setCargando(false)
      })
      .catch(() => setCargando(false))
  }, [recargar])

  const recargarLista = () => {
    setCargando(true)
    setRecargar(n => n + 1)
  }

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar este viaje? Esta acción no se puede deshacer.')) return
    setEliminando(id)
    try {
      await eliminarRegistro(id)
      recargarLista()
    } finally {
      setEliminando(null)
    }
  }

  if (cargando) return <div className="loading"><div className="spinner" />Cargando historial...</div>

  return (
    <div>
      <div className="card fade-up">
        <div className="card-header">
          <div>
            <div className="card-titulo">Historial de viajes</div>
            <div className="card-subtitulo">{datos.length} operaciones registradas</div>
          </div>
        </div>

        {datos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✈️</div>
            <p>No hay viajes registrados aún.</p>
          </div>
        ) : (
          <div className="tabla-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th><th>Tour</th><th>Vehículo</th><th>Conductor</th>
                  <th>Plataforma</th><th>Pax</th><th>Con deg.</th>
                  <th>Ingreso bruto</th><th>Comisión</th><th>Gastos</th>
                  <th>Balance</th><th></th>
                </tr>
              </thead>
              <tbody>
                {datos.map((d) => (
                  <tr key={d.id_operacion}>
                    <td>{d.fecha}</td>
                    <td>{d.nombre_tour}</td>
                    <td>{d.nombre_vehiculo}</td>
                    <td>{d.conductor}</td>
                    <td>
                      <span className="badge badge-amarillo">{d.plataforma || 'Directa'}</span>
                    </td>
                    <td>{d.cantidad_pasajeros}</td>
                    <td>{d.pasajeros_con_deg}</td>
                    <td className="td-monto">{euros(d.ingreso_bruto_total)}</td>
                    <td className="td-monto td-negativo">-{euros(d.comision_plataforma)}</td>
                    <td className="td-monto td-negativo">-{euros(d.total_gastos)}</td>
                    <td className={`td-monto ${d.balance_operacion >= 0 ? 'td-positivo' : 'td-negativo'}`}>
                      {euros(d.balance_operacion)}
                    </td>
                    <td>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '4px 10px', fontSize: 12, color: 'var(--negativo)' }}
                        onClick={() => handleEliminar(d.id_operacion)}
                        disabled={eliminando === d.id_operacion}
                      >
                        {eliminando === d.id_operacion ? '...' : '🗑️'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}