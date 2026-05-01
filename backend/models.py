# ============================================================
#  models.py — Esquemas Pydantic
#  Define la estructura de los datos que entran y salen
#  de cada endpoint. FastAPI los valida automáticamente.
# ============================================================

from pydantic import BaseModel, Field, model_validator
from datetime import date
from typing import Optional


# ── CONDUCTORES ──────────────────────────────────────────────
class ConductorBase(BaseModel):
    nombre: str
    activo: bool = True

class ConductorResponse(ConductorBase):
    id_conductor: int
    class Config:
        from_attributes = True


# ── VEHÍCULOS ────────────────────────────────────────────────
class VehiculoBase(BaseModel):
    nombre_vehiculo: str
    capacidad_max: int
    combustible_por_viaje: float
    alquiler_mensual: float
    km_mensual_contrato: Optional[float] = None
    costo_km_extra: Optional[float] = None
    alquiler_diario: Optional[float] = None
    activo: bool = True

class VehiculoResponse(VehiculoBase):
    id_vehiculo: int
    class Config:
        from_attributes = True


# ── TOURS ────────────────────────────────────────────────────
class TourBase(BaseModel):
    nombre_tour: str
    distancia_km: float
    activo: bool = True

class TourResponse(TourBase):
    id_tour: int
    class Config:
        from_attributes = True


# ── REGISTRO — lo que llega desde el frontend ────────────────
class RegistroCreate(BaseModel):
    fecha: date
    id_tour: int
    id_vehiculo: int
    id_conductor: int
    id_plataforma: Optional[int] = None
    id_config: int

    # Pasajeros
    cantidad_pasajeros: int = Field(ge=0)       # ge=0 significa "mayor o igual a 0"
    pasajeros_con_deg: int  = Field(ge=0)
    pasajeros_sin_deg: int  = Field(ge=0)

    # Km adicionales (si el tour fue más largo de lo normal)
    km_adicionales: float = 0.0

    notas: Optional[str] = None

    # Validación: los pasajeros deben sumar bien
    @model_validator(mode='after')
    def validar_suma_pasajeros(self):
        if self.pasajeros_con_deg + self.pasajeros_sin_deg != self.cantidad_pasajeros:
            raise ValueError(
                f"pasajeros_con_deg ({self.pasajeros_con_deg}) + "
                f"pasajeros_sin_deg ({self.pasajeros_sin_deg}) "
                f"debe ser igual a cantidad_pasajeros ({self.cantidad_pasajeros})"
            )
        return self


# ── REGISTRO — lo que devuelve el backend ────────────────────
class RegistroResponse(BaseModel):
    id_operacion: int
    fecha: date
    id_tour: int
    id_vehiculo: int
    id_conductor: int
    id_plataforma: Optional[int]
    cantidad_pasajeros: int
    pasajeros_con_deg: int
    pasajeros_sin_deg: int
    ingreso_bruto_total: float
    comision_plataforma: float
    ingreso_neto_total: float
    costo_vehiculo_viaje: float
    costo_combustible: float
    costo_conductor: float
    costo_parking: float
    costo_lavacar: float
    costo_viaticos: float
    costo_km_adicionales: float
    costo_agua_entradas: float
    costo_degustacion: float
    total_costos_fijos: float
    total_costos_variables: float
    total_gastos: float
    balance_operacion: float
    notas: Optional[str]

    class Config:
        from_attributes = True


# ── REPORTES — estructura de los datos para gráficos ─────────
class BalanceDiario(BaseModel):
    fecha: date
    nombre_tour: str
    viajes_del_dia: int
    total_pasajeros: int
    ingreso_bruto: float
    comision_total: float
    ingreso_neto: float
    gastos_totales: float
    balance_dia: float

class BalanceMensual(BaseModel):
    mes: date
    mes_nombre: str
    nombre_tour: str
    dias_operados: int
    total_viajes: int
    total_pasajeros: int
    ingreso_bruto: float
    comision_plataformas: float
    ingreso_neto: float
    gastos_operativos: float
    gastos_fijos_agencia: float
    balance_mensual_neto: float
    promedio_ganancia_por_pasajero: float

class RentabilidadVehiculo(BaseModel):
    nombre_vehiculo: str
    mes: date
    viajes_realizados: int
    pasajeros_transportados: int
    promedio_pasajeros_por_viaje: float
    ingreso_neto: float
    gastos_totales: float
    balance: float
    balance_promedio_por_viaje: float

class SimulacionEscenario(BaseModel):
    nombre_vehiculo: str
    n_pasajeros: int
    costo_vehiculo: float
    costo_combustible: float
    costo_operativos: float
    costo_agua_entradas: float
    ingreso_neto_sin_deg: float
    ingreso_neto_con_deg: float
    balance_estimado_sin_deg: float
    balance_estimado_con_deg: float