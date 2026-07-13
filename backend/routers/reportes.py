# ============================================================
#  routers/reportes.py — Endpoints para gráficos y reportes
#  Sirve los datos de las 4 vistas de PostgreSQL
# ============================================================

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional

from database import get_db

router = APIRouter(prefix="/reportes", tags=["Reportes"])


# ── GET /reportes/balance-diario ────────────────────────────
@router.get("/balance-diario")
def balance_diario(
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    id_tour: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Datos para gráfico de barras de balance diario.
    Equivale a la fila BALANCE DIARIO del Excel.
    """
    filtros = "WHERE 1=1"
    params = {}

    if fecha_desde:
        filtros += " AND fecha >= :fecha_desde"
        params["fecha_desde"] = fecha_desde
    if fecha_hasta:
        filtros += " AND fecha <= :fecha_hasta"
        params["fecha_hasta"] = fecha_hasta
    if id_tour:
        filtros += " AND nombre_tour = (SELECT nombre_tour FROM tours WHERE id_tour = :id_tour)"
        params["id_tour"] = id_tour

    resultado = db.execute(text(f"""
        SELECT * FROM vista_balance_diario
        {filtros}
        ORDER BY fecha ASC
    """), params)

    return [dict(row) for row in resultado.mappings()]


# ── GET /reportes/balance-mensual ───────────────────────────
@router.get("/balance-mensual")
def balance_mensual(
    anio: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Datos para gráfico de balance mensual.
    UNA fila por mes — sin importar cuántos tours distintos
    se operaron ese mes.
    """
    filtros = "WHERE 1=1"
    params = {}

    if anio:
        filtros += " AND EXTRACT(YEAR FROM mes) = :anio"
        params["anio"] = anio

    resultado = db.execute(text(f"""
        SELECT * FROM vista_balance_mensual
        {filtros}
        ORDER BY mes ASC
    """), params)

    return [dict(row) for row in resultado.mappings()]


# ── GET /reportes/balance-mensual-por-tour ──────────────────
@router.get("/balance-mensual-por-tour")
def balance_mensual_por_tour(
    anio: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Desglose del balance mensual separado por tour.
    Útil para ver qué tour rindió más en un mes específico.
    """
    filtros = "WHERE 1=1"
    params = {}

    if anio:
        filtros += " AND EXTRACT(YEAR FROM mes) = :anio"
        params["anio"] = anio

    resultado = db.execute(text(f"""
        SELECT * FROM vista_balance_mensual_por_tour
        {filtros}
        ORDER BY mes ASC, balance DESC
    """), params)

    return [dict(row) for row in resultado.mappings()]


# ── GET /reportes/rentabilidad-vehiculo ─────────────────────
@router.get("/rentabilidad-vehiculo")
def rentabilidad_vehiculo(
    anio: Optional[int] = Query(None),
    mes:  Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Totales por vehículo dentro del año (y mes, si se especifica).
    UN vehículo = UNA fila, sin importar cuántos viajes individuales tuvo.
    """
    filtros = "WHERE 1=1"
    params = {}

    if anio:
        filtros += " AND EXTRACT(YEAR FROM fecha) = :anio"
        params["anio"] = anio
    if mes:
        filtros += " AND EXTRACT(MONTH FROM fecha) = :mes"
        params["mes"] = mes

    resultado = db.execute(text(f"""
        SELECT
            nombre_vehiculo,
            COUNT(id_operacion)                                   AS viajes_realizados,
            SUM(cantidad_pasajeros)                               AS pasajeros_transportados,
            ROUND(AVG(cantidad_pasajeros), 1)                     AS promedio_pasajeros_por_viaje,
            SUM(ingreso_neto_viaje)                               AS ingreso_neto,
            SUM(total_costos_fijos + total_costos_variables)      AS gastos_totales,
            SUM(balance_viaje)                                    AS balance,
            ROUND(AVG(balance_viaje), 2)                          AS balance_promedio_por_viaje
        FROM vista_rentabilidad_vehiculo
        {filtros}
        GROUP BY nombre_vehiculo
        ORDER BY balance DESC
    """), params)

    return [dict(row) for row in resultado.mappings()]


# ── GET /reportes/anios-disponibles ─────────────────────────
@router.get("/anios-disponibles")
def anios_disponibles(db: Session = Depends(get_db)):
    """
    Devuelve los años que tienen al menos un registro real.
    Usado para poblar selectores de año sin mostrar años vacíos.
    """
    resultado = db.execute(text("SELECT anio FROM vista_anios_disponibles ORDER BY anio"))
    return [row[0] for row in resultado]


# ── POST /reportes/simulacion ─────────────────────────────────
from pydantic import BaseModel, model_validator
from typing import List
from services.calculos import calcular_costos_viaje, calcular_ingresos_por_plataforma


class PlataformaSimulada(BaseModel):
    id_plataforma: int
    cantidad_pax:  int
    pax_con_deg:   int = 0
    pax_sin_deg:   int = 0


class SimulacionRequest(BaseModel):
    id_tour:                int
    id_vehiculo:             int
    id_conductor:            int
    plataformas:             List[PlataformaSimulada]
    costo_combustible_real:  float = 0.0
    km_adicionales:          float = 0.0

    @model_validator(mode='after')
    def validar(self):
        total = sum(p.cantidad_pax for p in self.plataformas)
        if total == 0:
            raise ValueError("Debe haber al menos 1 pasajero en alguna plataforma")
        return self


@router.post("/simulacion")
def simular_viaje(datos: SimulacionRequest, db: Session = Depends(get_db)):
    """
    Simula un viaje completo sin guardar nada en la BD.
    Usa exactamente la misma lógica de cálculo que el registro real,
    así el resultado es 100% fiel a lo que pasaría si se registrara.
    """
    try:
        tour = db.execute(text("""
            SELECT id_tour, nombre_tour, tiene_degustacion
            FROM tours WHERE id_tour = :id
        """), {"id": datos.id_tour}).mappings().first()

        if not tour:
            raise ValueError(f"Tour {datos.id_tour} no encontrado")

        tiene_deg = tour["tiene_degustacion"]

        total_pax     = sum(p.cantidad_pax for p in datos.plataformas)
        total_con_deg = sum(p.pax_con_deg  for p in datos.plataformas) if tiene_deg else 0
        total_sin_deg = total_pax - total_con_deg

        plataformas_list = [p.model_dump() for p in datos.plataformas]
        detalle_plat, ing_bruto, comision, ing_neto = calcular_ingresos_por_plataforma(
            db, datos.id_tour, tiene_deg, plataformas_list
        )

        costos = calcular_costos_viaje(
            db=db,
            id_vehiculo=datos.id_vehiculo,
            id_conductor=datos.id_conductor,
            id_config=_obtener_id_config_vigente(db, datos.id_tour),
            id_tour=datos.id_tour,
            cantidad_pasajeros=total_pax,
            pasajeros_con_deg=total_con_deg,
            pasajeros_sin_deg=total_sin_deg,
            costo_combustible_real=datos.costo_combustible_real,
            km_adicionales=datos.km_adicionales,
            tiene_degustacion=tiene_deg,
        )

        # Enriquecer detalle de plataformas con nombre
        nombres_plataforma = {
            r["id_plataforma"]: r["nombre"]
            for r in db.execute(text("SELECT id_plataforma, nombre FROM plataformas")).mappings()
        }
        for p in detalle_plat:
            p["nombre"] = nombres_plataforma.get(p["id_plataforma"], "?")

        total_gastos = costos["total_costos_fijos"] + costos["total_costos_variables"]
        balance      = round(ing_neto - total_gastos, 2)

        return {
            "tour":                tour["nombre_tour"],
            "tiene_degustacion":   tiene_deg,
            "total_pasajeros":     total_pax,
            "total_con_deg":       total_con_deg,
            "total_sin_deg":       total_sin_deg,
            "ingreso_bruto":       ing_bruto,
            "comision":            comision,
            "ingreso_neto":        ing_neto,
            "detalle_plataformas": detalle_plat,
            "costos": {
                "vehiculo":     costos["costo_vehiculo_viaje"],
                "combustible":  costos["costo_combustible"],
                "conductor":    costos["costo_conductor"],
                "parking":      costos["costo_parking"],
                "lavado":       costos["costo_lavacar"],
                "viaticos":     costos["costo_viaticos"],
                "km_adicional": costos["costo_km_adicionales"],
                "agua":         costos["costo_agua_entradas"],
                "degustacion":  costos["costo_degustacion"],
                "tickets":      costos.get("costo_tickets", 0),
                "peajes":       costos.get("costo_peajes", 0),
            },
            "total_gastos": round(total_gastos, 2),
            "balance":      balance,
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


def _obtener_id_config_vigente(db: Session, id_tour: int) -> int:
    row = db.execute(text("""
        SELECT id_config FROM configuracion_tour
        WHERE id_tour = :id_tour AND vigente_hasta IS NULL
        ORDER BY vigente_desde DESC LIMIT 1
    """), {"id_tour": id_tour}).mappings().first()
    if not row:
        raise ValueError(f"El tour {id_tour} no tiene configuración vigente")
    return row["id_config"]


# ── GET /reportes/resumen-dashboard ─────────────────────────
@router.get("/resumen-dashboard")
def resumen_dashboard(db: Session = Depends(get_db)):
    """
    Datos para las tarjetas del dashboard principal:
    - Balance del mes actual
    - Total pasajeros del mes
    - Viajes realizados este mes
    - Vehículo más rentable del mes
    """
    resultado = db.execute(text("""
        SELECT
            -- Balance y pasajeros del mes actual
            COALESCE(SUM(r.balance_operacion), 0)       AS balance_mes_actual,
            COALESCE(SUM(r.cantidad_pasajeros), 0)      AS pasajeros_mes_actual,
            COALESCE(COUNT(r.id_operacion), 0)          AS viajes_mes_actual,
            COALESCE(SUM(r.ingreso_bruto_total), 0)     AS ingreso_bruto_mes,
            COALESCE(SUM(r.total_gastos), 0)            AS gastos_mes,
            -- Gastos fijos del mes
            (SELECT COALESCE(SUM(monto_mensual), 0)
             FROM costos_fijos_agencia
             WHERE activo = TRUE)                        AS gastos_fijos_agencia
        FROM registro r
        WHERE DATE_TRUNC('month', r.fecha) = DATE_TRUNC('month', CURRENT_DATE)
    """)).mappings().first()

    # Vehículo más rentable del mes actual
    vehiculo_top = db.execute(text("""
        SELECT v.nombre_vehiculo, SUM(r.balance_operacion) AS balance
        FROM registro r
        JOIN vehiculos v ON v.id_vehiculo = r.id_vehiculo
        WHERE DATE_TRUNC('month', r.fecha) = DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY v.nombre_vehiculo
        ORDER BY balance DESC
        LIMIT 1
    """)).mappings().first()

    return {
        **dict(resultado),
        "vehiculo_mas_rentable": dict(vehiculo_top) if vehiculo_top else None
    }


# ============================================================
# SIMULACIONES GUARDADAS
# ============================================================
from pydantic import BaseModel as _BM
from routers.auth import require_auth
import json


class GuardarSimulacionRequest(_BM):
    nombre:    str
    entrada:   dict   # lo que el usuario seleccionó (tour, vehículo, plataformas, etc)
    resultado: dict   # el resultado devuelto por /reportes/simulacion


@router.post("/simulaciones-guardadas")
def guardar_simulacion(
    datos: GuardarSimulacionRequest,
    usuario = Depends(require_auth),
    db: Session = Depends(get_db)
):
    r = db.execute(text("""
        INSERT INTO simulaciones_guardadas (nombre, id_usuario, entrada, resultado)
        VALUES (:nombre, :id_usuario, :entrada, :resultado)
        RETURNING id_simulacion, nombre, created_at
    """), {
        "nombre":     datos.nombre,
        "id_usuario": usuario.get("id_usuario"),
        "entrada":    json.dumps(datos.entrada),
        "resultado":  json.dumps(datos.resultado),
    })
    db.commit()
    return dict(r.mappings().first())


@router.get("/simulaciones-guardadas")
def listar_simulaciones_guardadas(
    usuario = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Lista las simulaciones guardadas por el usuario actual."""
    rows = db.execute(text("""
        SELECT id_simulacion, nombre, entrada, resultado, created_at
        FROM simulaciones_guardadas
        WHERE id_usuario = :id_usuario
        ORDER BY created_at DESC
    """), {"id_usuario": usuario.get("id_usuario")})
    return [dict(r) for r in rows.mappings()]


@router.get("/simulaciones-guardadas/{id_simulacion}")
def obtener_simulacion_guardada(
    id_simulacion: int,
    usuario = Depends(require_auth),
    db: Session = Depends(get_db)
):
    row = db.execute(text("""
        SELECT id_simulacion, nombre, entrada, resultado, created_at
        FROM simulaciones_guardadas
        WHERE id_simulacion = :id AND id_usuario = :id_usuario
    """), {"id": id_simulacion, "id_usuario": usuario.get("id_usuario")}).mappings().first()

    if not row:
        raise HTTPException(404, "Simulación no encontrada")
    return dict(row)


@router.delete("/simulaciones-guardadas/{id_simulacion}")
def eliminar_simulacion_guardada(
    id_simulacion: int,
    usuario = Depends(require_auth),
    db: Session = Depends(get_db)
):
    r = db.execute(text("""
        DELETE FROM simulaciones_guardadas
        WHERE id_simulacion = :id AND id_usuario = :id_usuario
        RETURNING id_simulacion
    """), {"id": id_simulacion, "id_usuario": usuario.get("id_usuario")})
    db.commit()
    if not r.rowcount:
        raise HTTPException(404, "Simulación no encontrada")
    return {"mensaje": "Simulación eliminada"}