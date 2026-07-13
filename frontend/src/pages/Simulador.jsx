// ============================================================
//  pages/Simulador.jsx — v3
//  Cambios:
//    - Resumen de lo seleccionado en la pantalla de resultado
//    - Botón guardar simulación con modal de nombre
//    - Lista de simulaciones guardadas (ver/eliminar)
// ============================================================

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import {
  getTours, getVehiculos, getConductores,
  getPlataformasTour, getCombustibleEstimado, simularViaje,
  guardarSimulacion, getSimulacionesGuardadas, eliminarSimulacionGuardada
} from '../services/api'

const euros = (n) => `€${Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`

const formVacio = {
  id_tour: '', id_vehiculo: '', id_conductor: '',
  costo_combustible_real: '', km_adicionales: 0,
}

export default function Simulador() {
  const [vista, setVista] = useState('form')   // 'form' | 'resultado' | 'guardadas'
  const [resultado, setResultado] = useState(null)
  const [entrada, setEntrada] = useState(null) // lo que se seleccionó para llegar al resultado

  if (vista === 'guardadas') {
    return <SimulacionesGuardadas
      onVolver={() => setVista('form')}
      onVerGuardada={(sim) => { setEntrada(sim.entrada); setResultado(sim.resultado); setVista('resultado') }}
    />
  }

  if (vista === 'resultado' && resultado) {
    return <ResultadoSimulacion
      resultado={resultado}
      entrada={entrada}
      onVolver={() => { setResultado(null); setVista('form') }}
      onVerGuardadas={() => setVista('guardadas')}
    />
  }

  return <FormularioSimulacion
    onSimular={(res, ent) => { setResultado(res); setEntrada(ent); setVista('resultado') }}
    onVerGuardadas={() => setVista('guardadas')}
  />
}


