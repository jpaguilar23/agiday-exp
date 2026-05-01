# ============================================================
#  routers/reportes.py — Endpoints para gráficos y reportes
#  Sirve los datos de las 4 vistas de PostgreSQL
# ============================================================

from fastapi import APIRouter, Depends, Query
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
    id_tour: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Datos para gráfico de líneas de balance mensual.
    Equivale a la celda B50 de cada hoja mensual del Excel.
    """
    filtros = "WHERE 1=1"
    params = {}

    if anio:
        filtros += " AND EXTRACT(YEAR FROM mes) = :anio"
        params["anio"] = anio
    if id_tour:
        filtros += " AND nombre_tour = (SELECT nombre_tour FROM tours WHERE id_tour = :id_tour)"
        params["id_tour"] = id_tour

    resultado = db.execute(text(f"""
        SELECT * FROM vista_balance_mensual
        {filtros}
        ORDER BY mes ASC
    """), params)

    return [dict(row) for row in resultado.mappings()]


# ── GET /reportes/rentabilidad-vehiculo ─────────────────────
@router.get("/rentabilidad-vehiculo")
def rentabilidad_vehiculo(
    anio: Optional[int] = Query(None),
    mes: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Datos para gráfico de barras apiladas por vehículo.
    Muestra qué vehículo es más rentable por mes.
    """
    filtros = "WHERE 1=1"
    params = {}

    if anio:
        filtros += " AND EXTRACT(YEAR FROM mes) = :anio"
        params["anio"] = anio
    if mes:
        filtros += " AND EXTRACT(MONTH FROM mes) = :mes"
        params["mes"] = mes

    resultado = db.execute(text(f"""
        SELECT * FROM vista_rentabilidad_vehiculo
        {filtros}
        ORDER BY mes ASC, balance DESC
    """), params)

    return [dict(row) for row in resultado.mappings()]


# ── GET /reportes/simulacion ─────────────────────────────────
@router.get("/simulacion")
def simulacion_escenarios(
    id_tour: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Datos para tabla/gráfico de simulación de escenarios.
    Muestra balance estimado por vehículo y nº de pasajeros.
    Equivale a la hoja 'Costos e ingresos' del Excel.
    """
    filtros = ""
    params = {}

    if id_tour:
        filtros = "WHERE nombre_vehiculo IS NOT NULL"  # placeholder, la vista ya filtra por vigente_hasta

    resultado = db.execute(text(f"""
        SELECT * FROM vista_simulacion_escenarios
        ORDER BY nombre_vehiculo, n_pasajeros
    """), params)

    return [dict(row) for row in resultado.mappings()]


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