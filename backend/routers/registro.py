# ============================================================
#  routers/registro.py — Endpoints de operaciones/viajes
# ============================================================

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from database import get_db
from models import RegistroCreate, RegistroResponse
from services.calculos import calcular_costos_viaje

router = APIRouter(prefix="/registro", tags=["Registro"])


# ── POST /registro — Crear un nuevo viaje ───────────────────
@router.post("/", response_model=RegistroResponse)
def crear_registro(datos: RegistroCreate, db: Session = Depends(get_db)):
    """
    Registra un nuevo viaje. El frontend manda los datos crudos
    (pasajeros, vehículo, conductor, etc.) y este endpoint
    calcula todos los costos antes de insertar.
    """
    try:
        # 1. Calcular todos los costos
        costos = calcular_costos_viaje(
            db=db,
            id_vehiculo=datos.id_vehiculo,
            id_conductor=datos.id_conductor,
            id_config=datos.id_config,
            cantidad_pasajeros=datos.cantidad_pasajeros,
            pasajeros_con_deg=datos.pasajeros_con_deg,
            pasajeros_sin_deg=datos.pasajeros_sin_deg,
            km_adicionales=datos.km_adicionales
        )

        # 2. Insertar en la BD con todos los valores calculados
        resultado = db.execute(text("""
            INSERT INTO registro (
                fecha, id_tour, id_vehiculo, id_conductor,
                id_plataforma, id_config,
                cantidad_pasajeros, pasajeros_con_deg, pasajeros_sin_deg,
                ingreso_bruto_con_deg, ingreso_bruto_sin_deg,
                comision_plataforma,
                costo_vehiculo_viaje, costo_combustible, costo_conductor,
                costo_parking, costo_lavacar, costo_viaticos,
                costo_km_adicionales, km_adicionales,
                costo_agua_entradas, costo_degustacion,
                total_costos_fijos, total_costos_variables,
                notas
            ) VALUES (
                :fecha, :id_tour, :id_vehiculo, :id_conductor,
                :id_plataforma, :id_config,
                :cantidad_pasajeros, :pasajeros_con_deg, :pasajeros_sin_deg,
                :ingreso_bruto_con_deg, :ingreso_bruto_sin_deg,
                :comision_plataforma,
                :costo_vehiculo_viaje, :costo_combustible, :costo_conductor,
                :costo_parking, :costo_lavacar, :costo_viaticos,
                :costo_km_adicionales, :km_adicionales,
                :costo_agua_entradas, :costo_degustacion,
                :total_costos_fijos, :total_costos_variables,
                :notas
            )
            RETURNING *
        """), {
            "fecha":                  datos.fecha,
            "id_tour":                datos.id_tour,
            "id_vehiculo":            datos.id_vehiculo,
            "id_conductor":           datos.id_conductor,
            "id_plataforma":          datos.id_plataforma,
            "id_config":              datos.id_config,
            "cantidad_pasajeros":     datos.cantidad_pasajeros,
            "pasajeros_con_deg":      datos.pasajeros_con_deg,
            "pasajeros_sin_deg":      datos.pasajeros_sin_deg,
            "notas":                  datos.notas,
            **costos   # desempaqueta todos los costos calculados
        })

        db.commit()
        fila = resultado.mappings().first()
        return dict(fila)

    except ValueError as e:
        # Error de validación de negocio (ej: capacidad excedida)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ── GET /registro — Listar viajes con filtros ───────────────
@router.get("/")
def listar_registros(
    fecha_desde: str = None,
    fecha_hasta: str = None,
    id_tour: int = None,
    id_vehiculo: int = None,
    db: Session = Depends(get_db)
):
    filtros = "WHERE 1=1"
    params = {}

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

    resultado = db.execute(text(f"""
        SELECT
            r.*,
            t.nombre_tour,
            v.nombre_vehiculo,
            c.nombre AS conductor,
            p.nombre AS plataforma
        FROM registro r
        JOIN tours      t ON t.id_tour       = r.id_tour
        JOIN vehiculos  v ON v.id_vehiculo   = r.id_vehiculo
        JOIN conductores c ON c.id_conductor = r.id_conductor
        LEFT JOIN plataformas p ON p.id_plataforma = r.id_plataforma
        {filtros}
        ORDER BY r.fecha DESC
    """), params)

    return [dict(row) for row in resultado.mappings()]


# ── GET /registro/{id} — Obtener un viaje por ID ────────────
@router.get("/{id_operacion}")
def obtener_registro(id_operacion: int, db: Session = Depends(get_db)):
    resultado = db.execute(text("""
        SELECT r.*, t.nombre_tour, v.nombre_vehiculo,
               c.nombre AS conductor, p.nombre AS plataforma
        FROM registro r
        JOIN tours      t ON t.id_tour       = r.id_tour
        JOIN vehiculos  v ON v.id_vehiculo   = r.id_vehiculo
        JOIN conductores c ON c.id_conductor = r.id_conductor
        LEFT JOIN plataformas p ON p.id_plataforma = r.id_plataforma
        WHERE r.id_operacion = :id
    """), {"id": id_operacion}).mappings().first()

    if not resultado:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    return dict(resultado)


# ── DELETE /registro/{id} — Eliminar un viaje ───────────────
@router.delete("/{id_operacion}")
def eliminar_registro(id_operacion: int, db: Session = Depends(get_db)):
    resultado = db.execute(text("""
        DELETE FROM registro WHERE id_operacion = :id RETURNING id_operacion
    """), {"id": id_operacion}).mappings().first()

    if not resultado:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    db.commit()
    return {"mensaje": f"Registro {id_operacion} eliminado correctamente"}