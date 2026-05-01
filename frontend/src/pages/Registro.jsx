// ============================================================
//  pages/Registro.jsx — Formulario para registrar un viaje
// ============================================================

import { useState } from 'react'
import { crearRegistro } from '../services/api'

const hoy = () => new Date().toISOString().slice(0, 10)

const VEHICULOS = [
  { id: 1, nombre: 'Coche Mercedes' },
  { id: 2, nombre: 'Furgoneta UV Mercedes' },
  { id: 3, nombre: 'Camioneta V6' },
  { id: 4, nombre: 'Furgoneta Hyundai (diaria)' },
]

const CONDUCTORES = [
  { id: 1, nombre: 'Jessi' },
  { id: 2, nombre: 'Diego' },
]

const PLATAFORMAS = [
  { id: 1, nombre: 'Viator' },
  { id: 2, nombre: 'Booking' },
  { id: 3, nombre: 'Get Your Guide' },
  { id: 4, nombre: 'BOKUN' },
  { id: 5, nombre: 'Venta directa' },
]

const vacio = {
  fecha:              hoy(),
  id_tour:            1,
  id_vehiculo:        '',
  id_conductor:       '',
  id_plataforma:      '',
  id_config:          1,
  cantidad_pasajeros: '',
  pasajeros_con_deg:  0,
  pasajeros_sin_deg:  '',
  km_adicionales:     0,
  notas:              '',
}

export default function Registro() {
  const [form, setForm]       = useState(vacio)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error, setError]     = useState(null)

  const set = (campo, valor) => {
    setForm(prev => {
      const nuevo = { ...prev, [campo]: valor }
      // Auto-calcular pasajeros_sin_deg
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
        id_vehiculo:        parseInt(form.id_vehiculo),
        id_conductor:       parseInt(form.id_conductor),
        id_plataforma:      form.id_plataforma ? parseInt(form.id_plataforma) : null,
        cantidad_pasajeros: parseInt(form.cantidad_pasajeros),
        pasajeros_con_deg:  parseInt(form.pasajeros_con_deg),
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

  return (
    <div style={{ maxWidth: 800 }}>

      {/* Resultado exitoso */}
      {resultado && (
        <div className="card fade-up" style={{
          borderLeft: '4px solid var(--positivo)',
          marginBottom: 24
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--positivo)', marginBottom: 8 }}>
                ✅ Viaje registrado correctamente
              </div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13 }}>
                <span>Ingreso bruto: <strong>{euros(resultado.ingreso_bruto_total)}</strong></span>
                <span>Gastos: <strong style={{ color: 'var(--negativo)' }}>-{euros(resultado.total_gastos)}</strong></span>
                <span>Balance: <strong style={{ color: resultado.balance_operacion >= 0 ? 'var(--positivo)' : 'var(--negativo)' }}>
                  {euros(resultado.balance_operacion)}
                </strong></span>
              </div>
            </div>
            <button className="btn btn-outline" onClick={() => setResultado(null)}>✕</button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card fade-up" style={{ borderLeft: '4px solid var(--negativo)', marginBottom: 24 }}>
          <div style={{ color: 'var(--negativo)', fontWeight: 500 }}>❌ {error}</div>
        </div>
      )}

      {/* Formulario */}
      <div className="card fade-up">
        <div className="card-header">
          <div>
            <div className="card-titulo">Nuevo viaje</div>
            <div className="card-subtitulo">Los costos se calculan automáticamente</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Fila 1: fecha, vehículo, conductor */}
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Fecha</label>
              <input className="form-input" type="date"
                value={form.fecha} onChange={e => set('fecha', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Vehículo</label>
              <select className="form-select"
                value={form.id_vehiculo} onChange={e => set('id_vehiculo', e.target.value)}>
                <option value="">Seleccionar...</option>
                {VEHICULOS.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Conductor</label>
              <select className="form-select"
                value={form.id_conductor} onChange={e => set('id_conductor', e.target.value)}>
                <option value="">Seleccionar...</option>
                {CONDUCTORES.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          </div>

          {/* Fila 2: plataforma, pasajeros */}
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Plataforma de venta</label>
              <select className="form-select"
                value={form.id_plataforma} onChange={e => set('id_plataforma', e.target.value)}>
                <option value="">Sin plataforma</option>
                {PLATAFORMAS.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Pasajeros sin degustación</label>
              <input className="form-input" type="number" min="0" max="8"
                value={form.cantidad_pasajeros}
                onChange={e => set('cantidad_pasajeros', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Pasajeros con degustación</label>
              <input className="form-input" type="number" min="0"
                value={form.pasajeros_con_deg}
                onChange={e => set('pasajeros_con_deg', e.target.value)} />
            </div>
          </div>

          {/* Pasajeros sin degustación — calculado automático */}
          <div style={{
            background: 'var(--verde-claro)', borderRadius: 'var(--radio-sm)',
            padding: '10px 14px', fontSize: 13, color: 'var(--verde)'
          }}>
            Pasajeros sin degustación: <strong>{form.pasajeros_sin_deg}</strong>
            &nbsp;(calculado automáticamente)
          </div>

          {/* Km adicionales y notas */}
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Km adicionales (si hubo desvío)</label>
              <input className="form-input" type="number" min="0"
                value={form.km_adicionales}
                onChange={e => set('km_adicionales', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Notas</label>
              <input className="form-input" type="text" placeholder="Opcional..."
                value={form.notas} onChange={e => set('notas', e.target.value)} />
            </div>
          </div>

          {/* Botón */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={enviando || !form.id_vehiculo || !form.id_conductor || !form.cantidad_pasajeros}
              style={{ padding: '11px 28px', fontSize: 14 }}
            >
              {enviando ? '⏳ Registrando...' : '✅ Registrar viaje'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}