# ============================================================
#  services/calculos.py — v4
#  Cambios vs v3:
#    - Combustible desde costos_vehiculo_tour (por tour+vehiculo)
#    - Tickets por persona y peajes desde configuracion_tour
#    - Ambos incluidos en total_costos_variables
# ============================================================

from sqlalchemy.orm import Session
from sqlalchemy import text


def obtener_tarifa(db: Session, id_tour: int, id_plataforma: int) -> dict:
    tarifa = db.execute(text("""
        SELECT id_tarifa, comision_pct, precio_con_deg, precio_sin_deg
        FROM tarifas_tour_plataforma
        WHERE id_tour       = :id_tour
          AND id_plataforma = :id_plataforma
          AND vigente_hasta IS NULL
        ORDER BY vigente_desde DESC
        LIMIT 1
    """), {"id_tour": id_tour, "id_plataforma": id_plataforma}).mappings().first()

    if not tarifa:
        raise ValueError(
            f"No hay tarifa configurada para el tour {id_tour} "
            f"con la plataforma {id_plataforma}. "
            f"Configurala en Panel Admin → Tours → Tarifas."
        )
    return dict(tarifa)


def calcular_ingresos_por_plataforma(
    db: Session,
    id_tour: int,
    tiene_degustacion: bool,
    plataformas: list
) -> tuple:
    detalle             = []
    ingreso_bruto_total = 0.0
    comision_total      = 0.0

    for p in plataformas:
        if p["cantidad_pax"] == 0:
            continue

        tarifa = obtener_tarifa(db, id_tour, p["id_plataforma"])

        pax_con = p["pax_con_deg"] if tiene_degustacion else 0
        pax_sin = p["pax_sin_deg"] if tiene_degustacion else p["cantidad_pax"]

        precio_con   = float(tarifa["precio_con_deg"] or tarifa["precio_sin_deg"])
        precio_sin   = float(tarifa["precio_sin_deg"])
        comision_pct = float(tarifa["comision_pct"])

        ing_bruto = round(pax_con * precio_con + pax_sin * precio_sin, 2)
        comision  = round(ing_bruto * comision_pct, 2)

        detalle.append({
            "id_plataforma": p["id_plataforma"],
            "cantidad_pax":  p["cantidad_pax"],
            "pax_con_deg":   pax_con,
            "pax_sin_deg":   pax_sin,
            "ingreso_bruto": ing_bruto,
            "comision":      comision,
        })

        ingreso_bruto_total += ing_bruto
        comision_total      += comision

    ingreso_bruto_total = round(ingreso_bruto_total, 2)
    comision_total      = round(comision_total, 2)
    ingreso_neto_total  = round(ingreso_bruto_total - comision_total, 2)

    return detalle, ingreso_bruto_total, comision_total, ingreso_neto_total


