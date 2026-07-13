// ============================================================
//  pages/AdminPanel.jsx — Panel administrativo completo
//  CRUD para todas las tablas del sistema
// ============================================================

import React, { useEffect, useState } from 'react'
import {
  adminGetVehiculos, adminCrearVehiculo, adminEditarVehiculo, adminEliminarVehiculo,
  adminGetConductores, adminCrearConductor, adminEditarConductor, adminEliminarConductor,
  adminGetTours, adminCrearTour, adminEditarTour, adminEliminarTour,
  adminCrearConfig, adminEditarConfig,
  adminGetTarifasPorTour, adminCrearTarifa, adminEditarTarifa, adminEliminarTarifa,
  adminGetCostosVehiculoTourPorTour, adminCrearCostoVehiculoTour,
  adminEditarCostoVehiculoTour, adminEliminarCostoVehiculoTour,
  adminGetPlataformas, adminCrearPlataforma, adminEditarPlataforma, adminEliminarPlataforma,
  adminGetCostos, adminCrearCosto, adminEditarCosto, adminEliminarCosto,
  adminGetUsuarios, adminCrearUsuario, adminEditarUsuario, adminEliminarUsuario
} from '../services/adminApi'

// ── Componente reutilizable: fila de tabla con acciones ──────
function FilaAcciones({ onEditar, onEliminar }) {
  return (
    <td style={{ display: 'flex', gap: 6 }}>
      <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }}
        onClick={onEditar}>✏️</button>
      <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 12, color: 'var(--negativo)' }}
        onClick={onEliminar}>🗑️</button>
    </td>
  )
}

// ── Secciones del panel ──────────────────────────────────────
const SECCIONES = [
  { key: 'vehiculos',   label: '🚐 Vehículos' },
  { key: 'conductores', label: '👤 Conductores' },
  { key: 'tours',       label: '🗺️ Tours' },
  { key: 'plataformas', label: '📱 Plataformas' },
  { key: 'costos',      label: '💰 Costos fijos' },
  { key: 'usuarios',    label: '👥 Usuarios' },
]

