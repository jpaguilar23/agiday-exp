// ============================================================
//  pages/Registro.jsx — v4
//  Cambios:
//    - id_config cargado dinámicamente al seleccionar tour
//    - Combustible estimado como referencia al seleccionar tour+vehículo
//    - tiene_degustacion desde BD (no hardcodeado)
// ============================================================

import { useState, useEffect } from 'react'
import {
  crearRegistro, getTours, getVehiculos, getConductores,
  getPlataformas, getPlataformasTour, getConfigTour, getCombustibleEstimado
} from '../services/api'

const hoy = () => new Date().toISOString().slice(0, 10)

const formVacio = {
  fecha:                  hoy(),
  id_tour:                '',
  id_vehiculo:            '',
  id_conductor:           '',
  id_config:              null,
  costo_combustible_real: '',
  km_adicionales:         0,
  notas:                  '',
}

export default function Registro() {
  const [form, setForm]           = useState(formVacio)
  const [enviando, setEnviando]   = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error, setError]         = useState(null)

  // Catálogos
  const [tours, setTours]         = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [conductores, setConductores] = useState([])

  // Tour y vehículo seleccionado
  const [tourSeleccionado, setTourSeleccionado] = useState(null)
  const [combustibleEstimado, setCombustibleEstimado] = useState(null)
  const [capacidadMax, setCapacidadMax]               = useState(null)

  // Pasajeros por plataforma
  const [paxPlataformas, setPaxPlataformas] = useState([])

  // ── Cargar catálogos ─────────────────────────────────────
  useEffect(() => {
    getTours().then(r => setTours(r.data)).catch(() => {})
    getVehiculos().then(r => setVehiculos(r.data)).catch(() => {})
    getConductores().then(r => setConductores(r.data)).catch(() => {})
    getPlataformas()
      .then(r => setPaxPlataformas(
        r.data.filter(p => p.activa).map(p => ({
          id_plataforma: p.id_plataforma,
          nombre:        p.nombre,
          cantidad_pax:  0,
          pax_con_deg:   0,
          pax_sin_deg:   0,
        }))
      ))
      .catch(() => {})
  }, [])

  // ── Cambio de tour ───────────────────────────────────────
  const handleTourChange = async (id_tour) => {
    setForm(f => ({ ...f, id_tour, id_config: null }))
    setCombustibleEstimado(null)

    const tour = tours.find(t => t.id_tour === parseInt(id_tour))
    setTourSeleccionado(tour || null)

    if (!id_tour) {
      // Sin tour: restaurar todas las plataformas
      getPlataformas()
        .then(r => setPaxPlataformas(
          r.data.filter(p => p.activa).map(p => ({
            id_plataforma: p.id_plataforma,
            nombre:        p.nombre,
            cantidad_pax:  0,
            pax_con_deg:   0,
            pax_sin_deg:   0,
          }))
        ))
        .catch(() => {})
      return
    }

    // Cargar plataformas con tarifa para este tour
    getPlataformasTour(id_tour)
      .then(r => setPaxPlataformas(
        r.data.map(p => ({
          id_plataforma: p.id_plataforma,
          nombre:        p.nombre,
          cantidad_pax:  0,
          pax_con_deg:   0,
          pax_sin_deg:   0,
        }))
      ))
      .catch(() => {})

    // Cargar id_config vigente del tour
    try {
      const res = await getConfigTour(id_tour)
      setForm(f => ({ ...f, id_tour, id_config: res.data.id_config }))
    } catch {
      setError('No hay configuración vigente para este tour')
    }

    // Resetear degustación si el tour no la tiene
    if (tour && !tour.tiene_degustacion) {
      setPaxPlataformas(prev =>
        prev.map(p => ({ ...p, pax_con_deg: 0, pax_sin_deg: p.cantidad_pax }))
      )
    }

    // Cargar combustible estimado si ya hay vehículo seleccionado
    if (form.id_vehiculo) {
      getCombustibleEstimado(id_tour, form.id_vehiculo)
        .then(r => setCombustibleEstimado(r.data.costo_combustible_estimado))
        .catch(() => {})
    }
  }

  // ── Cambio de vehículo ───────────────────────────────────
  const handleVehiculoChange = (id_vehiculo) => {
    // Guardar capacidad del vehículo seleccionado
    const veh = vehiculos.find(v => v.id_vehiculo === parseInt(id_vehiculo))
    setCapacidadMax(veh ? veh.capacidad_max : null)
    // Resetear pax si superan la nueva capacidad
    if (veh) {
      setPaxPlataformas(prev => {
        const totalActual = prev.reduce((s, p) => s + p.cantidad_pax, 0)
        if (totalActual > veh.capacidad_max) {
          return prev.map(p => ({ ...p, cantidad_pax: 0, pax_con_deg: 0, pax_sin_deg: 0 }))
        }
        return prev
      })
    }
    setForm(f => ({ ...f, id_vehiculo }))
    setCombustibleEstimado(null)

    if (id_vehiculo && form.id_tour) {
      getCombustibleEstimado(form.id_tour, id_vehiculo)
        .then(r => setCombustibleEstimado(r.data.costo_combustible_estimado))
        .catch(() => {})
    }
  }

  // ── Actualizar pax por plataforma ────────────────────────
  const updatePax = (id_plataforma, campo, valor) => {
    // No permitir superar capacidad total del vehículo
    if (campo === 'cantidad_pax' && capacidadMax !== null) {
      const otrosPax = paxPlataformas
        .filter(p => p.id_plataforma !== id_plataforma)
        .reduce((s, p) => s + p.cantidad_pax, 0)
      const nuevoVal = parseInt(valor) || 0
      if (otrosPax + nuevoVal > capacidadMax) return
    }
    setPaxPlataformas(prev => prev.map(p => {
      if (p.id_plataforma !== id_plataforma) return p
      const nuevo = { ...p, [campo]: parseInt(valor) || 0 }
      if (campo === 'cantidad_pax') {
        nuevo.pax_con_deg = Math.min(nuevo.pax_con_deg, nuevo.cantidad_pax)
        nuevo.pax_sin_deg = nuevo.cantidad_pax - nuevo.pax_con_deg
      }
      if (campo === 'pax_con_deg') {
        nuevo.pax_con_deg = Math.min(nuevo.pax_con_deg, nuevo.cantidad_pax)
        nuevo.pax_sin_deg = nuevo.cantidad_pax - nuevo.pax_con_deg
      }
      return nuevo
    }))
  }

  // ── Totales ──────────────────────────────────────────────
  const totalPax    = paxPlataformas.reduce((s, p) => s + p.cantidad_pax, 0)
  const capacidadExcedida = capacidadMax !== null && totalPax > capacidadMax
  const totalConDeg = paxPlataformas.reduce((s, p) => s + p.pax_con_deg, 0)
  const totalSinDeg = paxPlataformas.reduce((s, p) => s + p.pax_sin_deg, 0)
  const tieneDeg    = tourSeleccionado?.tiene_degustacion

  // ── Submit ───────────────────────────────────────────────
  const handleSubmit = async () => {
    setError(null)
    setResultado(null)
    setEnviando(true)
    try {
      const payload = {
        fecha:                  form.fecha,
        id_tour:                parseInt(form.id_tour),
        id_vehiculo:            parseInt(form.id_vehiculo),
        id_conductor:           parseInt(form.id_conductor),
        id_config:              form.id_config,
        plataformas:            paxPlataformas
          .filter(p => p.cantidad_pax > 0)
          .map(p => ({
            id_plataforma: p.id_plataforma,
            cantidad_pax:  p.cantidad_pax,
            pax_con_deg:   p.pax_con_deg,
            pax_sin_deg:   p.pax_sin_deg,
          })),
        costo_combustible_real: parseFloat(form.costo_combustible_real) || 0,
        km_adicionales:         parseFloat(form.km_adicionales) || 0,
        notas:                  form.notas || null,
      }

      const res = await crearRegistro(payload)
      setResultado(res.data)
      setForm(formVacio)
      setPaxPlataformas(prev => prev.map(p => ({ ...p, cantidad_pax: 0, pax_con_deg: 0, pax_sin_deg: 0 })))
      setTourSeleccionado(null)
      setCombustibleEstimado(null)
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al registrar el viaje')
    } finally {
      setEnviando(false)
    }
  }

  const euros = (n) => `€${Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`
  const camposValidos = form.id_tour && form.id_vehiculo && form.id_conductor
    && form.id_config && totalPax > 0 && !capacidadExcedida

  return (
    <div style={{ maxWidth: 960, width: '100%' }}>

      {/* Resultado */}
      {resultado && (
        <div className="card fade-up" style={{ borderLeft: '4px solid var(--positivo)', marginBottom: 24, padding: '16px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--positivo)', marginBottom: 10 }}>✅ Viaje registrado</div>
              <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', fontSize: 13 }}>
                {[
                  ['Ingreso bruto', resultado.ingreso_bruto, false],
                  ['Comisión',      resultado.comision,      true],
                  ['Ingreso neto',  resultado.ingreso_neto,  false],
                  ['Gastos',        resultado.total_gastos,  true],
                  ['Balance',       resultado.balance,       false],
                ].map(([label, val, negativo]) => (
                  <div key={label}>
                    <div style={estiloLabel}>{label}</div>
                    <strong style={{ fontSize: 15, color: label === 'Balance' ? (val >= 0 ? 'var(--positivo)' : 'var(--negativo)') : negativo ? 'var(--negativo)' : 'inherit' }}>
                      {negativo ? '-' : ''}{euros(val)}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
            <button className="btn btn-outline" onClick={() => setResultado(null)} style={{ padding: '6px 10px', fontSize: 12 }}>✕</button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card fade-up" style={{ borderLeft: '4px solid var(--negativo)', marginBottom: 24, padding: '14px 24px' }}>
          <div style={{ color: 'var(--negativo)', fontWeight: 500 }}>❌ {error}</div>
        </div>
      )}

      <div className="card fade-up">
        <div className="card-header">
          <div>
            <div className="card-titulo">Nuevo viaje</div>
            <div className="card-subtitulo">Los costos se calculan automáticamente</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* DATOS DEL VIAJE */}
          <div>
            <div style={estiloSeccion}>Datos del viaje</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Fecha</label>
                <input className="form-input" type="date"
                  value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
              </div>
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
                <select className="form-select" value={form.id_conductor} onChange={e => setForm(f => ({ ...f, id_conductor: e.target.value }))}>
                  <option value="">Seleccionar...</option>
                  {conductores.map(c => <option key={c.id_conductor} value={c.id_conductor}>{c.nombre}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* PASAJEROS POR PLATAFORMA */}
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
                  display: 'grid',
                  gridTemplateColumns: tieneDeg ? '2fr 1fr 1fr 1fr' : '2fr 1fr',
                  padding: '10px 16px', alignItems: 'center',
                  borderBottom: i < paxPlataformas.length - 1 ? '1px solid var(--gris-borde)' : 'none',
                  background: p.cantidad_pax > 0 ? 'var(--verde-claro)' : 'white',
                }}>
                  <span style={{ fontSize: 13, fontWeight: p.cantidad_pax > 0 ? 600 : 400, color: p.cantidad_pax > 0 ? 'var(--verde)' : 'var(--texto)' }}>
                    {p.nombre}
                  </span>
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
            </div>
            {capacidadExcedida && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--negativo)', background: 'var(--negativo-bg)', padding: '8px 12px', borderRadius: 6, fontWeight: 500 }}>
                ⚠️ Capacidad excedida: el vehículo seleccionado admite máximo {capacidadMax} pasajeros. Tenés {totalPax}.
              </div>
            )}
            {tourSeleccionado && !tieneDeg && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--gris-texto)', background: 'var(--amarillo-claro)', padding: '8px 12px', borderRadius: 6 }}>
                ℹ️ Este tour no incluye degustación.
              </div>
            )}
          </div>

          {/* GASTOS */}
          <div>
            <div style={estiloSeccion}>Gastos del viaje</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  Costo combustible real €
                  {combustibleEstimado !== null && (
                    <span style={{ fontWeight: 400, color: 'var(--gris-texto)', marginLeft: 6 }}>
                      (estimado: €{combustibleEstimado})
                    </span>
                  )}
                </label>
                <input className="form-input" type="number" min="0" step="0.01"
                  placeholder={combustibleEstimado !== null ? `Estimado: ${combustibleEstimado}` : 'ej: 42.50'}
                  value={form.costo_combustible_real}
                  onChange={e => setForm(f => ({ ...f, costo_combustible_real: e.target.value }))} />
                {combustibleEstimado !== null && (
                  <button type="button"
                    style={{ fontSize: 11, color: 'var(--verde)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, padding: 0 }}
                    onClick={() => setForm(f => ({ ...f, costo_combustible_real: combustibleEstimado }))}>
                    Usar estimado (€{combustibleEstimado})
                  </button>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Km adicionales</label>
                <input className="form-input" type="number" min="0" placeholder="0"
                  value={form.km_adicionales}
                  onChange={e => setForm(f => ({ ...f, km_adicionales: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Notas</label>
                <input className="form-input" type="text" placeholder="Opcional..."
                  value={form.notas}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* BOTÓN */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--gris-borde)' }}>
            <span style={{ fontSize: 12, color: 'var(--gris-texto)' }}>
              {!camposValidos
                ? '⚠ Completá tour, vehículo, conductor y al menos 1 pasajero'
                : `✓ ${totalPax} pasajero${totalPax !== 1 ? 's' : ''} en ${paxPlataformas.filter(p => p.cantidad_pax > 0).length} plataforma${paxPlataformas.filter(p => p.cantidad_pax > 0).length !== 1 ? 's' : ''}`}
            </span>
            <button className="btn btn-primary" onClick={handleSubmit}
              disabled={enviando || !camposValidos}
              style={{ padding: '11px 28px', fontSize: 14 }}>
              {enviando ? '⏳ Registrando...' : 'Registrar viaje'}
            </button>
          </div>

        </div>
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

const estiloLabel = {
  color: 'var(--gris-texto)', fontSize: 11,
  textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2,
}