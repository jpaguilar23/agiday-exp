// ============================================================
//  pages/Historial.jsx — Listado de viajes con filtros
// ============================================================

import { useEffect, useState, useMemo } from 'react'
import { getRegistros, eliminarRegistro } from '../services/api'

const euros = (n) => `€${Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
]

// ── Chip multi-select reutilizable ───────────────────────────
function ChipSelect({ opciones, seleccionados, onChange, label }) {
  const toggle = (val) => {
    if (seleccionados.includes(val))
      onChange(seleccionados.filter(v => v !== val))
    else
      onChange([...seleccionados, val])
  }
  return (
    <div>
      <div style={estiloLabel}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
        {opciones.map(op => {
          const activo = seleccionados.includes(op.valor)
          return (
            <button key={op.valor} type="button"
              onClick={() => toggle(op.valor)}
              style={{
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 500,
                border: activo ? '1.5px solid var(--verde)' : '1.5px solid var(--gris-borde)',
                background: activo ? 'var(--verde)' : 'var(--blanco)',
                color: activo ? 'var(--blanco)' : 'var(--gris-texto)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: 'var(--font-cuerpo)',
              }}>
              {op.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Filtro de rango numérico ─────────────────────────────────
function RangoNumerico({ label, min, max, valorMin, valorMax, onChangeMin, onChangeMax }) {
  return (
    <div>
      <div style={estiloLabel}>{label}</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
        <input className="form-input" type="number" placeholder={`Mín`}
          value={valorMin} min={min} max={max}
          onChange={e => onChangeMin(e.target.value)}
          style={{ width: 80, padding: '6px 10px', fontSize: 13 }} />
        <span style={{ color: 'var(--gris-texto)', fontSize: 12 }}>—</span>
        <input className="form-input" type="number" placeholder={`Máx`}
          value={valorMax} min={min} max={max}
          onChange={e => onChangeMax(e.target.value)}
          style={{ width: 80, padding: '6px 10px', fontSize: 13 }} />
      </div>
    </div>
  )
}

const estiloLabel = {
  fontSize: 11, fontWeight: 600, letterSpacing: '1px',
  textTransform: 'uppercase', color: 'var(--gris-texto)',
}

// ── Filtros vacíos ───────────────────────────────────────────
const filtrosVacios = {
  meses:       [], 
  anios:       [],
  tours:       [],
  vehiculos:   [],
  conductores: [],
  plataformas: [],
  paxMin: '', paxMax: '',
  conDegMin: '', conDegMax: '',
  sinDegMin: '', sinDegMax: '',
  balanceMin: '', balanceMax: '',
}


export default function Historial() {
  const [datos, setDatos]           = useState([])
  const [cargando, setCargando]     = useState(true)
  const [eliminando, setEliminando] = useState(null)
  const [recargar, setRecargar]     = useState(0)
  const [filtros, setFiltros]       = useState(filtrosVacios)
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  useEffect(() => {
    getRegistros()
      .then(r => setDatos(r.data))
      .finally(() => setCargando(false))
  }, [recargar])

  const setF = (campo, valor) => setFiltros(f => ({ ...f, [campo]: valor }))

  const limpiarFiltros = () => setFiltros(filtrosVacios)

  // ── Opciones únicas derivadas de los datos ─────────────────
  const opcionesTours = useMemo(() =>
    [...new Set(datos.map(d => d.nombre_tour))].map(v => ({ valor: v, label: v })), [datos])

  const opcionesVehiculos = useMemo(() =>
    [...new Set(datos.map(d => d.nombre_vehiculo))].map(v => ({ valor: v, label: v })), [datos])

  const opcionesConductores = useMemo(() =>
    [...new Set(datos.map(d => d.conductor).filter(Boolean))].map(v => ({ valor: v, label: v })), [datos])

  const opcionesPlataformas = useMemo(() =>
    [...new Set(datos.map(d => d.plataforma || 'Directa'))].map(v => ({ valor: v, label: v })), [datos])

  const opcionesAnios = useMemo(() =>
  [...new Set(datos.map(d => parseInt(d.fecha.slice(0, 4))))].sort().reverse()
    .map(v => ({ valor: v, label: String(v) }))
, [datos])

  // ── Aplicar filtros ────────────────────────────────────────
  const datosFiltrados = useMemo(() => {
    return datos.filter(d => {
      const [anioD, mesD] = d.fecha.split('-')
      if (filtros.anios.length && !filtros.anios.includes(parseInt(anioD))) return false
      if (filtros.meses.length && !filtros.meses.includes(parseInt(mesD)))  return false
      if (filtros.tours.length       && !filtros.tours.includes(d.nombre_tour))                return false
      if (filtros.vehiculos.length   && !filtros.vehiculos.includes(d.nombre_vehiculo))        return false
      if (filtros.conductores.length && !filtros.conductores.includes(d.conductor))            return false
      const plat = d.plataforma || 'Directa'
      if (filtros.plataformas.length && !filtros.plataformas.includes(plat))                   return false
      if (filtros.paxMin !== ''    && d.cantidad_pasajeros  < Number(filtros.paxMin))          return false
      if (filtros.paxMax !== ''    && d.cantidad_pasajeros  > Number(filtros.paxMax))          return false
      if (filtros.conDegMin !== '' && d.pasajeros_con_deg   < Number(filtros.conDegMin))       return false
      if (filtros.conDegMax !== '' && d.pasajeros_con_deg   > Number(filtros.conDegMax))       return false
      const sinDeg = d.cantidad_pasajeros - d.pasajeros_con_deg
      if (filtros.sinDegMin !== '' && sinDeg                < Number(filtros.sinDegMin))       return false
      if (filtros.sinDegMax !== '' && sinDeg                > Number(filtros.sinDegMax))       return false
      if (filtros.balanceMin !== '' && d.balance_operacion  < Number(filtros.balanceMin))      return false
      if (filtros.balanceMax !== '' && d.balance_operacion  > Number(filtros.balanceMax))      return false
      return true
    })
  }, [datos, filtros])

  // ── Totales del filtro actual ──────────────────────────────
  const totales = useMemo(() => ({
    pax:     datosFiltrados.reduce((s, d) => s + d.cantidad_pasajeros, 0),
    ingresos: datosFiltrados.reduce((s, d) => s + (d.ingreso_bruto_total || 0), 0),
    balance: datosFiltrados.reduce((s, d) => s + (d.balance_operacion || 0), 0),
  }), [datosFiltrados])

  const filtrosActivos = JSON.stringify(filtros) !== JSON.stringify(filtrosVacios)

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar este viaje? Esta acción no se puede deshacer.')) return
    setEliminando(id)
    try {
      await eliminarRegistro(id)
      setRecargar(n => n + 1)
    } finally {
      setEliminando(null)
    }
  }

  if (cargando) return <div className="loading"><div className="spinner" />Cargando historial...</div>

  return (
    <div>

      {/* ── Barra superior: título + botón filtros ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-titulo)', fontSize: 17, fontWeight: 600 }}>
            Historial de viajes
          </div>
          <div style={{ fontSize: 12, color: 'var(--gris-texto)', marginTop: 2 }}>
            {datosFiltrados.length} de {datos.length} operaciones
            {filtrosActivos && <span style={{ color: 'var(--amarillo)', marginLeft: 6 }}>• filtros activos</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {filtrosActivos && (
            <button className="btn btn-outline" onClick={limpiarFiltros}
              style={{ fontSize: 12, padding: '7px 14px', color: 'var(--negativo)' }}>
              ✕ Limpiar filtros
            </button>
          )}
          <button
            className={`btn ${mostrarFiltros ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setMostrarFiltros(v => !v)}
            style={{ fontSize: 12, padding: '7px 14px' }}>
            {mostrarFiltros ? '▲ Ocultar filtros' : '▼ Filtros'}
          </button>
        </div>
      </div>

      {/* ── Panel de filtros ── */}
      {mostrarFiltros && (
        <div className="card fade-up" style={{ marginBottom: 16, padding: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Mes y Año */}
            // ✅ Después — mes fijo + año dinámico separados
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
              <ChipSelect label="Mes" opciones={MESES.map((m, i) => ({ valor: i + 1, label: m }))}
                seleccionados={filtros.meses} onChange={v => setF('meses', v)} />
              <ChipSelect label="Año" opciones={opcionesAnios}
                seleccionados={filtros.anios} onChange={v => setF('anios', v)} />
            </div>

            {/* Tours y Vehículos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <ChipSelect label="Tour" opciones={opcionesTours}
                seleccionados={filtros.tours} onChange={v => setF('tours', v)} />
              <ChipSelect label="Vehículo" opciones={opcionesVehiculos}
                seleccionados={filtros.vehiculos} onChange={v => setF('vehiculos', v)} />
            </div>

            {/* Conductores y Plataformas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <ChipSelect label="Conductor" opciones={opcionesConductores}
                seleccionados={filtros.conductores} onChange={v => setF('conductores', v)} />
              <ChipSelect label="Plataforma" opciones={opcionesPlataformas}
                seleccionados={filtros.plataformas} onChange={v => setF('plataformas', v)} />
            </div>

            {/* Rangos numéricos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
              <RangoNumerico label="Pasajeros totales"
                valorMin={filtros.paxMin} valorMax={filtros.paxMax}
                onChangeMin={v => setF('paxMin', v)} onChangeMax={v => setF('paxMax', v)} />
              <RangoNumerico label="Con degustación"
                valorMin={filtros.conDegMin} valorMax={filtros.conDegMax}
                onChangeMin={v => setF('conDegMin', v)} onChangeMax={v => setF('conDegMax', v)} />
              <RangoNumerico label="Sin degustación"
                valorMin={filtros.sinDegMin} valorMax={filtros.sinDegMax}
                onChangeMin={v => setF('sinDegMin', v)} onChangeMax={v => setF('sinDegMax', v)} />
              <RangoNumerico label="Balance (€)"
                valorMin={filtros.balanceMin} valorMax={filtros.balanceMax}
                onChangeMin={v => setF('balanceMin', v)} onChangeMax={v => setF('balanceMax', v)} />
            </div>

          </div>
        </div>
      )}

      {/* ── Resumen de totales ── */}
      {datosFiltrados.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Operaciones', valor: datosFiltrados.length, mono: false },
            { label: 'Pasajeros', valor: totales.pax, mono: false },
            { label: 'Ingresos brutos', valor: euros(totales.ingresos), mono: true },
            { label: 'Balance total', valor: euros(totales.balance), mono: true, color: totales.balance >= 0 ? 'var(--positivo)' : 'var(--negativo)' },
          ].map(({ label, valor, mono, color }) => (
            <div key={label} style={{
              background: 'var(--blanco)', border: '1px solid var(--gris-borde)',
              borderRadius: 'var(--radio-sm)', padding: '10px 18px',
              boxShadow: 'var(--sombra-sm)',
            }}>
              <div style={{ fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gris-texto)', marginBottom: 3 }}>{label}</div>
              <div style={{ fontFamily: mono ? 'var(--font-titulo)' : 'var(--font-cuerpo)', fontWeight: 600, fontSize: 15, color: color || 'var(--texto)' }}>{valor}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabla ── */}
      <div className="card fade-up">
        {datosFiltrados.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">{filtrosActivos ? '🔍' : '✈️'}</div>
            <p>{filtrosActivos ? 'Ningún viaje coincide con los filtros aplicados.' : 'No hay viajes registrados aún.'}</p>
            {filtrosActivos && (
              <button className="btn btn-outline" onClick={limpiarFiltros} style={{ marginTop: 12, fontSize: 12 }}>
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="tabla-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th><th>Tour</th><th>Vehículo</th><th>Conductor</th>
                  <th>Plataforma</th><th>Pax</th><th>Con deg.</th><th>Sin deg.</th>
                  <th>Ingreso bruto</th><th>Comisión</th><th>Gastos</th>
                  <th>Balance</th><th></th>
                </tr>
              </thead>
              <tbody>
                {datosFiltrados.map((d) => (
                  <tr key={d.id_operacion}>
                    <td>{d.fecha}</td>
                    <td>{d.nombre_tour}</td>
                    <td>{d.nombre_vehiculo}</td>
                    <td>{d.conductor || '—'}</td>
                    <td>
                      <span className="badge badge-amarillo">{d.plataforma || 'Directa'}</span>
                    </td>
                    <td>{d.cantidad_pasajeros}</td>
                    <td>{d.pasajeros_con_deg}</td>
                    <td>{d.cantidad_pasajeros - d.pasajeros_con_deg}</td>
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