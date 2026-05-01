# ============================================================
#  services/calculos.py — Lógica de negocio
#  Calcula todos los costos del viaje ANTES del INSERT
#  Replica exactamente las fórmulas del Excel
# ============================================================

from sqlalchemy.orm import Session
from sqlalchemy import text


def calcular_costos_viaje(
    db: Session,
    id_vehiculo: int,
    id_conductor: int,
    id_config: int,
    cantidad_pasajeros: int,
    pasajeros_con_deg: int,
    pasajeros_sin_deg: int,
    km_adicionales: float = 0.0
) -> dict:
    """
    Calcula todos los costos y ingresos de un viaje.
    Recibe los IDs y devuelve un dict con todos los valores
    listos para hacer el INSERT en registro.

    Replica las fórmulas del Excel:
      - Ingresos: pasajeros * precio * (1 - comision)
      - Costo vehículo: alquiler/km_contrato * distancia (o alquiler_diario)
      - Costo conductor: según tabla honorarios_conductor
      - Costos variables: agua, degustación por pasajero
    """

    # ── 1. Traer datos del vehículo ──────────────────────────
    vehiculo = db.execute(text("""
        SELECT
            capacidad_max,
            combustible_por_viaje,
            alquiler_mensual,
            km_mensual_contrato,
            costo_km_extra,
            alquiler_diario
        FROM vehiculos
        WHERE id_vehiculo = :id_vehiculo
    """), {"id_vehiculo": id_vehiculo}).mappings().first()

    if not vehiculo:
        raise ValueError(f"Vehículo {id_vehiculo} no encontrado")

    if cantidad_pasajeros > vehiculo["capacidad_max"]:
        raise ValueError(
            f"Capacidad excedida: el vehículo admite {vehiculo['capacidad_max']} "
            f"pasajeros, se intentaron registrar {cantidad_pasajeros}"
        )

    # ── 2. Traer configuración vigente del tour ──────────────
    config = db.execute(text("""
        SELECT
            c.precio_con_deg,
            c.precio_sin_deg,
            c.comision_pct,
            c.costo_degustacion,
            c.costo_agua_entradas,
            c.parking_fijo,
            c.lavacar_fijo,
            c.viaticos_fijo,
            t.distancia_km
        FROM configuracion_tour c
        JOIN tours t ON t.id_tour = c.id_tour
        WHERE c.id_config = :id_config
    """), {"id_config": id_config}).mappings().first()

    if not config:
        raise ValueError(f"Configuración {id_config} no encontrada")

    # ── 3. Traer honorario del conductor ─────────────────────
    # Busca el rango que corresponde a la cantidad de pasajeros
    honorario_row = db.execute(text("""
        SELECT honorario
        FROM honorarios_conductor
        WHERE id_conductor = :id_conductor
          AND :pasajeros BETWEEN pasajeros_min AND pasajeros_max
        LIMIT 1
    """), {
        "id_conductor": id_conductor,
        "pasajeros": cantidad_pasajeros
    }).mappings().first()

    # Si no hay rango definido usa 100€ como fallback
    costo_conductor = float(honorario_row["honorario"]) if honorario_row else 100.0

    # ── 4. Calcular costo del vehículo por viaje ─────────────
    # Excel DATOS fila 41-44:
    # - Hyundai: alquiler diario fijo
    # - Resto: alquiler_mensual / km_contrato * distancia_km
    if vehiculo["alquiler_diario"] is not None:
        costo_vehiculo_viaje = float(vehiculo["alquiler_diario"])
    else:
        costo_vehiculo_viaje = round(
            float(vehiculo["alquiler_mensual"])
            / float(vehiculo["km_mensual_contrato"])
            * float(config["distancia_km"]),
            2
        )

    # ── 5. Calcular costo de km adicionales ──────────────────
    costo_km_adicionales = 0.0
    if km_adicionales > 0 and vehiculo["costo_km_extra"]:
        costo_km_adicionales = round(
            km_adicionales * float(vehiculo["costo_km_extra"]), 2
        )

    # ── 6. Calcular ingresos ─────────────────────────────────
    # Excel fila 32-33: precio * pasajeros
    ingreso_bruto_con_deg = round(
        pasajeros_con_deg * float(config["precio_con_deg"]), 2
    )
    ingreso_bruto_sin_deg = round(
        pasajeros_sin_deg * float(config["precio_sin_deg"]), 2
    )
    ingreso_bruto_total = ingreso_bruto_con_deg + ingreso_bruto_sin_deg

    # Excel fila 22-23: comisión = ingreso_bruto * 27.5%
    comision_plataforma = round(
        ingreso_bruto_total * float(config["comision_pct"]), 2
    )

    # ── 7. Calcular costos variables ─────────────────────────
    # Excel fila 24-25: por pasajero
    costo_agua_entradas = round(
        cantidad_pasajeros * float(config["costo_agua_entradas"]), 2
    )
    costo_degustacion = round(
        pasajeros_con_deg * float(config["costo_degustacion"]), 2
    )

    # ── 8. Costos fijos del viaje ────────────────────────────
    # Excel DATOS filas 47-51
    costo_combustible = float(vehiculo["combustible_por_viaje"])
    costo_parking     = float(config["parking_fijo"])
    costo_lavacar     = float(config["lavacar_fijo"])
    costo_viaticos    = float(config["viaticos_fijo"])

    # ── 9. Totales ───────────────────────────────────────────
    total_costos_fijos = round(
        costo_vehiculo_viaje
        + costo_combustible
        + costo_conductor
        + costo_parking
        + costo_lavacar
        + costo_viaticos
        + costo_km_adicionales,
        2
    )
    total_costos_variables = round(
        costo_agua_entradas + costo_degustacion, 2
    )

    # Devuelve todo listo para el INSERT
    return {
        "ingreso_bruto_con_deg":  ingreso_bruto_con_deg,
        "ingreso_bruto_sin_deg":  ingreso_bruto_sin_deg,
        "comision_plataforma":    comision_plataforma,
        "costo_vehiculo_viaje":   costo_vehiculo_viaje,
        "costo_combustible":      costo_combustible,
        "costo_conductor":        costo_conductor,
        "costo_parking":          costo_parking,
        "costo_lavacar":          costo_lavacar,
        "costo_viaticos":         costo_viaticos,
        "costo_km_adicionales":   costo_km_adicionales,
        "km_adicionales":         km_adicionales,
        "costo_agua_entradas":    costo_agua_entradas,
        "costo_degustacion":      costo_degustacion,
        "total_costos_fijos":     total_costos_fijos,
        "total_costos_variables": total_costos_variables,
    }