# ============================================================
#  routers/registro.py — v4
#  Cambios vs v3:
#    - GET /catalogos/tours incluye tiene_degustacion
#    - GET /catalogos/config/:id_tour — id_config dinámico
#    - POST / recibe costo_combustible_real opcional (0 = usar estimado)
# ============================================================

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel, model_validator
from typing import Optional, List

from database import get_db
from services.calculos import calcular_costos_viaje, calcular_ingresos_por_plataforma
from routers.auth import require_auth

router = APIRouter(prefix="/registro", tags=["Registro"])


# ── Schemas ──────────────────────────────────────────────────
class PlataformaDetalle(BaseModel):
    id_plataforma: int
    cantidad_pax:  int
    pax_con_deg:   int = 0
    pax_sin_deg:   int = 0

    @model_validator(mode='after')
    def validar_pax(self):
        if self.pax_con_deg + self.pax_sin_deg != self.cantidad_pax:
            raise ValueError("pax_con_deg + pax_sin_deg debe ser igual a cantidad_pax")
        return self


class RegistroCreate(BaseModel):
    fecha:                  str
    id_tour:                int
    id_vehiculo:            int
    id_conductor:           int
    id_config:              int
    plataformas:            List[PlataformaDetalle]
    costo_combustible_real: float = 0.0   # 0 = usar estimado de costos_vehiculo_tour
    km_adicionales:         float = 0.0
    notas:                  Optional[str] = None

    @model_validator(mode='after')
    def validar_plataformas(self):
        total = sum(p.cantidad_pax for p in self.plataformas)
        if total == 0:
            raise ValueError("Debe haber al menos 1 pasajero en alguna plataforma")
        return self


# ── CATÁLOGOS ────────────────────────────────────────────────

@router.get("/catalogos/tours")
def get_tours(db: Session = Depends(get_db)):
    resultado = db.execute(text("""
        SELECT id_tour, nombre_tour, distancia_km, activo, tiene_degustacion
        FROM tours
        WHERE activo = TRUE
        ORDER BY nombre_tour
    """)).mappings().all()
    return [dict(r) for r in resultado]


@router.get("/catalogos/config/{id_tour}")
def get_config_tour(id_tour: int, db: Session = Depends(get_db)):
    """
    Devuelve el id_config vigente para un tour.
    El frontend lo llama cuando el usuario selecciona un tour
    para no tener el id_config hardcodeado.
    """
    config = db.execute(text("""
        SELECT id_config, costo_degustacion, costo_agua_entradas,
               parking_fijo, lavacar_fijo, viaticos_fijo,
               tickets_por_persona, peajes
        FROM configuracion_tour
        WHERE id_tour = :id_tour
          AND vigente_hasta IS NULL
        ORDER BY vigente_desde DESC
        LIMIT 1
    """), {"id_tour": id_tour}).mappings().first()

    if not config:
        raise HTTPException(
            status_code=404,
            detail=f"No hay configuración vigente para el tour {id_tour}"
        )
    return dict(config)


@router.get("/catalogos/vehiculos")
def get_vehiculos(db: Session = Depends(get_db)):
    resultado = db.execute(text("""
        SELECT id_vehiculo, nombre_vehiculo, capacidad_max, activo
        FROM vehiculos
        WHERE activo = TRUE
        ORDER BY nombre_vehiculo
    """)).mappings().all()
    return [dict(r) for r in resultado]


@router.get("/catalogos/conductores")
def get_conductores(db: Session = Depends(get_db)):
    resultado = db.execute(text("""
        SELECT id_conductor, nombre, activo
        FROM conductores
        WHERE activo = TRUE
        ORDER BY nombre
    """)).mappings().all()
    return [dict(r) for r in resultado]


@router.get("/catalogos/plataformas")
def get_plataformas(db: Session = Depends(get_db)):
    resultado = db.execute(text("""
        SELECT id_plataforma, nombre, activa
        FROM plataformas
        WHERE activa = TRUE
        ORDER BY nombre
    """)).mappings().all()
    return [dict(r) for r in resultado]


@router.get("/catalogos/combustible/{id_tour}/{id_vehiculo}")
def get_combustible_estimado(id_tour: int, id_vehiculo: int, db: Session = Depends(get_db)):
    """
    Devuelve el combustible estimado para un tour + vehículo.
    El formulario lo muestra como referencia al usuario.
    """
    row = db.execute(text("""
        SELECT costo_combustible
        FROM costos_vehiculo_tour
        WHERE id_tour     = :id_tour
          AND id_vehiculo = :id_vehiculo
          AND vigente_hasta IS NULL
        LIMIT 1
    """), {"id_tour": id_tour, "id_vehiculo": id_vehiculo}).mappings().first()

    return {"costo_combustible_estimado": float(row["costo_combustible"]) if row else 0.0}


