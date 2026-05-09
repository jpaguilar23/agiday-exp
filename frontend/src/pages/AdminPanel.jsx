// ============================================================
//  pages/AdminPanel.jsx — Panel administrativo completo
//  CRUD para todas las tablas del sistema
// ============================================================

import { useEffect, useState } from 'react'
import {
  adminGetVehiculos, adminCrearVehiculo, adminEditarVehiculo, adminEliminarVehiculo,
  adminGetConductores, adminCrearConductor, adminEditarConductor, adminEliminarConductor,
  adminGetTours, adminCrearTour, adminEditarTour, adminEliminarTour,
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
// SECCIÓN TOURS
// ============================================================
function SeccionTours() {
  const [datos, setDatos]   = useState({ tours: [], configuraciones: [] })
  const [form, setForm]     = useState({ nombre_tour: '', distancia_km: '', activo: true })
  const [editId, setEditId] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  const cargar = () => adminGetTours().then(r => setDatos(r.data))
  useEffect(() => { cargar() }, [])

  const guardar = async () => {
    const payload = { ...form, distancia_km: parseFloat(form.distancia_km) }
    if (editId) await adminEditarTour(editId, payload)
    else        await adminCrearTour(payload)
    setForm({ nombre_tour: '', distancia_km: '', activo: true }); setEditId(null); setMostrarForm(false); cargar()
  }

  return (
    <div className="card fade-up">
      <div className="card-header">
        <div className="card-titulo">Tours</div>
        <button className="btn btn-primary" onClick={() => { setForm({ nombre_tour: '', distancia_km: '', activo: true }); setEditId(null); setMostrarForm(true) }}>+ Agregar</button>
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
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={guardar}>{editId ? '💾 Guardar' : '+ Crear'}</button>
            <button className="btn btn-outline" onClick={() => setMostrarForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="tabla-wrapper">
        <table>
          <thead><tr><th>Tour</th><th>Distancia</th><th>Activo</th><th></th></tr></thead>
          <tbody>
            {datos.tours.map(t => (
              <tr key={t.id_tour}>
                <td>{t.nombre_tour}</td>
                <td>{t.distancia_km} km</td>
                <td><span className={`badge ${t.activo ? 'badge-positivo' : 'badge-negativo'}`}>{t.activo ? 'Sí' : 'No'}</span></td>
                <FilaAcciones
                  onEditar={() => { setForm({ nombre_tour: t.nombre_tour, distancia_km: t.distancia_km, activo: t.activo }); setEditId(t.id_tour); setMostrarForm(true) }}
                  onEliminar={async () => { if (!confirm('¿Eliminar tour?')) return; await adminEliminarTour(t.id_tour); cargar() }} />
              </tr>
            ))}
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