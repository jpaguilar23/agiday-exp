// ============================================================
//  pages/Registro.jsx — Formulario para registrar un viaje
// ============================================================

import { useState, useEffect } from 'react'
import { crearRegistro, getTours, getVehiculos, getConductores, getPlataformas } from '../services/api'

const hoy = () => new Date().toISOString().slice(0, 10)

const vacio = {
  fecha:              hoy(),
  id_tour:            '',
  id_vehiculo:        '',
  id_conductor:       '',
  id_plataforma:      '',
  id_config:          1,
  cantidad_pasajeros: '',
  pasajeros_con_deg:  '',
  pasajeros_sin_deg:  0,
  km_adicionales:     0,
  notas:              '',
}

export default function Registro() {
  const [form, setForm]           = useState(vacio)
  const [enviando, setEnviando]   = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error, setError]         = useState(null)

  // Catálogos dinámicos desde la BD
  const [tours, setTours]             = useState([])
  const [vehiculos, setVehiculos]     = useState([])
  const [conductores, setConductores] = useState([])
  const [plataformas, setPlataformas] = useState([])

  useEffect(() => {
    getTours().then(r => setTours(r.data.tours || r.data)).catch(() => {})
    getVehiculos().then(r => setVehiculos(r.data)).catch(() => {})
    getConductores().then(r => setConductores(r.data.conductores || r.data)).catch(() => {})
    getPlataformas().then(r => setPlataformas(r.data)).catch(() => {})
  }, [])

  const set = (campo, valor) => {
    setForm(prev => {
      const nuevo = { ...prev, [campo]: valor }
      if (campo === 'cantidad_pasajeros' || campo === 'pasajeros_con_deg') {
        const total = parseInt(campo === 'cantidad_pasajeros' ? valor : nuevo.cantidad_pasajeros) || 0
        const cond  = parseInt(campo === 'pasajeros_con_deg'  ? valor : nuevo.pasajeros_con_deg)  || 0
        nuevo.pasajeros_sin_deg = Math.max(0, total - cond)
      }
      return nuevo
    })
  }

  const handleSubmit = async () => {
    setError(null)
    setResultado(null)
    setEnviando(true)
    try {
      const payload = {
        ...form,
        id_tour:            parseInt(form.id_tour),
        id_vehiculo:        parseInt(form.id_vehiculo),
        id_conductor:       parseInt(form.id_conductor),
        id_plataforma:      form.id_plataforma ? parseInt(form.id_plataforma) : null,
        cantidad_pasajeros: parseInt(form.cantidad_pasajeros),
        pasajeros_con_deg:  parseInt(form.pasajeros_con_deg) || 0,
        pasajeros_sin_deg:  parseInt(form.pasajeros_sin_deg),
        km_adicionales:     parseFloat(form.km_adicionales) || 0,
      }
      const res = await crearRegistro(payload)
      setResultado(res.data)
      setForm(vacio)
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al registrar el viaje')
    } finally {
      setEnviando(false)
    }
  }

  const euros = (n) => `€${Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`

  const camposValidos = form.id_tour && form.id_vehiculo && form.id_conductor && form.cantidad_pasajeros

  return (
    <div style={{ maxWidth: 900, width: '100%' }}>

      {/* Resultado exitoso */}
      {resultado && (
        <div className="card fade-up" style={{
          borderLeft: '4px solid var(--positivo)',
          marginBottom: 24,
          padding: '16px 24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--positivo)', marginBottom: 10 }}>
                ✅ Viaje registrado correctamente
              </div>
              <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', fontSize: 13 }}>
                <div>
                  <div style={{ color: 'var(--gris-texto)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Ingreso bruto</div>
                  <strong style={{ fontSize: 15 }}>{euros(resultado.ingreso_bruto_total)}</strong>
                </div>
                <div>
                  <div style={{ color: 'var(--gris-texto)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Gastos</div>
                  <strong style={{ fontSize: 15, color: 'var(--negativo)' }}>-{euros(resultado.total_gastos)}</strong>
                </div>
                <div>
                  <div style={{ color: 'var(--gris-texto)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Balance</div>
                  <strong style={{ fontSize: 15, color: resultado.balance_operacion >= 0 ? 'var(--positivo)' : 'var(--negativo)' }}>
                    {euros(resultado.balance_operacion)}
                  </strong>
                </div>
              </div>
            </div>
            <button className="btn btn-outline" onClick={() => setResultado(null)}
              style={{ padding: '6px 10px', fontSize: 12 }}>✕</button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card fade-up" style={{
          borderLeft: '4px solid var(--negativo)',
          marginBottom: 24,
          padding: '14px 24px',
        }}>
          <div style={{ color: 'var(--negativo)', fontWeight: 500 }}>❌ {error}</div>
        </div>
      )}

      {/* Formulario */}
      <div className="card fade-up">
        <div className="card-header">
          <div>
            <div className="card-titulo">Nuevo viaje</div>
            <div className="card-subtitulo">Los costos se calculan automáticamente al registrar</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Sección: Datos del viaje */}
          <div>
            <div style={estiloSeccion}>Datos del viaje</div>
            <div className="form-grid">

              <div className="form-group">
                <label className="form-label">Fecha</label>
                <input className="form-input" type="date"
                  value={form.fecha} onChange={e => set('fecha', e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Tour</label>
                <select className="form-select"
                  value={form.id_tour} onChange={e => set('id_tour', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {tours.filter(t => t.activo).map(t =>
                    <option key={t.id_tour} value={t.id_tour}>{t.nombre_tour}</option>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Vehículo</label>
                <select className="form-select"
                  value={form.id_vehiculo} onChange={e => set('id_vehiculo', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {vehiculos.filter(v => v.activo).map(v =>
                    <option key={v.id_vehiculo} value={v.id_vehiculo}>{v.nombre_vehiculo}</option>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Conductor</label>
                <select className="form-select"
                  value={form.id_conductor} onChange={e => set('id_conductor', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {conductores.filter(c => c.activo).map(c =>
                    <option key={c.id_conductor} value={c.id_conductor}>{c.nombre}</option>
                  )}
                </select>
              </div>

            </div>
          </div>

          {/* Sección: Pasajeros */}
          <div>
            <div style={estiloSeccion}>Pasajeros</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Total pasajeros</label>
                <input className="form-input" type="number" min="1" max="8"
                  placeholder="0"
                  value={form.cantidad_pasajeros}
                  onChange={e => set('cantidad_pasajeros', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Con degustación</label>
                <input className="form-input" type="number" min="0"
                  placeholder="0"
                  value={form.pasajeros_con_deg}
                  onChange={e => set('pasajeros_con_deg', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Sin degustación</label>
                <input
                  className="form-input"
                  type="number"
                  value={form.pasajeros_sin_deg}
                  disabled
                  style={{
                    background: 'var(--verde-claro)',
                    color: 'var(--verde)',
                    fontWeight: 600,
                    cursor: 'not-allowed',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Sección: Venta y extras */}
          <div>
            <div style={estiloSeccion}>Venta y extras</div>
            <div className="form-grid">

              <div className="form-group">
                <label className="form-label">Plataforma de venta</label>
                <select className="form-select"
                  value={form.id_plataforma} onChange={e => set('id_plataforma', e.target.value)}>
                  <option value="">Sin plataforma / Directa</option>
                  {plataformas.filter(p => p.activa).map(p =>
                    <option key={p.id_plataforma} value={p.id_plataforma}>{p.nombre}</option>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Km adicionales</label>
                <input className="form-input" type="number" min="0"
                  placeholder="0"
                  value={form.km_adicionales}
                  onChange={e => set('km_adicionales', e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Notas</label>
                <input className="form-input" type="text" placeholder="Opcional..."
                  value={form.notas} onChange={e => set('notas', e.target.value)} />
              </div>

            </div>
          </div>

          {/* Botón */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 8,
            borderTop: '1px solid var(--gris-borde)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--gris-texto)' }}>
              {!camposValidos ? '⚠ Completá tour, vehículo, conductor y pasajeros' : '✓ Listo para registrar'}
            </span>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={enviando || !camposValidos}
              style={{ padding: '11px 28px', fontSize: 14 }}
            >
              {enviando ? 'Registrando...' : 'Registrar viaje'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

const estiloSeccion = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: 'var(--gris-texto)',
  marginBottom: 12,
  paddingBottom: 6,
  borderBottom: '1px solid var(--gris-borde)',
}