def calcular_costos_viaje(
    db: Session,
    id_vehiculo: int,
    id_conductor: int,
    id_config: int,
    id_tour: int,
    cantidad_pasajeros: int,
    pasajeros_con_deg: int,
    pasajeros_sin_deg: int,
    costo_combustible_real: float,
    km_adicionales: float = 0.0,
    tiene_degustacion: bool = True,
) -> dict:

    # ── 1. Datos del vehículo ────────────────────────────────
    vehiculo = db.execute(text("""
        SELECT capacidad_max, alquiler_mensual,
               km_mensual_contrato, costo_km_extra, alquiler_diario
        FROM vehiculos WHERE id_vehiculo = :id
    """), {"id": id_vehiculo}).mappings().first()

    if not vehiculo:
        raise ValueError(f"Vehículo {id_vehiculo} no encontrado")

    if cantidad_pasajeros > vehiculo["capacidad_max"]:
        raise ValueError(
            f"Capacidad excedida: el vehículo admite "
            f"{vehiculo['capacidad_max']} pasajeros, "
            f"se intentaron registrar {cantidad_pasajeros}"
        )

    # ── 2. Configuración del tour ────────────────────────────
    config = db.execute(text("""
        SELECT c.costo_degustacion, c.costo_agua_entradas,
               c.parking_fijo, c.lavacar_fijo, c.viaticos_fijo,
               c.tickets_por_persona, c.peajes,
               t.distancia_km
        FROM configuracion_tour c
        JOIN tours t ON t.id_tour = c.id_tour
        WHERE c.id_config = :id
    """), {"id": id_config}).mappings().first()

    if not config:
        raise ValueError(f"Configuración {id_config} no encontrada")

    # ── 3. Combustible estimado por tour + vehículo ──────────
    # Si el usuario ingresó combustible real lo usamos
    # Si no ingresó (0), buscamos el estimado de costos_vehiculo_tour
    if costo_combustible_real > 0:
        costo_combustible = costo_combustible_real
    else:
        combustible_row = db.execute(text("""
            SELECT costo_combustible
            FROM costos_vehiculo_tour
            WHERE id_tour     = :id_tour
              AND id_vehiculo = :id_vehiculo
              AND vigente_hasta IS NULL
            ORDER BY vigente_desde DESC
            LIMIT 1
        """), {"id_tour": id_tour, "id_vehiculo": id_vehiculo}).mappings().first()

        costo_combustible = float(combustible_row["costo_combustible"]) \
            if combustible_row else 0.0

    # ── 4. Honorario del conductor ───────────────────────────
    honorario_row = db.execute(text("""
        SELECT honorario FROM honorarios_conductor
        WHERE id_conductor = :id_conductor
          AND (id_tour = :id_tour OR id_tour IS NULL)
          AND :pasajeros BETWEEN pasajeros_min AND pasajeros_max
        ORDER BY id_tour NULLS LAST
        LIMIT 1
    """), {
        "id_conductor": id_conductor,
        "id_tour":      id_tour,
        "pasajeros":    cantidad_pasajeros
    }).mappings().first()

    costo_conductor = float(honorario_row["honorario"]) if honorario_row else 0.0

    # ── 5. Costo del vehículo por viaje (prorrateo km) ───────
    if vehiculo["alquiler_diario"] is not None:
        costo_vehiculo_viaje = float(vehiculo["alquiler_diario"])
    else:
        costo_vehiculo_viaje = round(
            float(vehiculo["alquiler_mensual"])
            / float(vehiculo["km_mensual_contrato"])
            * float(config["distancia_km"]),
            2
        )

    # ── 6. Km adicionales ────────────────────────────────────
    costo_km_adicionales = 0.0
    if km_adicionales > 0 and vehiculo["costo_km_extra"]:
        costo_km_adicionales = round(
            km_adicionales * float(vehiculo["costo_km_extra"]), 2
        )

    # ── 7. Costos fijos del viaje ────────────────────────────
    costo_parking  = float(config["parking_fijo"])
    costo_lavacar  = float(config["lavacar_fijo"])
    costo_viaticos = float(config["viaticos_fijo"])
    costo_peajes   = float(config["peajes"])

    total_costos_fijos = round(
        costo_vehiculo_viaje
        + costo_combustible
        + costo_conductor
        + costo_parking
        + costo_lavacar
        + costo_viaticos
        + costo_km_adicionales
        + costo_peajes,
        2
    )

    # ── 8. Costos variables (por pasajero) ───────────────────
    costo_agua_entradas = round(
        cantidad_pasajeros * float(config["costo_agua_entradas"]), 2
    )

    costo_tickets = round(
        cantidad_pasajeros * float(config["tickets_por_persona"]), 2
    )

    costo_degustacion = 0.0
    if tiene_degustacion:
        costo_degustacion = round(
            pasajeros_con_deg * float(config["costo_degustacion"]), 2
        )

    total_costos_variables = round(
        costo_agua_entradas
        + costo_tickets
        + costo_degustacion,
        2
    )

    return {
        "costo_vehiculo_viaje":   costo_vehiculo_viaje,
        "costo_combustible":      costo_combustible,
        "costo_combustible_real": costo_combustible,
        "costo_conductor":        costo_conductor,
        "costo_parking":          costo_parking,
        "costo_lavacar":          costo_lavacar,
        "costo_viaticos":         costo_viaticos,
        "costo_km_adicionales":   costo_km_adicionales,
        "km_adicionales":         km_adicionales,
        "costo_agua_entradas":    costo_agua_entradas,
        "costo_degustacion":      costo_degustacion,
        "costo_tickets":          costo_tickets,
        "costo_peajes":           costo_peajes,
        "total_costos_fijos":     total_costos_fijos,
        "total_costos_variables": total_costos_variables,
    }