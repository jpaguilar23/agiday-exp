// ============================================================
//  pages/Dashboard.jsx — Página principal con KPIs y gráficos
// ============================================================

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { getResumenDashboard, getBalanceMensual, getBalanceDiario } from '../services/api'

// Formatea números como moneda €
const euros = (n) => `€${Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`

// Tooltip personalizado para los gráficos
const TooltipPersonalizado = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff', border: '1px solid #E2E4E8',
      borderRadius: 8, padding: '10px 14px', fontSize: 13,
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
    }}>
      <p style={{ fontWeight: 600, marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {euros(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [resumen, setResumen]   = useState(null)
  const [mensual, setMensual]   = useState([])
  const [diario, setDiario]     = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    Promise.all([
      getResumenDashboard(),
      getBalanceMensual(),
      getBalanceDiario({ fecha_desde: primerDiaMes() })
    ]).then(([r, m, d]) => {
      setResumen(r.data)
      setMensual(m.data)
      setDiario(d.data.slice(-15)) // últimos 15 días
    }).finally(() => setCargando(false))
  }, [])

  if (cargando) return (
    <div className="loading">
      <div className="spinner" />
      Cargando dashboard...
    </div>
  )

  const balanceNeto = (resumen?.balance_mes_actual || 0) - (resumen?.gastos_fijos_agencia || 0)

  return (
    <div>
      {/* ── KPIs ── */}
      <div className="kpi-grid">
        <div className="kpi-card fade-up fade-up-1">
          <div className="kpi-icono">💰</div>
          <div className="kpi-label">Balance neto del mes</div>
          <div className={`kpi-valor ${balanceNeto >= 0 ? 'positivo' : 'negativo'}`}>
            {euros(balanceNeto)}
          </div>
          <div className="kpi-sub">Operaciones − gastos fijos</div>
        </div>

        <div className="kpi-card fade-up fade-up-2">
          <div className="kpi-icono">✈️</div>
          <div className="kpi-label">Viajes este mes</div>
          <div className="kpi-valor">{resumen?.viajes_mes_actual || 0}</div>
          <div className="kpi-sub">Operaciones registradas</div>
        </div>

        <div className="kpi-card fade-up fade-up-3">
          <div className="kpi-icono">👥</div>
          <div className="kpi-label">Pasajeros este mes</div>
          <div className="kpi-valor">{resumen?.pasajeros_mes_actual || 0}</div>
          <div className="kpi-sub">Total transportados</div>
        </div>

        <div className="kpi-card fade-up fade-up-4">
          <div className="kpi-icono">📈</div>
          <div className="kpi-label">Ingreso bruto del mes</div>
          <div className="kpi-valor">{euros(resumen?.ingreso_bruto_mes)}</div>
          <div className="kpi-sub">Antes de comisiones</div>
        </div>
      </div>

      {/* ── Gráficos ── */}
      <div className="dos-columnas">

        {/* Balance mensual — línea */}
        <div className="card fade-up">
          <div className="card-header">
            <div>
              <div className="card-titulo">Evolución mensual</div>
              <div className="card-subtitulo">Ingresos vs gastos por mes</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={mensual}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F1F3" />
              <XAxis dataKey="mes_nombre" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `€${v}`} />
              <Tooltip content={<TooltipPersonalizado />} />
              <Legend />
              <Line type="monotone" dataKey="ingreso_neto"
                name="Ingreso neto" stroke="#1B4D3E" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="gastos_operativos"
                name="Gastos" stroke="#F5A623" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="balance_mensual_neto"
                name="Balance neto" stroke="#2D7A4F" strokeWidth={2.5}
                strokeDasharray="5 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Balance diario — barras */}
        <div className="card fade-up">
          <div className="card-header">
            <div>
              <div className="card-titulo">Balance diario</div>
              <div className="card-subtitulo">Últimos 15 días operativos</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={diario}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F1F3" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }}
                tickFormatter={f => f?.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `€${v}`} />
              <Tooltip content={<TooltipPersonalizado />} />
              <Bar dataKey="ingreso_neto" name="Ingreso neto"
                fill="#1B4D3E" radius={[4,4,0,0]} />
              <Bar dataKey="gastos_totales" name="Gastos"
                fill="#F5A623" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Vehículo más rentable */}
      {resumen?.vehiculo_mas_rentable && (
        <div className="card fade-up">
          <div className="card-header">
            <div className="card-titulo">Vehículo más rentable este mes</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 40 }}>🚐</span>
            <div>
              <div style={{ fontSize: 20, fontFamily: 'var(--font-titulo)', fontWeight: 600 }}>
                {resumen.vehiculo_mas_rentable.nombre_vehiculo}
              </div>
              <div className="kpi-sub">
                Balance acumulado: <strong style={{ color: 'var(--positivo)' }}>
                  {euros(resumen.vehiculo_mas_rentable.balance)}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function primerDiaMes() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`
}