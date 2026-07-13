# ============================================================
#  routers/admin.py — CRUD administrativo para todas las tablas
#  Todas las rutas requieren rol 'admin'
# ============================================================

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from passlib.context import CryptContext

from database import get_db
from routers.auth import require_admin

router = APIRouter(prefix="/admin", tags=["Admin"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ============================================================
# VEHÍCULOS
# ============================================================
class VehiculoIn(BaseModel):
    nombre_vehiculo:       str
    capacidad_max:         int
    combustible_por_viaje: float
    alquiler_mensual:      float
    km_mensual_contrato:   Optional[float] = None
    costo_km_extra:        Optional[float] = None
    alquiler_diario:       Optional[float] = None
    activo:                bool = True

@router.get("/vehiculos")
def listar_vehiculos(db: Session = Depends(get_db), _=Depends(require_admin)):
    return [dict(r) for r in db.execute(text("SELECT * FROM vehiculos ORDER BY id_vehiculo")).mappings()]

@router.post("/vehiculos")
def crear_vehiculo(data: VehiculoIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    r = db.execute(text("""
        INSERT INTO vehiculos (nombre_vehiculo, capacidad_max, combustible_por_viaje,
            alquiler_mensual, km_mensual_contrato, costo_km_extra, alquiler_diario, activo)
        VALUES (:nombre_vehiculo, :capacidad_max, :combustible_por_viaje,
            :alquiler_mensual, :km_mensual_contrato, :costo_km_extra, :alquiler_diario, :activo)
        RETURNING *
    """), data.model_dump())
    db.commit()
    return dict(r.mappings().first())

@router.put("/vehiculos/{id}")
def editar_vehiculo(id: int, data: VehiculoIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    r = db.execute(text("""
        UPDATE vehiculos SET nombre_vehiculo=:nombre_vehiculo, capacidad_max=:capacidad_max,
            combustible_por_viaje=:combustible_por_viaje, alquiler_mensual=:alquiler_mensual,
            km_mensual_contrato=:km_mensual_contrato, costo_km_extra=:costo_km_extra,
            alquiler_diario=:alquiler_diario, activo=:activo
        WHERE id_vehiculo=:id RETURNING *
    """), {**data.model_dump(), "id": id})
    db.commit()
    if not r.rowcount:
        raise HTTPException(404, "Vehículo no encontrado")
    return dict(r.mappings().first())

@router.delete("/vehiculos/{id}")
def eliminar_vehiculo(id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    r = db.execute(text("DELETE FROM vehiculos WHERE id_vehiculo=:id RETURNING id_vehiculo"), {"id": id})
    db.commit()
    if not r.rowcount:
        raise HTTPException(404, "Vehículo no encontrado")
    return {"mensaje": "Vehículo eliminado"}


# ============================================================
# CONDUCTORES
# ============================================================
class ConductorIn(BaseModel):
    nombre: str
    activo: bool = True

class HonorarioIn(BaseModel):
    id_conductor:  int
    pasajeros_min: int
    pasajeros_max: int
    honorario:     float

@router.get("/conductores")
def listar_conductores(db: Session = Depends(get_db), _=Depends(require_admin)):
    conductores = [dict(r) for r in db.execute(text("SELECT * FROM conductores ORDER BY id_conductor")).mappings()]
    honorarios  = [dict(r) for r in db.execute(text("SELECT * FROM honorarios_conductor ORDER BY id_conductor, pasajeros_min")).mappings()]
    return {"conductores": conductores, "honorarios": honorarios}

@router.post("/conductores")
def crear_conductor(data: ConductorIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    r = db.execute(text("""
        INSERT INTO conductores (nombre, activo) VALUES (:nombre, :activo) RETURNING *
    """), data.model_dump())
    db.commit()
    return dict(r.mappings().first())

@router.put("/conductores/{id}")
def editar_conductor(id: int, data: ConductorIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    r = db.execute(text("""
        UPDATE conductores SET nombre=:nombre, activo=:activo
        WHERE id_conductor=:id RETURNING *
    """), {**data.model_dump(), "id": id})
    db.commit()
    if not r.rowcount:
        raise HTTPException(404, "Conductor no encontrado")
    return dict(r.mappings().first())

@router.delete("/conductores/{id}")
def eliminar_conductor(id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    r = db.execute(text("DELETE FROM conductores WHERE id_conductor=:id RETURNING id_conductor"), {"id": id})
    db.commit()
    if not r.rowcount:
        raise HTTPException(404, "Conductor no encontrado")
    return {"mensaje": "Conductor eliminado"}

@router.post("/honorarios")
def crear_honorario(data: HonorarioIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    r = db.execute(text("""
        INSERT INTO honorarios_conductor (id_conductor, pasajeros_min, pasajeros_max, honorario)
        VALUES (:id_conductor, :pasajeros_min, :pasajeros_max, :honorario) RETURNING *
    """), data.model_dump())
    db.commit()
    return dict(r.mappings().first())

@router.delete("/honorarios/{id}")
def eliminar_honorario(id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    db.execute(text("DELETE FROM honorarios_conductor WHERE id_honorario=:id"), {"id": id})
    db.commit()
    return {"mensaje": "Honorario eliminado"}


# ============================================================
# TOURS Y CONFIGURACIÓN
# ============================================================
class TourIn(BaseModel):
    nombre_tour:       str
    distancia_km:      float
    activo:            bool = True
    tiene_degustacion: bool = False

class ConfigTourIn(BaseModel):
    id_tour:              int
    vigente_desde:        str
    vigente_hasta:        Optional[str] = None
    costo_degustacion:    float = 0.0
    costo_agua_entradas:  float = 0.0
    parking_fijo:         float = 0.0
    lavacar_fijo:         float = 0.0
    viaticos_fijo:        float = 0.0
    tickets_por_persona:  float = 0.0
    peajes:               float = 0.0

@router.get("/tours")
def listar_tours(db: Session = Depends(get_db), _=Depends(require_admin)):
    tours   = [dict(r) for r in db.execute(text("SELECT * FROM tours ORDER BY id_tour")).mappings()]
    configs = [dict(r) for r in db.execute(text("SELECT * FROM configuracion_tour ORDER BY id_tour, vigente_desde DESC")).mappings()]
    return {"tours": tours, "configuraciones": configs}

@router.post("/tours")
def crear_tour(data: TourIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    r = db.execute(text("""
        INSERT INTO tours (nombre_tour, distancia_km, activo, tiene_degustacion)
        VALUES (:nombre_tour, :distancia_km, :activo, :tiene_degustacion) RETURNING *
    """), data.model_dump())
    db.commit()
    return dict(r.mappings().first())

@router.put("/tours/{id}")
def editar_tour(id: int, data: TourIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    r = db.execute(text("""
        UPDATE tours SET nombre_tour=:nombre_tour, distancia_km=:distancia_km,
            activo=:activo, tiene_degustacion=:tiene_degustacion
        WHERE id_tour=:id RETURNING *
    """), {**data.model_dump(), "id": id})
    db.commit()
    if not r.rowcount:
        raise HTTPException(404, "Tour no encontrado")
    return dict(r.mappings().first())

@router.delete("/tours/{id}")
def eliminar_tour(id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    db.execute(text("DELETE FROM tours WHERE id_tour=:id"), {"id": id})
    db.commit()
    return {"mensaje": "Tour eliminado"}

@router.post("/config-tour")
def crear_config(data: ConfigTourIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    r = db.execute(text("""
        INSERT INTO configuracion_tour (id_tour, vigente_desde, vigente_hasta,
            costo_degustacion, costo_agua_entradas, parking_fijo, lavacar_fijo,
            viaticos_fijo, tickets_por_persona, peajes)
        VALUES (:id_tour, :vigente_desde, :vigente_hasta, :costo_degustacion,
            :costo_agua_entradas, :parking_fijo, :lavacar_fijo, :viaticos_fijo,
            :tickets_por_persona, :peajes) RETURNING *
    """), data.model_dump())
    db.commit()
    return dict(r.mappings().first())

@router.put("/config-tour/{id}")
def editar_config(id: int, data: ConfigTourIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    r = db.execute(text("""
        UPDATE configuracion_tour SET id_tour=:id_tour, vigente_desde=:vigente_desde,
            vigente_hasta=:vigente_hasta, costo_degustacion=:costo_degustacion,
            costo_agua_entradas=:costo_agua_entradas, parking_fijo=:parking_fijo,
            lavacar_fijo=:lavacar_fijo, viaticos_fijo=:viaticos_fijo,
            tickets_por_persona=:tickets_por_persona, peajes=:peajes
        WHERE id_config=:id RETURNING *
    """), {**data.model_dump(), "id": id})
    db.commit()
    if not r.rowcount:
        raise HTTPException(404, "Configuración no encontrada")
    return dict(r.mappings().first())

@router.delete("/config-tour/{id}")
def eliminar_config(id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    db.execute(text("DELETE FROM configuracion_tour WHERE id_config=:id"), {"id": id})
    db.commit()
    return {"mensaje": "Configuración eliminada"}


# ============================================================
# COSTOS VEHÍCULO + TOUR (combustible estimado)
# ============================================================
class CostoVehiculoTourIn(BaseModel):
    id_tour:           int
    id_vehiculo:       int
    costo_combustible: float
    vigente_desde:     str
    vigente_hasta:     Optional[str] = None

@router.get("/costos-vehiculo-tour")
def listar_costos_vehiculo_tour(db: Session = Depends(get_db), _=Depends(require_admin)):
    return [dict(r) for r in db.execute(text("""
        SELECT cvt.*, t.nombre_tour, v.nombre_vehiculo
        FROM costos_vehiculo_tour cvt
        JOIN tours     t ON t.id_tour     = cvt.id_tour
        JOIN vehiculos v ON v.id_vehiculo = cvt.id_vehiculo
        ORDER BY t.nombre_tour, v.nombre_vehiculo
    """)).mappings()]

@router.get("/costos-vehiculo-tour/tour/{id_tour}")
def costos_por_tour(id_tour: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    """Devuelve el combustible estimado de cada vehículo para un tour específico."""
    return [dict(r) for r in db.execute(text("""
        SELECT cvt.*, v.nombre_vehiculo, v.capacidad_max
        FROM costos_vehiculo_tour cvt
        JOIN vehiculos v ON v.id_vehiculo = cvt.id_vehiculo
        WHERE cvt.id_tour = :id_tour AND cvt.vigente_hasta IS NULL
        ORDER BY v.nombre_vehiculo
    """), {"id_tour": id_tour}).mappings()]

@router.post("/costos-vehiculo-tour")
def crear_costo_vehiculo_tour(data: CostoVehiculoTourIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    r = db.execute(text("""
        INSERT INTO costos_vehiculo_tour
            (id_tour, id_vehiculo, costo_combustible, vigente_desde, vigente_hasta)
        VALUES
            (:id_tour, :id_vehiculo, :costo_combustible, :vigente_desde, :vigente_hasta)
        ON CONFLICT (id_tour, id_vehiculo, vigente_desde)
        DO UPDATE SET costo_combustible = EXCLUDED.costo_combustible
        RETURNING *
    """), data.model_dump())
    db.commit()
    return dict(r.mappings().first())

@router.put("/costos-vehiculo-tour/{id}")
def editar_costo_vehiculo_tour(id: int, data: CostoVehiculoTourIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    r = db.execute(text("""
        UPDATE costos_vehiculo_tour SET
            id_tour=:id_tour, id_vehiculo=:id_vehiculo,
            costo_combustible=:costo_combustible,
            vigente_desde=:vigente_desde, vigente_hasta=:vigente_hasta
        WHERE id=:id RETURNING *
    """), {**data.model_dump(), "id": id})
    db.commit()
    if not r.rowcount:
        raise HTTPException(404, "Costo no encontrado")
    return dict(r.mappings().first())

@router.delete("/costos-vehiculo-tour/{id}")
def eliminar_costo_vehiculo_tour(id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    db.execute(text("DELETE FROM costos_vehiculo_tour WHERE id=:id"), {"id": id})
    db.commit()
    return {"mensaje": "Costo eliminado"}


# ============================================================
# PLATAFORMAS
# ============================================================
class PlataformaIn(BaseModel):
    nombre:     str
    es_gestora: bool = False
    activa:     bool = True

@router.get("/plataformas")
def listar_plataformas(db: Session = Depends(get_db), _=Depends(require_admin)):
    return [dict(r) for r in db.execute(text("SELECT * FROM plataformas ORDER BY id_plataforma")).mappings()]

@router.post("/plataformas")
def crear_plataforma(data: PlataformaIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    r = db.execute(text("""
        INSERT INTO plataformas (nombre, es_gestora, activa)
        VALUES (:nombre, :es_gestora, :activa) RETURNING *
    """), data.model_dump())
    db.commit()
    return dict(r.mappings().first())

@router.put("/plataformas/{id}")
def editar_plataforma(id: int, data: PlataformaIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    r = db.execute(text("""
        UPDATE plataformas SET nombre=:nombre, es_gestora=:es_gestora, activa=:activa
        WHERE id_plataforma=:id RETURNING *
    """), {**data.model_dump(), "id": id})
    db.commit()
    if not r.rowcount:
        raise HTTPException(404, "Plataforma no encontrada")
    return dict(r.mappings().first())

@router.delete("/plataformas/{id}")
def eliminar_plataforma(id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    db.execute(text("DELETE FROM plataformas WHERE id_plataforma=:id"), {"id": id})
    db.commit()
    return {"mensaje": "Plataforma eliminada"}


# ============================================================
# COSTOS FIJOS
# ============================================================
class CostoFijoIn(BaseModel):
    concepto:      str
    monto_mensual: float
    activo:        bool = True

@router.get("/costos-fijos")
def listar_costos(db: Session = Depends(get_db), _=Depends(require_admin)):
    return [dict(r) for r in db.execute(text("SELECT * FROM costos_fijos_agencia ORDER BY id_costo_fijo")).mappings()]

@router.post("/costos-fijos")
def crear_costo(data: CostoFijoIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    r = db.execute(text("""
        INSERT INTO costos_fijos_agencia (concepto, monto_mensual, activo)
        VALUES (:concepto, :monto_mensual, :activo) RETURNING *
    """), data.model_dump())
    db.commit()
    return dict(r.mappings().first())

@router.put("/costos-fijos/{id}")
def editar_costo(id: int, data: CostoFijoIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    r = db.execute(text("""
        UPDATE costos_fijos_agencia SET concepto=:concepto, monto_mensual=:monto_mensual, activo=:activo
        WHERE id_costo_fijo=:id RETURNING *
    """), {**data.model_dump(), "id": id})
    db.commit()
    if not r.rowcount:
        raise HTTPException(404, "Costo fijo no encontrado")
    return dict(r.mappings().first())

@router.delete("/costos-fijos/{id}")
def eliminar_costo(id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    db.execute(text("DELETE FROM costos_fijos_agencia WHERE id_costo_fijo=:id"), {"id": id})
    db.commit()
    return {"mensaje": "Costo fijo eliminado"}


# ============================================================
# EDITAR REGISTRO (viajes)
# ============================================================
class RegistroEditIn(BaseModel):
    fecha:              str
    id_tour:            int
    id_vehiculo:        int
    id_conductor:       int
    id_plataforma:      Optional[int] = None
    cantidad_pasajeros: int
    pasajeros_con_deg:  int
    pasajeros_sin_deg:  int
    notas:              Optional[str] = None

@router.put("/registro/{id}")
def editar_registro(id: int, data: RegistroEditIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    # Obtener config vigente para recalcular costos
    from services.calculos import calcular_costos_viaje
    config = db.execute(text("""
        SELECT id_config FROM configuracion_tour
        WHERE id_tour = :id_tour AND vigente_hasta IS NULL LIMIT 1
    """), {"id_tour": data.id_tour}).mappings().first()

    if not config:
        raise HTTPException(400, "No hay configuración vigente para ese tour")

    costos = calcular_costos_viaje(
        db=db,
        id_vehiculo=data.id_vehiculo,
        id_conductor=data.id_conductor,
        id_config=config["id_config"],
        cantidad_pasajeros=data.cantidad_pasajeros,
        pasajeros_con_deg=data.pasajeros_con_deg,
        pasajeros_sin_deg=data.pasajeros_sin_deg
    )

    r = db.execute(text("""
        UPDATE registro SET
            fecha=:fecha, id_tour=:id_tour, id_vehiculo=:id_vehiculo,
            id_conductor=:id_conductor, id_plataforma=:id_plataforma,
            id_config=:id_config,
            cantidad_pasajeros=:cantidad_pasajeros,
            pasajeros_con_deg=:pasajeros_con_deg,
            pasajeros_sin_deg=:pasajeros_sin_deg,
            ingreso_bruto_con_deg=:ingreso_bruto_con_deg,
            ingreso_bruto_sin_deg=:ingreso_bruto_sin_deg,
            comision_plataforma=:comision_plataforma,
            costo_vehiculo_viaje=:costo_vehiculo_viaje,
            costo_combustible=:costo_combustible,
            costo_conductor=:costo_conductor,
            costo_parking=:costo_parking,
            costo_lavacar=:costo_lavacar,
            costo_viaticos=:costo_viaticos,
            costo_agua_entradas=:costo_agua_entradas,
            costo_degustacion=:costo_degustacion,
            total_costos_fijos=:total_costos_fijos,
            total_costos_variables=:total_costos_variables,
            notas=:notas
        WHERE id_operacion=:id RETURNING *
    """), {
        "fecha": data.fecha, "id_tour": data.id_tour,
        "id_vehiculo": data.id_vehiculo, "id_conductor": data.id_conductor,
        "id_plataforma": data.id_plataforma, "id_config": config["id_config"],
        "cantidad_pasajeros": data.cantidad_pasajeros,
        "pasajeros_con_deg": data.pasajeros_con_deg,
        "pasajeros_sin_deg": data.pasajeros_sin_deg,
        "notas": data.notas, "id": id,
        **costos
    })
    db.commit()
    if not r.rowcount:
        raise HTTPException(404, "Registro no encontrado")
    return dict(r.mappings().first())


# ============================================================
# USUARIOS
# ============================================================
class UsuarioIn(BaseModel):
    nombre:   str
    email:    str
    password: Optional[str] = None
    rol:      str = "usuario"
    activo:   bool = True

@router.get("/usuarios")
def listar_usuarios(db: Session = Depends(get_db), _=Depends(require_admin)):
    return [dict(r) for r in db.execute(text(
        "SELECT id_usuario, nombre, email, rol, activo, created_at FROM usuarios ORDER BY id_usuario"
    )).mappings()]

@router.post("/usuarios")
def crear_usuario(data: UsuarioIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    if not data.password:
        raise HTTPException(400, "La contraseña es requerida")
    hashed = pwd_context.hash(data.password)
    r = db.execute(text("""
        INSERT INTO usuarios (nombre, email, password_hash, rol, activo)
        VALUES (:nombre, :email, :hash, :rol, :activo) RETURNING id_usuario, nombre, email, rol, activo
    """), {"nombre": data.nombre, "email": data.email, "hash": hashed, "rol": data.rol, "activo": data.activo})
    db.commit()
    return dict(r.mappings().first())

@router.put("/usuarios/{id}")
def editar_usuario(id: int, data: UsuarioIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    if data.password:
        hashed = pwd_context.hash(data.password)
        r = db.execute(text("""
            UPDATE usuarios SET nombre=:nombre, email=:email, password_hash=:hash, rol=:rol, activo=:activo
            WHERE id_usuario=:id RETURNING id_usuario, nombre, email, rol, activo
        """), {"nombre": data.nombre, "email": data.email, "hash": hashed, "rol": data.rol, "activo": data.activo, "id": id})
    else:
        r = db.execute(text("""
            UPDATE usuarios SET nombre=:nombre, email=:email, rol=:rol, activo=:activo
            WHERE id_usuario=:id RETURNING id_usuario, nombre, email, rol, activo
        """), {"nombre": data.nombre, "email": data.email, "rol": data.rol, "activo": data.activo, "id": id})
    db.commit()
    if not r.rowcount:
        raise HTTPException(404, "Usuario no encontrado")
    return dict(r.mappings().first())

@router.delete("/usuarios/{id}")
def eliminar_usuario(id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    db.execute(text("DELETE FROM usuarios WHERE id_usuario=:id"), {"id": id})
    db.commit()
    return {"mensaje": "Usuario eliminado"}


# ============================================================
# TARIFAS POR TOUR + PLATAFORMA
# ============================================================
class TarifaIn(BaseModel):
    id_tour:        int
    id_plataforma:  int
    comision_pct:   float
    precio_con_deg: Optional[float] = None
    precio_sin_deg: float
    vigente_desde:  str
    vigente_hasta:  Optional[str] = None
 
@router.get("/tarifas")
def listar_tarifas(db: Session = Depends(get_db), _=Depends(require_admin)):
    return [dict(r) for r in db.execute(text("""
        SELECT ttp.*, t.nombre_tour, p.nombre AS plataforma
        FROM tarifas_tour_plataforma ttp
        JOIN tours       t ON t.id_tour       = ttp.id_tour
        JOIN plataformas p ON p.id_plataforma = ttp.id_plataforma
        ORDER BY t.nombre_tour, p.nombre
    """)).mappings()]
 
@router.get("/tarifas/tour/{id_tour}")
def tarifas_por_tour(id_tour: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    return [dict(r) for r in db.execute(text("""
        SELECT ttp.*, p.nombre AS plataforma
        FROM tarifas_tour_plataforma ttp
        JOIN plataformas p ON p.id_plataforma = ttp.id_plataforma
        WHERE ttp.id_tour = :id_tour
        ORDER BY p.nombre, ttp.vigente_desde DESC
    """), {"id_tour": id_tour}).mappings()]
 
@router.post("/tarifas")
def crear_tarifa(data: TarifaIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    r = db.execute(text("""
        INSERT INTO tarifas_tour_plataforma
            (id_tour, id_plataforma, comision_pct, precio_con_deg,
             precio_sin_deg, vigente_desde, vigente_hasta)
        VALUES
            (:id_tour, :id_plataforma, :comision_pct, :precio_con_deg,
             :precio_sin_deg, :vigente_desde, :vigente_hasta)
        RETURNING *
    """), data.model_dump())
    db.commit()
    return dict(r.mappings().first())
 
@router.put("/tarifas/{id}")
def editar_tarifa(id: int, data: TarifaIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    r = db.execute(text("""
        UPDATE tarifas_tour_plataforma SET
            id_tour=:id_tour, id_plataforma=:id_plataforma,
            comision_pct=:comision_pct, precio_con_deg=:precio_con_deg,
            precio_sin_deg=:precio_sin_deg, vigente_desde=:vigente_desde,
            vigente_hasta=:vigente_hasta
        WHERE id_tarifa=:id RETURNING *
    """), {**data.model_dump(), "id": id})
    db.commit()
    if not r.rowcount:
        raise HTTPException(404, "Tarifa no encontrada")
    return dict(r.mappings().first())
 
@router.delete("/tarifas/{id}")
def eliminar_tarifa(id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    db.execute(text("DELETE FROM tarifas_tour_plataforma WHERE id_tarifa=:id"), {"id": id})
    db.commit()
    return {"mensaje": "Tarifa eliminada"}
 
 
# ── GET tours con info de degustacion ────────────────────────
@router.get("/tours-completo")
def tours_completo(db: Session = Depends(get_db), _=Depends(require_admin)):
    """Devuelve tours con sus tarifas por plataforma — para el formulario de registro"""
    tours = [dict(r) for r in db.execute(text("""
        SELECT id_tour, nombre_tour, distancia_km, activo, tiene_degustacion
        FROM tours WHERE activo = TRUE ORDER BY nombre_tour
    """)).mappings()]
 
    for t in tours:
        tarifas = db.execute(text("""
            SELECT ttp.*, p.nombre AS plataforma
            FROM tarifas_tour_plataforma ttp
            JOIN plataformas p ON p.id_plataforma = ttp.id_plataforma
            WHERE ttp.id_tour = :id AND ttp.vigente_hasta IS NULL
        """), {"id": t["id_tour"]}).mappings().all()
        t["tarifas"] = [dict(r) for r in tarifas]
 
    return tours