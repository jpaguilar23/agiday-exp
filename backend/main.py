# ============================================================
#  main.py — Punto de entrada de FastAPI
#  Para correr: uvicorn main:app --reload
# ============================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import verificar_conexion
from routers import registro, reportes

# ── Crear la app ─────────────────────────────────────────────
app = FastAPI(
    title="Agiday API",
    description="Sistema de gestión de agencia de tours",
    version="1.0.0"
)

# ── CORS — permite que React se comunique con FastAPI ────────
# En producción cambiar origins por el dominio real
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Registrar los routers ────────────────────────────────────
app.include_router(registro.router)
app.include_router(reportes.router)

# ── Evento al arrancar ───────────────────────────────────────
@app.on_event("startup")
def startup():
    verificar_conexion()

# ── Endpoint raíz — solo para verificar que la API corre ────
@app.get("/")
def raiz():
    return {"estado": "ok", "mensaje": "Agiday API corriendo"}