export default function AdminPanel() {
  const [seccion, setSeccion] = useState('vehiculos')

  return (
    <div>
      {/* Tabs de sección */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {SECCIONES.map(s => (
          <button key={s.key}
            className={`btn ${seccion === s.key ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setSeccion(s.key)}>
            {s.label}
          </button>
        ))}
      </div>

      {seccion === 'vehiculos'   && <SeccionVehiculos />}
      {seccion === 'conductores' && <SeccionConductores />}
      {seccion === 'tours'       && <SeccionTours />}
      {seccion === 'plataformas' && <SeccionPlataformas />}
      {seccion === 'costos'      && <SeccionCostos />}
      {seccion === 'usuarios'    && <SeccionUsuarios />}
    </div>
  )
}


// ============================================================
// SECCIÓN VEHÍCULOS
// ============================================================
const vehiculoVacio = {
  nombre_vehiculo: '', capacidad_max: '', combustible_por_viaje: '',
  alquiler_mensual: '', km_mensual_contrato: '', costo_km_extra: '',
  alquiler_diario: '', activo: true
}

function SeccionVehiculos() {
  const [datos, setDatos]       = useState([])
  const [form, setForm]         = useState(vehiculoVacio)
  const [editId, setEditId]     = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  const cargar = () => adminGetVehiculos().then(r => setDatos(r.data))
  useEffect(() => { cargar() }, [])

  const guardar = async () => {
    const payload = { ...form,
      capacidad_max: parseInt(form.capacidad_max),
      combustible_por_viaje: parseFloat(form.combustible_por_viaje),
      alquiler_mensual: parseFloat(form.alquiler_mensual),
      km_mensual_contrato: form.km_mensual_contrato ? parseFloat(form.km_mensual_contrato) : null,
      costo_km_extra: form.costo_km_extra ? parseFloat(form.costo_km_extra) : null,
      alquiler_diario: form.alquiler_diario ? parseFloat(form.alquiler_diario) : null,
    }
    if (editId) await adminEditarVehiculo(editId, payload)
    else        await adminCrearVehiculo(payload)
    setForm(vehiculoVacio); setEditId(null); setMostrarForm(false); cargar()
  }

  const editar = (v) => { setForm(v); setEditId(v.id_vehiculo); setMostrarForm(true) }
  const eliminar = async (id) => {
    if (!confirm('¿Eliminar vehículo?')) return
    await adminEliminarVehiculo(id); cargar()
  }

  return (
    <div className="card fade-up">
      <div className="card-header">
        <div className="card-titulo">Vehículos</div>
        <button className="btn btn-primary" onClick={() => { setForm(vehiculoVacio); setEditId(null); setMostrarForm(true) }}>
          + Agregar
        </button>
      </div>

      {mostrarForm && (
        <div style={{ background: 'var(--fondo)', borderRadius: 'var(--radio-sm)', padding: 20, marginBottom: 20 }}>
          <div className="form-grid">
            {[
              ['nombre_vehiculo','Nombre','text'], ['capacidad_max','Capacidad máx','number'],
              ['combustible_por_viaje','Combustible €/viaje','number'], ['alquiler_mensual','Alquiler mensual €','number'],
              ['km_mensual_contrato','Km contrato mensual','number'], ['costo_km_extra','Costo km extra €','number'],
              ['alquiler_diario','Alquiler diario € (Hyundai)','number'],
            ].map(([campo, label, tipo]) => (
              <div className="form-group" key={campo}>
                <label className="form-label">{label}</label>
                <input className="form-input" type={tipo}
                  value={form[campo] || ''}
                  onChange={e => setForm(f => ({ ...f, [campo]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={guardar}>
              {editId ? '💾 Guardar cambios' : '+ Crear'}
            </button>
            <button className="btn btn-outline" onClick={() => setMostrarForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="tabla-wrapper">
        <table>
          <thead><tr>
            <th>Nombre</th><th>Capacidad</th><th>Combustible</th>
            <th>Alquiler mes</th><th>Km contrato</th><th>Km extra</th>
            <th>Alquiler diario</th><th>Activo</th><th></th>
          </tr></thead>
          <tbody>
            {datos.map(v => (
              <tr key={v.id_vehiculo}>
                <td>{v.nombre_vehiculo}</td><td>{v.capacidad_max}</td>
                <td>€{v.combustible_por_viaje}</td><td>€{v.alquiler_mensual}</td>
                <td>{v.km_mensual_contrato || '—'}</td><td>{v.costo_km_extra || '—'}</td>
                <td>{v.alquiler_diario ? `€${v.alquiler_diario}` : '—'}</td>
                <td><span className={`badge ${v.activo ? 'badge-positivo' : 'badge-negativo'}`}>
                  {v.activo ? 'Sí' : 'No'}</span></td>
                <FilaAcciones onEditar={() => editar(v)} onEliminar={() => eliminar(v.id_vehiculo)} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}


// ============================================================
// SECCIÓN CONDUCTORES
// ============================================================
function SeccionConductores() {
  const [datos, setDatos]   = useState({ conductores: [], honorarios: [] })
  const [form, setForm]     = useState({ nombre: '', activo: true })
  const [editId, setEditId] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  const cargar = () => adminGetConductores().then(r => setDatos(r.data))
  useEffect(() => { cargar() }, [])

  const guardar = async () => {
    if (editId) await adminEditarConductor(editId, form)
    else        await adminCrearConductor(form)
    setForm({ nombre: '', activo: true }); setEditId(null); setMostrarForm(false); cargar()
  }

  const editar = (c) => { setForm({ nombre: c.nombre, activo: c.activo }); setEditId(c.id_conductor); setMostrarForm(true) }
  const eliminar = async (id) => { if (!confirm('¿Eliminar conductor?')) return; await adminEliminarConductor(id); cargar() }

  return (
    <div className="card fade-up">
      <div className="card-header">
        <div className="card-titulo">Conductores</div>
        <button className="btn btn-primary" onClick={() => { setForm({ nombre: '', activo: true }); setEditId(null); setMostrarForm(true) }}>
          + Agregar
        </button>
      </div>

      {mostrarForm && (
        <div style={{ background: 'var(--fondo)', borderRadius: 'var(--radio-sm)', padding: 20, marginBottom: 20 }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input className="form-input" value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={guardar}>{editId ? '💾 Guardar' : '+ Crear'}</button>
            <button className="btn btn-outline" onClick={() => setMostrarForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="tabla-wrapper">
        <table>
          <thead><tr><th>Nombre</th><th>Activo</th><th></th></tr></thead>
          <tbody>
            {datos.conductores.map(c => (
              <tr key={c.id_conductor}>
                <td>{c.nombre}</td>
                <td><span className={`badge ${c.activo ? 'badge-positivo' : 'badge-negativo'}`}>{c.activo ? 'Sí' : 'No'}</span></td>
                <FilaAcciones onEditar={() => editar(c)} onEliminar={() => eliminar(c.id_conductor)} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}


// ============================================================
// SECCIÓN PLATAFORMAS
// ============================================================
function SeccionPlataformas() {
  const [datos, setDatos]   = useState([])
  const [form, setForm]     = useState({ nombre: '', es_gestora: false, activa: true })
  const [editId, setEditId] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  const cargar = () => adminGetPlataformas().then(r => setDatos(r.data))
  useEffect(() => { cargar() }, [])

  const guardar = async () => {
    if (editId) await adminEditarPlataforma(editId, form)
    else        await adminCrearPlataforma(form)
    setForm({ nombre: '', es_gestora: false, activa: true }); setEditId(null); setMostrarForm(false); cargar()
  }

  return (
    <div className="card fade-up">
      <div className="card-header">
        <div className="card-titulo">Plataformas de venta</div>
        <button className="btn btn-primary" onClick={() => { setForm({ nombre: '', es_gestora: false, activa: true }); setEditId(null); setMostrarForm(true) }}>+ Agregar</button>
      </div>

      {mostrarForm && (
        <div style={{ background: 'var(--fondo)', borderRadius: 'var(--radio-sm)', padding: 20, marginBottom: 20 }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input className="form-input" value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">¿Es gestora? (ej: BOKUN)</label>
              <select className="form-select" value={form.es_gestora}
                onChange={e => setForm(f => ({ ...f, es_gestora: e.target.value === 'true' }))}>
                <option value="false">No</option>
                <option value="true">Sí</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={guardar}>{editId ? '💾 Guardar' : '+ Crear'}</button>
            <button className="btn btn-outline" onClick={() => setMostrarForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="tabla-wrapper">
        <table>
          <thead><tr><th>Nombre</th><th>Gestora</th><th>Activa</th><th></th></tr></thead>
          <tbody>
            {datos.map(p => (
              <tr key={p.id_plataforma}>
                <td>{p.nombre}</td>
                <td><span className={`badge ${p.es_gestora ? 'badge-amarillo' : 'badge-positivo'}`}>{p.es_gestora ? 'Sí' : 'No'}</span></td>
                <td><span className={`badge ${p.activa ? 'badge-positivo' : 'badge-negativo'}`}>{p.activa ? 'Sí' : 'No'}</span></td>
                <FilaAcciones
                  onEditar={() => { setForm({ nombre: p.nombre, es_gestora: p.es_gestora, activa: p.activa }); setEditId(p.id_plataforma); setMostrarForm(true) }}
                  onEliminar={async () => { if (!confirm('¿Eliminar?')) return; await adminEliminarPlataforma(p.id_plataforma); cargar() }} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}


// ============================================================
// SECCIÓN COSTOS FIJOS
// ============================================================
function SeccionCostos() {
  const [datos, setDatos]   = useState([])
  const [form, setForm]     = useState({ concepto: '', monto_mensual: '', activo: true })
  const [editId, setEditId] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  const cargar = () => adminGetCostos().then(r => setDatos(r.data))
  useEffect(() => { cargar() }, [])

  const guardar = async () => {
    const payload = { ...form, monto_mensual: parseFloat(form.monto_mensual) }
    if (editId) await adminEditarCosto(editId, payload)
    else        await adminCrearCosto(payload)
    setForm({ concepto: '', monto_mensual: '', activo: true }); setEditId(null); setMostrarForm(false); cargar()
  }

  const total = datos.filter(d => d.activo).reduce((s, d) => s + d.monto_mensual, 0)

  return (
    <div className="card fade-up">
      <div className="card-header">
        <div>
          <div className="card-titulo">Costos fijos mensuales</div>
          <div className="card-subtitulo">Total activos: €{total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}/mes</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ concepto: '', monto_mensual: '', activo: true }); setEditId(null); setMostrarForm(true) }}>+ Agregar</button>
      </div>

      {mostrarForm && (
        <div style={{ background: 'var(--fondo)', borderRadius: 'var(--radio-sm)', padding: 20, marginBottom: 20 }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Concepto</label>
              <input className="form-input" value={form.concepto}
                onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Monto mensual €</label>
              <input className="form-input" type="number" value={form.monto_mensual}
                onChange={e => setForm(f => ({ ...f, monto_mensual: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={guardar}>{editId ? '💾 Guardar' : '+ Crear'}</button>
            <button className="btn btn-outline" onClick={() => setMostrarForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="tabla-wrapper">
        <table>
          <thead><tr><th>Concepto</th><th>Monto/mes</th><th>Activo</th><th></th></tr></thead>
          <tbody>
            {datos.map(d => (
              <tr key={d.id_costo_fijo}>
                <td>{d.concepto}</td>
                <td className="td-monto">€{d.monto_mensual}</td>
                <td><span className={`badge ${d.activo ? 'badge-positivo' : 'badge-negativo'}`}>{d.activo ? 'Sí' : 'No'}</span></td>
                <FilaAcciones
                  onEditar={() => { setForm({ concepto: d.concepto, monto_mensual: d.monto_mensual, activo: d.activo }); setEditId(d.id_costo_fijo); setMostrarForm(true) }}
                  onEliminar={async () => { if (!confirm('¿Eliminar?')) return; await adminEliminarCosto(d.id_costo_fijo); cargar() }} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}


// ============================================================
// SECCIÓN TOURS — versión completa
//   Tour → Configuración (costos operativos)
//        → Tarifas por plataforma (precio + comisión)
//        → Combustible estimado por vehículo
// ============================================================

const tourVacio = { nombre_tour: '', distancia_km: '', activo: true, tiene_degustacion: false }

const configVacia = {
  costo_degustacion: 0, costo_agua_entradas: 0, parking_fijo: 0,
  lavacar_fijo: 0, viaticos_fijo: 0, tickets_por_persona: 0, peajes: 0,
  vigente_desde: new Date().toISOString().slice(0, 10),
}

function SeccionTours() {
  const [datos, setDatos]     = useState({ tours: [], configuraciones: [] })
  const [plataformas, setPlataformas] = useState([])
  const [vehiculos, setVehiculos]     = useState([])

  const [form, setForm]       = useState(tourVacio)
  const [editId, setEditId]   = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  // Tour expandido para ver/editar su config, tarifas y combustible
  const [tourAbierto, setTourAbierto] = useState(null)

  const cargar = () => adminGetTours().then(r => setDatos(r.data))

  useEffect(() => {
    cargar()
    adminGetPlataformas().then(r => setPlataformas(r.data))
    adminGetVehiculos().then(r => setVehiculos(r.data))
  }, [])

  const guardar = async () => {
    const payload = { ...form, distancia_km: parseFloat(form.distancia_km) }
    if (editId) await adminEditarTour(editId, payload)
    else        await adminCrearTour(payload)
    setForm(tourVacio); setEditId(null); setMostrarForm(false); cargar()
  }

  const configDeTour = (id_tour) =>
    datos.configuraciones.find(c => c.id_tour === id_tour && !c.vigente_hasta)

  return (
    <div className="card fade-up">
      <div className="card-header">
        <div>
          <div className="card-titulo">Tours</div>
          <div className="card-subtitulo">Crear, configurar costos, tarifas por plataforma y combustible — todo desde aquí</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(tourVacio); setEditId(null); setMostrarForm(true) }}>+ Agregar tour</button>
      </div>

      {mostrarForm && (
        <div style={{ background: 'var(--fondo)', borderRadius: 'var(--radio-sm)', padding: 20, marginBottom: 20 }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Nombre del tour</label>
              <input className="form-input" value={form.nombre_tour}
                onChange={e => setForm(f => ({ ...f, nombre_tour: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Distancia km</label>
              <input className="form-input" type="number" value={form.distancia_km}
                onChange={e => setForm(f => ({ ...f, distancia_km: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">¿Tiene degustación?</label>
              <select className="form-select" value={form.tiene_degustacion ? 'true' : 'false'}
                onChange={e => setForm(f => ({ ...f, tiene_degustacion: e.target.value === 'true' }))}>
                <option value="false">No</option>
                <option value="true">Sí</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={guardar}>{editId ? '💾 Guardar' : '+ Crear'}</button>
            <button className="btn btn-outline" onClick={() => setMostrarForm(false)}>Cancelar</button>
          </div>
          {!editId && (
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--gris-texto)' }}>
              ℹ️ Después de crear el tour, abrilo en la lista de abajo para configurar sus costos, tarifas y combustible.
            </div>
          )}
        </div>
      )}

      <div className="tabla-wrapper">
        <table>
          <thead><tr><th></th><th>Tour</th><th>Distancia</th><th>Degustación</th><th>Config.</th><th>Activo</th><th></th></tr></thead>
          <tbody>
            {datos.tours.map(t => {
              const config = configDeTour(t.id_tour)
              const abierto = tourAbierto === t.id_tour
              return (
                <React.Fragment key={t.id_tour}>
                  <tr>
                    <td>
                      <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: 12 }}
                        onClick={() => setTourAbierto(abierto ? null : t.id_tour)}>
                        {abierto ? '▼' : '▶'}
                      </button>
                    </td>
                    <td style={{ fontWeight: 500 }}>{t.nombre_tour}</td>
                    <td>{t.distancia_km} km</td>
                    <td><span className={`badge ${t.tiene_degustacion ? 'badge-amarillo' : 'badge-positivo'}`}>{t.tiene_degustacion ? 'Sí' : 'No'}</span></td>
                    <td><span className={`badge ${config ? 'badge-positivo' : 'badge-negativo'}`}>{config ? 'Configurado' : 'Falta config'}</span></td>
                    <td><span className={`badge ${t.activo ? 'badge-positivo' : 'badge-negativo'}`}>{t.activo ? 'Sí' : 'No'}</span></td>
                    <FilaAcciones
                      onEditar={() => { setForm({ nombre_tour: t.nombre_tour, distancia_km: t.distancia_km, activo: t.activo, tiene_degustacion: t.tiene_degustacion }); setEditId(t.id_tour); setMostrarForm(true) }}
                      onEliminar={async () => { if (!confirm('¿Eliminar tour? Esto borra también su configuración y tarifas.')) return; await adminEliminarTour(t.id_tour); cargar() }} />
                  </tr>
                  {abierto && (
                    <tr>
                      <td colSpan={7} style={{ background: 'var(--fondo)', padding: 0 }}>
                        <DetalleTour
                          tour={t}
                          config={config}
                          plataformas={plataformas}
                          vehiculos={vehiculos}
                          tours={datos.tours}
                          onConfigGuardada={cargar}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}


// ── Detalle expandido de un tour: config + tarifas + combustible ──
function DetalleTour({ tour, config, plataformas, vehiculos, tours, onConfigGuardada }) {
  const [tab, setTab] = useState('config')

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          ['config',  '⚙️ Configuración de costos'],
          ['tarifas', '💵 Tarifas por plataforma'],
          ['combustible', '⛽ Combustible por vehículo'],
        ].map(([key, label]) => (
          <button key={key}
            className={`btn ${tab === key ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: 12, padding: '6px 12px' }}
            onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {tab === 'config' && (
        <ConfigTourForm tour={tour} config={config} tours={tours} onGuardado={onConfigGuardada} />
      )}
      {tab === 'tarifas' && (
        <TarifasTourTabla tour={tour} plataformas={plataformas} />
      )}
      {tab === 'combustible' && (
        <CombustibleTourTabla tour={tour} vehiculos={vehiculos} />
      )}
    </div>
  )
}


// ── Sub-sección: configuración de costos operativos ──────────
function ConfigTourForm({ tour, config, tours, onGuardado }) {
  const [form, setForm] = useState(config ? { ...config } : configVacia)
  const [copiarDe, setCopiarDe] = useState('')
  const [guardando, setGuardando] = useState(false)

  // El form se reinicia solo cuando cambia el id de la config (no en cada render)
  const configId = config?.id_config ?? null
  const [configIdAnterior, setConfigIdAnterior] = useState(configId)
  if (configId !== configIdAnterior) {
    setConfigIdAnterior(configId)
    setForm(config ? { ...config } : configVacia)
  }

  const campos = [
    ['costo_degustacion',   'Degustación €/persona'],
    ['costo_agua_entradas', 'Agua €/persona'],
    ['parking_fijo',        'Parking €'],
    ['lavacar_fijo',        'Lavado €'],
    ['viaticos_fijo',       'Viáticos €'],
    ['tickets_por_persona', 'Tickets/entradas €/persona'],
    ['peajes',              'Peajes €'],
  ]

  const guardar = async () => {
    setGuardando(true)
    const payload = {
      id_tour: tour.id_tour,
      vigente_desde: form.vigente_desde || new Date().toISOString().slice(0, 10),
      vigente_hasta: null,
      ...Object.fromEntries(campos.map(([k]) => [k, parseFloat(form[k]) || 0])),
    }
    try {
      if (config) await adminEditarConfig(config.id_config, payload)
      else        await adminCrearConfig(payload)
      onGuardado()
    } finally {
      setGuardando(false)
    }
  }

  const otrosTours = tours.filter(t => t.id_tour !== tour.id_tour)

  return (
    <div>
      {!config && (
        <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--gris-texto)' }}>
          Este tour no tiene configuración todavía. Completá los valores abajo o copiá la configuración de otro tour como punto de partida.
        </div>
      )}

      <div className="form-group" style={{ marginBottom: 16, maxWidth: 320 }}>
        <label className="form-label">Copiar valores de otro tour (opcional)</label>
        <select className="form-select" value={copiarDe}
          onChange={e => {
            const idSel = e.target.value
            setCopiarDe(idSel)
          }}>
          <option value="">— Elegir tour para copiar —</option>
          {otrosTours.map(t => <option key={t.id_tour} value={t.id_tour}>{t.nombre_tour}</option>)}
        </select>
        <div style={{ fontSize: 11, color: 'var(--gris-texto)', marginTop: 4 }}>
          Nota: copiá los números manualmente desde la pestaña de ese tour si necesitás los valores exactos.
        </div>
      </div>

      <div className="form-grid">
        {campos.map(([key, label]) => (
          <div className="form-group" key={key}>
            <label className="form-label">{label}</label>
            <input className="form-input" type="number" step="0.01"
              value={form[key] ?? 0}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
          </div>
        ))}
        <div className="form-group">
          <label className="form-label">Vigente desde</label>
          <input className="form-input" type="date"
            value={form.vigente_desde || new Date().toISOString().slice(0, 10)}
            onChange={e => setForm(f => ({ ...f, vigente_desde: e.target.value }))} />
        </div>
      </div>

      <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={guardar} disabled={guardando}>
        {guardando ? 'Guardando...' : config ? '💾 Guardar configuración' : '+ Crear configuración'}
      </button>
    </div>
  )
}


// ── Sub-sección: tarifas por plataforma ───────────────────────
function TarifasTourTabla({ tour, plataformas }) {
  const [tarifas, setTarifas] = useState([])
  const [form, setForm]       = useState({ id_plataforma: '', comision_pct: '', precio_con_deg: '', precio_sin_deg: '', vigente_desde: new Date().toISOString().slice(0, 10) })
  const [editId, setEditId]   = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  const cargar = () => adminGetTarifasPorTour(tour.id_tour).then(r => setTarifas(r.data))
  useEffect(() => { cargar() }, [tour.id_tour])

  const guardar = async () => {
    const payload = {
      id_tour: tour.id_tour,
      id_plataforma: parseInt(form.id_plataforma),
      comision_pct: parseFloat(form.comision_pct) / 100,
      precio_con_deg: tour.tiene_degustacion ? parseFloat(form.precio_con_deg) || null : null,
      precio_sin_deg: parseFloat(form.precio_sin_deg),
      vigente_desde: form.vigente_desde,
      vigente_hasta: null,
    }
    if (editId) await adminEditarTarifa(editId, payload)
    else        await adminCrearTarifa(payload)
    setForm({ id_plataforma: '', comision_pct: '', precio_con_deg: '', precio_sin_deg: '', vigente_desde: new Date().toISOString().slice(0, 10) })
    setEditId(null); setMostrarForm(false); cargar()
  }

  const plataformasUsadas = tarifas.map(t => t.id_plataforma)
  const plataformasDisponibles = plataformas.filter(p => editId ? true : !plataformasUsadas.includes(p.id_plataforma))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--gris-texto)' }}>
          Cada plataforma puede tener un precio y comisión distinto para este tour.
        </span>
        <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 14px' }}
          onClick={() => { setForm({ id_plataforma: '', comision_pct: '', precio_con_deg: '', precio_sin_deg: '', vigente_desde: new Date().toISOString().slice(0, 10) }); setEditId(null); setMostrarForm(true) }}>
          + Agregar tarifa
        </button>
      </div>

      {mostrarForm && (
        <div style={{ background: 'var(--blanco)', border: '1px solid var(--gris-borde)', borderRadius: 'var(--radio-sm)', padding: 16, marginBottom: 16 }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Plataforma</label>
              <select className="form-select" value={form.id_plataforma}
                onChange={e => setForm(f => ({ ...f, id_plataforma: e.target.value }))}>
                <option value="">Seleccionar...</option>
                {plataformasDisponibles.map(p => <option key={p.id_plataforma} value={p.id_plataforma}>{p.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Comisión %</label>
              <input className="form-input" type="number" step="0.1" placeholder="ej: 27"
                value={form.comision_pct} onChange={e => setForm(f => ({ ...f, comision_pct: e.target.value }))} />
            </div>
            {tour.tiene_degustacion && (
              <div className="form-group">
                <label className="form-label">Precio con degustación €</label>
                <input className="form-input" type="number" step="0.01"
                  value={form.precio_con_deg} onChange={e => setForm(f => ({ ...f, precio_con_deg: e.target.value }))} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Precio {tour.tiene_degustacion ? 'sin degustación' : 'base'} €</label>
              <input className="form-input" type="number" step="0.01"
                value={form.precio_sin_deg} onChange={e => setForm(f => ({ ...f, precio_sin_deg: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={guardar}>{editId ? '💾 Guardar' : '+ Crear'}</button>
            <button className="btn btn-outline" style={{ fontSize: 12 }} onClick={() => setMostrarForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="tabla-wrapper">
        <table>
          <thead><tr>
            <th>Plataforma</th><th>Comisión</th>
            {tour.tiene_degustacion && <th>Con deg.</th>}
            <th>{tour.tiene_degustacion ? 'Sin deg.' : 'Precio'}</th><th></th>
          </tr></thead>
          <tbody>
            {tarifas.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--gris-texto)', padding: 20 }}>Sin tarifas configuradas aún</td></tr>
            )}
            {tarifas.map(t => (
              <tr key={t.id_tarifa}>
                <td style={{ fontWeight: 500 }}>{t.plataforma}</td>
                <td>{(t.comision_pct * 100).toFixed(0)}%</td>
                {tour.tiene_degustacion && <td>{t.precio_con_deg ? `€${t.precio_con_deg}` : '—'}</td>}
                <td>€{t.precio_sin_deg}</td>
                <FilaAcciones
                  onEditar={() => {
                    setForm({
                      id_plataforma: t.id_plataforma,
                      comision_pct: (t.comision_pct * 100).toString(),
                      precio_con_deg: t.precio_con_deg || '',
                      precio_sin_deg: t.precio_sin_deg,
                      vigente_desde: t.vigente_desde,
                    })
                    setEditId(t.id_tarifa); setMostrarForm(true)
                  }}
                  onEliminar={async () => { if (!confirm('¿Eliminar esta tarifa?')) return; await adminEliminarTarifa(t.id_tarifa); cargar() }} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}


// ── Sub-sección: combustible estimado por vehículo ────────────
function CombustibleTourTabla({ tour, vehiculos }) {
  const [costos, setCostos] = useState([])
  const [edicion, setEdicion] = useState({}) // { id_vehiculo: valor }
  const [guardandoId, setGuardandoId] = useState(null)

  const cargar = () => adminGetCostosVehiculoTourPorTour(tour.id_tour).then(r => setCostos(r.data))
  useEffect(() => { cargar() }, [tour.id_tour])

  const costoDe = (id_vehiculo) => costos.find(c => c.id_vehiculo === id_vehiculo)

  const guardar = async (vehiculo) => {
    const existente = costoDe(vehiculo.id_vehiculo)
    const valor = parseFloat(edicion[vehiculo.id_vehiculo])
    if (isNaN(valor)) return
    setGuardandoId(vehiculo.id_vehiculo)
    try {
      const payload = {
        id_tour: tour.id_tour,
        id_vehiculo: vehiculo.id_vehiculo,
        costo_combustible: valor,
        vigente_desde: existente?.vigente_desde || new Date().toISOString().slice(0, 10),
        vigente_hasta: null,
      }
      if (existente) await adminEditarCostoVehiculoTour(existente.id, payload)
      else           await adminCrearCostoVehiculoTour(payload)
      await cargar()
      setEdicion(e => ({ ...e, [vehiculo.id_vehiculo]: undefined }))
    } finally {
      setGuardandoId(null)
    }
  }

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--gris-texto)', marginBottom: 12 }}>
        Combustible estimado para este tour según el vehículo. El usuario puede usarlo como referencia al registrar un viaje.
      </div>
      <div className="tabla-wrapper">
        <table>
          <thead><tr><th>Vehículo</th><th>Capacidad</th><th>Combustible estimado €</th><th></th></tr></thead>
          <tbody>
            {vehiculos.map(v => {
              const existente = costoDe(v.id_vehiculo)
              const valorActual = edicion[v.id_vehiculo] !== undefined ? edicion[v.id_vehiculo] : (existente?.costo_combustible ?? '')
              return (
                <tr key={v.id_vehiculo}>
                  <td style={{ fontWeight: 500 }}>{v.nombre_vehiculo}</td>
                  <td>{v.capacidad_max} pax</td>
                  <td>
                    <input className="form-input" type="number" step="0.01" style={{ width: 120 }}
                      placeholder="Sin configurar"
                      value={valorActual}
                      onChange={e => setEdicion(ed => ({ ...ed, [v.id_vehiculo]: e.target.value }))} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 12px' }}
                        disabled={guardandoId === v.id_vehiculo || edicion[v.id_vehiculo] === undefined}
                        onClick={() => guardar(v)}>
                        {guardandoId === v.id_vehiculo ? '...' : '💾 Guardar'}
                      </button>
                      {existente && (
                        <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 10px', color: 'var(--negativo)' }}
                          onClick={async () => {
                            if (!confirm('¿Eliminar este costo de combustible?')) return
                            await adminEliminarCostoVehiculoTour(existente.id)
                            cargar()
                          }}>
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}




// ============================================================
// SECCIÓN USUARIOS
// ============================================================
function SeccionUsuarios() {
  const [datos, setDatos]   = useState([])
  const [form, setForm]     = useState({ nombre: '', email: '', password: '', rol: 'usuario', activo: true })
  const [editId, setEditId] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [verPass, setVerPass] = useState(false)

  const cargar = () => adminGetUsuarios().then(r => setDatos(r.data))
  useEffect(() => { cargar() }, [])

  const guardar = async () => {
    if (editId) await adminEditarUsuario(editId, form)
    else        await adminCrearUsuario(form)
    setForm({ nombre: '', email: '', password: '', rol: 'usuario', activo: true })
    setEditId(null); setMostrarForm(false); cargar()
  }

   const abrirForm = (u = null) => {
    setVerPass(false)
    if (u) {
      setForm({ nombre: u.nombre, email: u.email, password: '', rol: u.rol, activo: u.activo })
      setEditId(u.id_usuario)
    } else {
      setForm({ nombre: '', email: '', password: '', rol: 'usuario', activo: true })
      setEditId(null)
    }
    setMostrarForm(true)
  }
 

  return (
    <div className="card fade-up">
      <div className="card-header">
        <div className="card-titulo">Usuarios del sistema</div>
        <button className="btn btn-primary" onClick={() => abrirForm()}>+ Agregar</button>
      </div>

      {mostrarForm && (
        <div style={{ background: 'var(--fondo)', borderRadius: 'var(--radio-sm)', padding: 20, marginBottom: 20 }}>
          <div className="form-grid">

            {/* Nombre */}
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input className="form-input" type="text" value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>

            {/* Contraseña con botón de ojo */}
            <div className="form-group">
              <label className="form-label">
                {editId ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={verPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  style={{ paddingRight: 40, width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setVerPass(v => !v)}
                  style={{
                    position: 'absolute', right: 10, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: 16,
                    color: 'var(--gris-texto)', padding: 0,
                    lineHeight: 1,
                  }}
                  title={verPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {verPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Rol */}
            <div className="form-group">
              <label className="form-label">Rol</label>
              <select className="form-select" value={form.rol}
                onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}>
                <option value="usuario">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={guardar}>{editId ? '💾 Guardar' : '+ Crear'}</button>
            <button className="btn btn-outline" onClick={() => setMostrarForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="tabla-wrapper">
        <table>
          <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Activo</th><th></th></tr></thead>
          <tbody>
            {datos.map(u => (
              <tr key={u.id_usuario}>
                <td>{u.nombre}</td>
                <td>{u.email}</td>
                <td><span className={`badge ${u.rol === 'admin' ? 'badge-amarillo' : 'badge-positivo'}`}>{u.rol}</span></td>
                <td><span className={`badge ${u.activo ? 'badge-positivo' : 'badge-negativo'}`}>{u.activo ? 'Sí' : 'No'}</span></td>
                <FilaAcciones
                  onEditar={() => { setForm({ nombre: u.nombre, email: u.email, password: '', rol: u.rol, activo: u.activo }); setEditId(u.id_usuario); setMostrarForm(true) }}
                  onEliminar={async () => { if (!confirm('¿Eliminar usuario?')) return; await adminEliminarUsuario(u.id_usuario); cargar() }} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}