// ============================================================
// FORMULARIO
// ============================================================
function FormularioSimulacion({ onSimular, onVerGuardadas }) {
  const [form, setForm] = useState(formVacio)
  const [tours, setTours] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [conductores, setConductores] = useState([])
  const [tourSeleccionado, setTourSeleccionado] = useState(null)
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState(null)
  const [conductorSeleccionado, setConductorSeleccionado] = useState(null)
  const [capacidadMax, setCapacidadMax] = useState(null)
  const [combustibleEstimado, setCombustibleEstimado] = useState(null)
  const [paxPlataformas, setPaxPlataformas] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getTours().then(r => setTours(r.data)).catch(() => {})
    getVehiculos().then(r => setVehiculos(r.data)).catch(() => {})
    getConductores().then(r => setConductores(r.data)).catch(() => {})
  }, [])

  const handleTourChange = async (id_tour) => {
    setForm(f => ({ ...f, id_tour }))
    setCombustibleEstimado(null)
    const tour = tours.find(t => t.id_tour === parseInt(id_tour))
    setTourSeleccionado(tour || null)

    if (!id_tour) { setPaxPlataformas([]); return }

    getPlataformasTour(id_tour)
      .then(r => setPaxPlataformas(r.data.map(p => ({
        id_plataforma: p.id_plataforma, nombre: p.nombre,
        cantidad_pax: 0, pax_con_deg: 0, pax_sin_deg: 0,
      }))))
      .catch(() => {})

    if (form.id_vehiculo) {
      getCombustibleEstimado(id_tour, form.id_vehiculo)
        .then(r => setCombustibleEstimado(r.data.costo_combustible_estimado))
        .catch(() => {})
    }
  }

  const handleVehiculoChange = (id_vehiculo) => {
    setForm(f => ({ ...f, id_vehiculo }))
    setCombustibleEstimado(null)
    const veh = vehiculos.find(v => v.id_vehiculo === parseInt(id_vehiculo))
    setVehiculoSeleccionado(veh || null)
    setCapacidadMax(veh ? veh.capacidad_max : null)

    if (veh) {
      setPaxPlataformas(prev => {
        const totalActual = prev.reduce((s, p) => s + p.cantidad_pax, 0)
        if (totalActual > veh.capacidad_max) {
          return prev.map(p => ({ ...p, cantidad_pax: 0, pax_con_deg: 0, pax_sin_deg: 0 }))
        }
        return prev
      })
    }

    if (id_vehiculo && form.id_tour) {
      getCombustibleEstimado(form.id_tour, id_vehiculo)
        .then(r => setCombustibleEstimado(r.data.costo_combustible_estimado))
        .catch(() => {})
    }
  }

  const handleConductorChange = (id_conductor) => {
    setForm(f => ({ ...f, id_conductor }))
    setConductorSeleccionado(conductores.find(c => c.id_conductor === parseInt(id_conductor)) || null)
  }

  const updatePax = (id_plataforma, campo, valor) => {
    if (campo === 'cantidad_pax' && capacidadMax !== null) {
      const otrosPax = paxPlataformas.filter(p => p.id_plataforma !== id_plataforma).reduce((s, p) => s + p.cantidad_pax, 0)
      const nuevoVal = parseInt(valor) || 0
      if (otrosPax + nuevoVal > capacidadMax) return
    }
    setPaxPlataformas(prev => prev.map(p => {
      if (p.id_plataforma !== id_plataforma) return p
      const nuevo = { ...p, [campo]: parseInt(valor) || 0 }
      if (campo === 'cantidad_pax' || campo === 'pax_con_deg') {
        nuevo.pax_con_deg = Math.min(nuevo.pax_con_deg, nuevo.cantidad_pax)
        nuevo.pax_sin_deg = nuevo.cantidad_pax - nuevo.pax_con_deg
      }
      return nuevo
    }))
  }

  const totalPax = paxPlataformas.reduce((s, p) => s + p.cantidad_pax, 0)
  const totalConDeg = paxPlataformas.reduce((s, p) => s + p.pax_con_deg, 0)
  const totalSinDeg = paxPlataformas.reduce((s, p) => s + p.pax_sin_deg, 0)
  const tieneDeg = tourSeleccionado?.tiene_degustacion
  const capacidadExcedida = capacidadMax !== null && totalPax > capacidadMax

  const camposValidos = form.id_tour && form.id_vehiculo && form.id_conductor
    && totalPax > 0 && !capacidadExcedida

  const handleSimular = async () => {
    setError(null)
    setEnviando(true)
    try {
      const plataformasPayload = paxPlataformas
        .filter(p => p.cantidad_pax > 0)
        .map(p => ({
          id_plataforma: p.id_plataforma,
          cantidad_pax: p.cantidad_pax,
          pax_con_deg: p.pax_con_deg,
          pax_sin_deg: p.pax_sin_deg,
        }))

      const combustibleFinal = parseFloat(form.costo_combustible_real) || combustibleEstimado || 0

      const payload = {
        id_tour: parseInt(form.id_tour),
        id_vehiculo: parseInt(form.id_vehiculo),
        id_conductor: parseInt(form.id_conductor),
        plataformas: plataformasPayload,
        costo_combustible_real: combustibleFinal,
        km_adicionales: parseFloat(form.km_adicionales) || 0,
      }

      const res = await simularViaje(payload)

      // Guardamos también la "entrada" legible para mostrar el resumen después
      const entrada = {
        tour: tourSeleccionado?.nombre_tour,
        vehiculo: vehiculoSeleccionado?.nombre_vehiculo,
        conductor: conductorSeleccionado?.nombre,
        tiene_degustacion: tieneDeg,
        plataformas: paxPlataformas
          .filter(p => p.cantidad_pax > 0)
          .map(p => ({ nombre: p.nombre, cantidad_pax: p.cantidad_pax, pax_con_deg: p.pax_con_deg, pax_sin_deg: p.pax_sin_deg })),
        costo_combustible_real: combustibleFinal,
        km_adicionales: parseFloat(form.km_adicionales) || 0,
      }

      onSimular(res.data, entrada)
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al simular el viaje')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div style={{ width: '100%' }}>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn btn-outline" onClick={onVerGuardadas}>📁 Ver simulaciones guardadas</button>
      </div>

      {error && (
        <div className="card fade-up" style={{ borderLeft: '4px solid var(--negativo)', marginBottom: 24, padding: '14px 24px' }}>
          <div style={{ color: 'var(--negativo)', fontWeight: 500 }}>❌ {error}</div>
        </div>
      )}

      <div className="card fade-up">
        <div className="card-header">
          <div>
            <div className="card-titulo">Simulador de viajes</div>
            <div className="card-subtitulo">Probá distintos escenarios antes de registrar un viaje real — no guarda nada hasta que lo decidas</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          <div>
            <div style={estiloSeccion}>Datos del viaje</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Tour</label>
                <select className="form-select" value={form.id_tour} onChange={e => handleTourChange(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {tours.map(t => <option key={t.id_tour} value={t.id_tour}>{t.nombre_tour}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Vehículo</label>
                <select className="form-select" value={form.id_vehiculo} onChange={e => handleVehiculoChange(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {vehiculos.map(v => <option key={v.id_vehiculo} value={v.id_vehiculo}>{v.nombre_vehiculo} ({v.capacidad_max} pax)</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Conductor</label>
                <select className="form-select" value={form.id_conductor} onChange={e => handleConductorChange(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {conductores.map(c => <option key={c.id_conductor} value={c.id_conductor}>{c.nombre}</option>)}
                </select>
              </div>
            </div>
          </div>

          {form.id_tour && (
            <div>
              <div style={estiloSeccion}>
                Pasajeros por plataforma
                {totalPax > 0 && (
                  <span style={{ marginLeft: 12, color: 'var(--verde)', fontWeight: 700 }}>
                    Total: {totalPax} pax
                    {tieneDeg && ` (${totalConDeg} con deg · ${totalSinDeg} sin deg)`}
                  </span>
                )}
              </div>

              <div style={{ border: '1px solid var(--gris-borde)', borderRadius: 'var(--radio-sm)', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: tieneDeg ? '2fr 1fr 1fr 1fr' : '2fr 1fr', background: 'var(--fondo)', padding: '8px 16px', borderBottom: '1px solid var(--gris-borde)' }}>
                  {['Plataforma', 'Pax', ...(tieneDeg ? ['Con deg', 'Sin deg'] : [])].map(h => (
                    <span key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--gris-texto)', textTransform: 'uppercase', letterSpacing: 1, textAlign: h !== 'Plataforma' ? 'center' : 'left' }}>{h}</span>
                  ))}
                </div>
                {paxPlataformas.map((p, i) => (
                  <div key={p.id_plataforma} style={{
                    display: 'grid', gridTemplateColumns: tieneDeg ? '2fr 1fr 1fr 1fr' : '2fr 1fr',
                    padding: '10px 16px', alignItems: 'center',
                    borderBottom: i < paxPlataformas.length - 1 ? '1px solid var(--gris-borde)' : 'none',
                    background: p.cantidad_pax > 0 ? 'var(--verde-claro)' : 'white',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: p.cantidad_pax > 0 ? 600 : 400, color: p.cantidad_pax > 0 ? 'var(--verde)' : 'var(--texto)' }}>{p.nombre}</span>
                    <div style={{ textAlign: 'center' }}>
                      <input type="number" min="0" value={p.cantidad_pax || ''} placeholder="0"
                        onChange={e => updatePax(p.id_plataforma, 'cantidad_pax', e.target.value)}
                        style={{ width: 60, textAlign: 'center', padding: '5px 8px', border: '1px solid var(--gris-borde)', borderRadius: 6, fontSize: 13 }} />
                    </div>
                    {tieneDeg && <>
                      <div style={{ textAlign: 'center' }}>
                        <input type="number" min="0" max={p.cantidad_pax} value={p.pax_con_deg || ''} placeholder="0"
                          disabled={p.cantidad_pax === 0}
                          onChange={e => updatePax(p.id_plataforma, 'pax_con_deg', e.target.value)}
                          style={{ width: 60, textAlign: 'center', padding: '5px 8px', border: '1px solid var(--gris-borde)', borderRadius: 6, fontSize: 13, opacity: p.cantidad_pax === 0 ? 0.4 : 1 }} />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--verde)' }}>{p.pax_sin_deg}</span>
                      </div>
                    </>}
                  </div>
                ))}
                {paxPlataformas.length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--gris-texto)', fontSize: 13 }}>
                    Este tour no tiene plataformas con tarifa configurada todavía.
                  </div>
                )}
              </div>

              {capacidadExcedida && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--negativo)', background: 'var(--negativo-bg)', padding: '8px 12px', borderRadius: 6, fontWeight: 500 }}>
                  ⚠️ Capacidad excedida: el vehículo admite máximo {capacidadMax} pasajeros. Tenés {totalPax}.
                </div>
              )}
              {tourSeleccionado && !tieneDeg && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--gris-texto)', background: 'var(--amarillo-claro)', padding: '8px 12px', borderRadius: 6 }}>
                  ℹ️ Este tour no incluye degustación.
                </div>
              )}
            </div>
          )}

          <div>
            <div style={estiloSeccion}>Gastos del viaje</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  Costo combustible real €
                  {combustibleEstimado !== null && (
                    <span style={{ fontWeight: 400, color: 'var(--gris-texto)', marginLeft: 6 }}>(estimado: €{combustibleEstimado})</span>
                  )}
                </label>
                <input className="form-input" type="number" min="0" step="0.01"
                  placeholder={combustibleEstimado !== null ? `Estimado: ${combustibleEstimado}` : 'ej: 42.50'}
                  value={form.costo_combustible_real}
                  onChange={e => setForm(f => ({ ...f, costo_combustible_real: e.target.value }))} />
                {combustibleEstimado !== null && (
                  <button type="button" style={{ fontSize: 11, color: 'var(--verde)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, padding: 0 }}
                    onClick={() => setForm(f => ({ ...f, costo_combustible_real: combustibleEstimado }))}>
                    Usar estimado (€{combustibleEstimado})
                  </button>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Km adicionales</label>
                <input className="form-input" type="number" min="0" placeholder="0"
                  value={form.km_adicionales} onChange={e => setForm(f => ({ ...f, km_adicionales: e.target.value }))} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--gris-borde)' }}>
            <span style={{ fontSize: 12, color: 'var(--gris-texto)' }}>
              {!camposValidos ? '⚠ Completá tour, vehículo, conductor y al menos 1 pasajero' : `✓ Listo para simular`}
            </span>
            <button className="btn btn-primary" onClick={handleSimular} disabled={enviando || !camposValidos} style={{ padding: '11px 28px', fontSize: 14 }}>
              {enviando ? '⏳ Simulando...' : '🔮 Simular viaje'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}


// ============================================================
// RESULTADO — gráfico + resumen de selección + guardar
// ============================================================
function ResultadoSimulacion({ resultado, entrada, onVolver, onVerGuardadas }) {
  const [mostrarGuardar, setMostrarGuardar] = useState(false)
  const [nombreGuardar, setNombreGuardar] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  const datosGrafico = [{
    nombre: resultado.tour,
    'Ingreso bruto': resultado.ingreso_bruto,
    'Comisión': -resultado.comision,
    'Gastos': -resultado.total_gastos,
    'Balance': resultado.balance,
  }]

  const filasCostos = [
    ['Vehículo',       resultado.costos.vehiculo],
    ['Combustible',    resultado.costos.combustible],
    ['Conductor',      resultado.costos.conductor],
    ['Parking',        resultado.costos.parking],
    ['Lavado',         resultado.costos.lavado],
    ['Viáticos',       resultado.costos.viaticos],
    ['Km adicional',   resultado.costos.km_adicional],
    ['Agua',           resultado.costos.agua],
    ['Tickets/entradas', resultado.costos.tickets],
    ['Peajes',         resultado.costos.peajes],
    ...(resultado.tiene_degustacion ? [['Degustación', resultado.costos.degustacion]] : []),
  ].filter(([, v]) => v > 0)

  const handleGuardar = async () => {
    if (!nombreGuardar.trim()) return
    setGuardando(true)
    try {
      await guardarSimulacion({ nombre: nombreGuardar.trim(), entrada, resultado })
      setGuardado(true)
      setMostrarGuardar(false)
    } catch {
      // silencioso, se podría mostrar error si se quiere
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div style={{ width: '100%' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button className="btn btn-outline" onClick={onVolver}>← Nueva simulación</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={onVerGuardadas}>📁 Ver guardadas</button>
          {guardado ? (
            <span className="badge badge-positivo" style={{ padding: '8px 16px', fontSize: 13 }}>✓ Guardada</span>
          ) : (
            <button className="btn btn-primary" onClick={() => setMostrarGuardar(true)}>💾 Guardar simulación</button>
          )}
        </div>
      </div>

      {/* Modal simple de guardar */}
      {mostrarGuardar && (
        <div className="card fade-up" style={{ marginBottom: 20, borderLeft: '4px solid var(--amarillo)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 240 }}>
              <label className="form-label">Nombre de la simulación</label>
              <input className="form-input" type="text" placeholder="ej: Molinos 6 pax verano"
                value={nombreGuardar} onChange={e => setNombreGuardar(e.target.value)} autoFocus />
            </div>
            <button className="btn btn-primary" onClick={handleGuardar} disabled={guardando || !nombreGuardar.trim()}>
              {guardando ? 'Guardando...' : 'Confirmar'}
            </button>
            <button className="btn btn-outline" onClick={() => setMostrarGuardar(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card fade-up fade-up-1">
          <div className="kpi-label">Ingreso bruto</div>
          <div className="kpi-valor">{euros(resultado.ingreso_bruto)}</div>
        </div>
        <div className="kpi-card fade-up fade-up-2">
          <div className="kpi-label">Comisión plataformas</div>
          <div className="kpi-valor negativo">-{euros(resultado.comision)}</div>
        </div>
        <div className="kpi-card fade-up fade-up-3">
          <div className="kpi-label">Gastos totales</div>
          <div className="kpi-valor negativo">-{euros(resultado.total_gastos)}</div>
        </div>
        <div className="kpi-card fade-up fade-up-4">
          <div className="kpi-label">Balance estimado</div>
          <div className={`kpi-valor ${resultado.balance >= 0 ? 'positivo' : 'negativo'}`}>{euros(resultado.balance)}</div>
        </div>
      </div>

      {/* Resumen de lo seleccionado */}
      {entrada && (
        <div className="card fade-up">
          <div className="card-header"><div className="card-titulo">📋 Resumen de la simulación</div></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <ResumenItem label="Tour" valor={entrada.tour} />
            <ResumenItem label="Vehículo" valor={entrada.vehiculo} />
            <ResumenItem label="Conductor" valor={entrada.conductor} />
            <ResumenItem label="Km adicionales" valor={entrada.km_adicionales || 0} />
            <ResumenItem label="Combustible usado" valor={euros(entrada.costo_combustible_real)} />
            <ResumenItem label="Total pasajeros" valor={resultado.total_pasajeros} />
          </div>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--gris-borde)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gris-texto)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Pasajeros por plataforma seleccionados
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {entrada.plataformas?.map((p, i) => (
                <span key={i} className="badge badge-amarillo">
                  {p.nombre}: {p.cantidad_pax} pax
                  {resultado.tiene_degustacion && ` (${p.pax_con_deg} con deg · ${p.pax_sin_deg} sin deg)`}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Gráfico */}
      <div className="card fade-up">
        <div className="card-header">
          <div>
            <div className="card-titulo">{resultado.tour}</div>
            <div className="card-subtitulo">{resultado.total_pasajeros} pasajeros simulados</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={datosGrafico}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F1F3" />
            <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `€${v}`} />
            <Tooltip formatter={v => euros(Math.abs(v))} />
            <Legend payload={[
              { value: 'Ingreso bruto', type: 'square', color: '#1B4D3E' },
              { value: 'Comisión',      type: 'square', color: '#F5A623' },
              { value: 'Gastos',        type: 'square', color: '#C0392B' },
              { value: 'Balance',       type: 'square', color: resultado.balance >= 0 ? '#2D7A4F' : '#C0392B' },
            ]} />
            <Bar dataKey="Ingreso bruto" fill="#1B4D3E" radius={[4,4,0,0]} />
            <Bar dataKey="Comisión"      fill="#F5A623" radius={[4,4,0,0]} />
            <Bar dataKey="Gastos"        fill="#C0392B" radius={[4,4,0,0]} />
            <Bar dataKey="Balance"       radius={[4,4,0,0]}>
              <Cell fill={resultado.balance >= 0 ? '#2D7A4F' : '#C0392B'} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Ingresos por plataforma */}
      <div className="card fade-up">
        <div className="card-header"><div className="card-titulo">Ingresos por plataforma</div></div>
        <div className="tabla-wrapper">
          <table>
            <thead><tr><th>Plataforma</th><th>Pax</th>{resultado.tiene_degustacion && <><th>Con deg</th><th>Sin deg</th></>}<th>Ingreso bruto</th><th>Comisión</th></tr></thead>
            <tbody>
              {resultado.detalle_plataformas.map((p, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{p.nombre}</td>
                  <td>{p.cantidad_pax}</td>
                  {resultado.tiene_degustacion && <><td>{p.pax_con_deg}</td><td>{p.pax_sin_deg}</td></>}
                  <td className="td-monto">{euros(p.ingreso_bruto)}</td>
                  <td className="td-monto td-negativo">-{euros(p.comision)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Desglose de gastos */}
      <div className="card fade-up">
        <div className="card-header"><div className="card-titulo">Desglose de gastos</div></div>
        <div className="tabla-wrapper">
          <table>
            <thead><tr><th>Concepto</th><th>Monto</th></tr></thead>
            <tbody>
              {filasCostos.map(([label, val]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td className="td-monto td-negativo">-{euros(val)}</td>
                </tr>
              ))}
              <tr style={{ background: 'var(--fondo)', fontWeight: 700 }}>
                <td>Total gastos</td>
                <td className="td-monto td-negativo">-{euros(resultado.total_gastos)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

function ResumenItem({ label, valor }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gris-texto)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{valor ?? '—'}</div>
    </div>
  )
}


// ============================================================
// SIMULACIONES GUARDADAS — lista
// ============================================================
function SimulacionesGuardadas({ onVolver, onVerGuardada }) {
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    getSimulacionesGuardadas()
      .then(r => { setLista(r.data); setCargando(false) })
      .catch(() => setCargando(false))
  }, [])

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar esta simulación guardada?')) return
    await eliminarSimulacionGuardada(id)
    setLista(prev => prev.filter(s => s.id_simulacion !== id))
  }

  return (
    <div style={{ width: '100%' }}>
      <button className="btn btn-outline" style={{ marginBottom: 20 }} onClick={onVolver}>← Volver al simulador</button>

      <div className="card fade-up">
        <div className="card-header">
          <div>
            <div className="card-titulo">📁 Simulaciones guardadas</div>
            <div className="card-subtitulo">{lista.length} simulación{lista.length !== 1 ? 'es' : ''} guardada{lista.length !== 1 ? 's' : ''}</div>
          </div>
        </div>

        {cargando ? (
          <div className="loading"><div className="spinner" />Cargando...</div>
        ) : lista.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔮</div>
            <p>Todavía no guardaste ninguna simulación.</p>
          </div>
        ) : (
          <div className="tabla-wrapper">
            <table>
              <thead><tr><th>Nombre</th><th>Tour</th><th>Pax</th><th>Balance</th><th>Fecha</th><th></th></tr></thead>
              <tbody>
                {lista.map(s => (
                  <tr key={s.id_simulacion} style={{ cursor: 'pointer' }} onClick={() => onVerGuardada(s)}>
                    <td style={{ fontWeight: 600 }}>{s.nombre}</td>
                    <td>{s.entrada?.tour}</td>
                    <td>{s.resultado?.total_pasajeros}</td>
                    <td className={`td-monto ${s.resultado?.balance >= 0 ? 'td-positivo' : 'td-negativo'}`}>
                      {euros(s.resultado?.balance)}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--gris-texto)' }}>
                      {new Date(s.created_at).toLocaleDateString('es-ES')}
                    </td>
                    <td>
                      <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 12, color: 'var(--negativo)' }}
                        onClick={(e) => { e.stopPropagation(); eliminar(s.id_simulacion) }}>
                        🗑️
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

const estiloSeccion = {
  fontSize: 11, fontWeight: 600, letterSpacing: '1.5px',
  textTransform: 'uppercase', color: 'var(--gris-texto)',
  marginBottom: 12, paddingBottom: 6,
  borderBottom: '1px solid var(--gris-borde)',
  display: 'flex', alignItems: 'center', gap: 8,
}