# ── POST /registro ───────────────────────────────────────────
@router.post("/")
def crear_registro(datos: RegistroCreate, usuario=Depends(require_auth), db: Session = Depends(get_db)):
    try:
        # 1. Tour — tiene degustación?
        tour = db.execute(text("""
            SELECT tiene_degustacion FROM tours WHERE id_tour = :id
        """), {"id": datos.id_tour}).mappings().first()

        if not tour:
            raise ValueError(f"Tour {datos.id_tour} no encontrado")

        tiene_deg = tour["tiene_degustacion"]

        # 2. Totales de pasajeros
        total_pax     = sum(p.cantidad_pax for p in datos.plataformas)
        total_con_deg = sum(p.pax_con_deg  for p in datos.plataformas) if tiene_deg else 0
        total_sin_deg = total_pax - total_con_deg

        # 3. Ingresos por plataforma
        plataformas_list = [p.model_dump() for p in datos.plataformas]
        detalle_plat, ing_bruto, comision, ing_neto = calcular_ingresos_por_plataforma(
            db, datos.id_tour, tiene_deg, plataformas_list
        )

        # 4. Costos operativos
        costos = calcular_costos_viaje(
            db=db,
            id_vehiculo=datos.id_vehiculo,
            id_conductor=datos.id_conductor,
            id_config=datos.id_config,
            id_tour=datos.id_tour,
            cantidad_pasajeros=total_pax,
            pasajeros_con_deg=total_con_deg,
            pasajeros_sin_deg=total_sin_deg,
            costo_combustible_real=datos.costo_combustible_real,
            km_adicionales=datos.km_adicionales,
            tiene_degustacion=tiene_deg,
        )

        # 5. INSERT registro
        result = db.execute(text("""
            INSERT INTO registro (
                fecha, id_tour, id_vehiculo, id_conductor,
                id_plataforma, id_config,
                cantidad_pasajeros, pasajeros_con_deg, pasajeros_sin_deg,
                ingreso_bruto_con_deg, ingreso_bruto_sin_deg, comision_plataforma,
                costo_vehiculo_viaje, costo_combustible, costo_conductor,
                costo_parking, costo_lavacar, costo_viaticos,
                costo_km_adicionales, km_adicionales,
                costo_agua_entradas, costo_degustacion,
                costo_combustible_real,
                total_costos_fijos, total_costos_variables, notas
            ) VALUES (
                :fecha, :id_tour, :id_vehiculo, :id_conductor,
                NULL, :id_config,
                :total_pax, :total_con_deg, :total_sin_deg,
                :ing_bruto, 0, :comision,
                :costo_vehiculo_viaje, :costo_combustible_real, :costo_conductor,
                :costo_parking, :costo_lavacar, :costo_viaticos,
                :costo_km_adicionales, :km_adicionales,
                :costo_agua_entradas, :costo_degustacion,
                :costo_combustible_real,
                :total_costos_fijos, :total_costos_variables, :notas
            ) RETURNING id_operacion
        """), {
            "fecha":       datos.fecha,
            "id_tour":     datos.id_tour,
            "id_vehiculo": datos.id_vehiculo,
            "id_conductor":datos.id_conductor,
            "id_config":   datos.id_config,
            "total_pax":   total_pax,
            "total_con_deg": total_con_deg,
            "total_sin_deg": total_sin_deg,
            "ing_bruto":   ing_bruto,
            "comision":    comision,
            "notas":       datos.notas,
            **costos
        })

        id_operacion = result.mappings().first()["id_operacion"]

        # 6. INSERT registro_plataformas
        for p in detalle_plat:
            db.execute(text("""
                INSERT INTO registro_plataformas
                    (id_operacion, id_plataforma, cantidad_pax,
                     pax_con_deg, pax_sin_deg, ingreso_bruto, comision)
                VALUES
                    (:id_op, :id_plat, :pax, :con_deg, :sin_deg, :bruto, :comision)
            """), {
                "id_op":    id_operacion,
                "id_plat":  p["id_plataforma"],
                "pax":      p["cantidad_pax"],
                "con_deg":  p["pax_con_deg"],
                "sin_deg":  p["pax_sin_deg"],
                "bruto":    p["ingreso_bruto"],
                "comision": p["comision"],
            })

        db.commit()

        return {
            "id_operacion":        id_operacion,
            "total_pasajeros":     total_pax,
            "ingreso_bruto":       ing_bruto,
            "comision":            comision,
            "ingreso_neto":        ing_neto,
            "total_gastos":        costos["total_costos_fijos"] + costos["total_costos_variables"],
            "balance":             round(ing_neto - costos["total_costos_fijos"] - costos["total_costos_variables"], 2),
            "costo_combustible":   costos["costo_combustible"],
            "costo_tickets":       costos["costo_tickets"],
            "costo_peajes":        costos["costo_peajes"],
            "detalle_plataformas": detalle_plat,
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ── GET /registro ────────────────────────────────────────────
@router.get("/")
def listar_registros(
    fecha_desde: str = None,
    fecha_hasta: str = None,
    id_tour:     int = None,
    id_vehiculo: int = None,
    db: Session = Depends(get_db)
):
    filtros = "WHERE 1=1"
    params  = {}

    if fecha_desde:
        filtros += " AND r.fecha >= :fecha_desde"
        params["fecha_desde"] = fecha_desde
    if fecha_hasta:
        filtros += " AND r.fecha <= :fecha_hasta"
        params["fecha_hasta"] = fecha_hasta
    if id_tour:
        filtros += " AND r.id_tour = :id_tour"
        params["id_tour"] = id_tour
    if id_vehiculo:
        filtros += " AND r.id_vehiculo = :id_vehiculo"
        params["id_vehiculo"] = id_vehiculo

    rows = db.execute(text(f"""
        SELECT
            r.*,
            t.nombre_tour,
            v.nombre_vehiculo,
            c.nombre AS conductor,
            COALESCE(rp.ingreso_neto_total, 0) AS ingreso_neto_real,
            COALESCE(rp.plataformas_texto, 'Sin plataforma') AS plataformas_texto,
            COALESCE(rp.plataformas_json, '[]'::json) AS plataformas_detalle
        FROM registro r
        JOIN tours       t  ON t.id_tour      = r.id_tour
        JOIN vehiculos   v  ON v.id_vehiculo  = r.id_vehiculo
        JOIN conductores c  ON c.id_conductor = r.id_conductor
        LEFT JOIN (
            SELECT
                rp.id_operacion,
                SUM(rp.ingreso_neto) AS ingreso_neto_total,
                STRING_AGG(p.nombre || ' (' || rp.cantidad_pax || ')', ', ' ORDER BY p.nombre) AS plataformas_texto,
                JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'id_plataforma', p.id_plataforma,
                        'nombre',        p.nombre,
                        'cantidad_pax',  rp.cantidad_pax,
                        'pax_con_deg',   rp.pax_con_deg,
                        'pax_sin_deg',   rp.pax_sin_deg,
                        'ingreso_bruto', rp.ingreso_bruto,
                        'comision',      rp.comision
                    ) ORDER BY p.nombre
                ) AS plataformas_json
            FROM registro_plataformas rp
            JOIN plataformas p ON p.id_plataforma = rp.id_plataforma
            GROUP BY rp.id_operacion
        ) rp ON rp.id_operacion = r.id_operacion
        {filtros}
        ORDER BY r.fecha DESC
    """), params)

    return [dict(row) for row in rows.mappings()]


# ── GET /registro/{id} ───────────────────────────────────────
@router.get("/{id_operacion}")
def obtener_registro(id_operacion: int, db: Session = Depends(get_db)):
    registro = db.execute(text("""
        SELECT r.*, t.nombre_tour, v.nombre_vehiculo, c.nombre AS conductor
        FROM registro r
        JOIN tours       t ON t.id_tour      = r.id_tour
        JOIN vehiculos   v ON v.id_vehiculo  = r.id_vehiculo
        JOIN conductores c ON c.id_conductor = r.id_conductor
        WHERE r.id_operacion = :id
    """), {"id": id_operacion}).mappings().first()

    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    plataformas = db.execute(text("""
        SELECT rp.*, p.nombre AS plataforma
        FROM registro_plataformas rp
        JOIN plataformas p ON p.id_plataforma = rp.id_plataforma
        WHERE rp.id_operacion = :id
    """), {"id": id_operacion}).mappings().all()

    return {**dict(registro), "plataformas": [dict(p) for p in plataformas]}


# ── DELETE /registro/{id} ────────────────────────────────────
@router.delete("/{id_operacion}")
def eliminar_registro(id_operacion: int, db: Session = Depends(get_db)):
    result = db.execute(text("""
        DELETE FROM registro WHERE id_operacion = :id RETURNING id_operacion
    """), {"id": id_operacion}).mappings().first()

    if not result:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    db.commit()
    return {"mensaje": f"Registro {id_operacion} eliminado correctamente"}


# ── GET /registro/catalogos/plataformas/{id_tour} ────────────
@router.get("/catalogos/plataformas/{id_tour}")
def get_plataformas_por_tour(id_tour: int, db: Session = Depends(get_db)):
    """
    Devuelve solo las plataformas que tienen tarifa configurada
    para el tour seleccionado. Evita errores al registrar.
    """
    resultado = db.execute(text("""
        SELECT p.id_plataforma, p.nombre, p.activa
        FROM plataformas p
        INNER JOIN tarifas_tour_plataforma ttp
            ON ttp.id_plataforma = p.id_plataforma
           AND ttp.id_tour       = :id_tour
           AND ttp.vigente_hasta IS NULL
        WHERE p.activa = TRUE
        ORDER BY p.nombre
    """), {"id_tour": id_tour}).mappings().all()
    return [dict(r) for r in resultado]