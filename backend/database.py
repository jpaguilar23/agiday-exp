# ============================================================
#  database.py — Conexión a PostgreSQL
#  Usa SQLAlchemy para manejar el pool de conexiones
# ============================================================

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from pydantic_settings import BaseSettings
import urllib.parse


# ── Configuración desde .env ────────────────────────────────
class Settings(BaseSettings):
    DB_HOST: str
    DB_PORT: int
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str

    class Config:
        env_file = ".env"


settings = Settings()

# Escapamos la contraseña para usar en la URL
password_escaper = urllib.parse.quote_plus(settings.DB_PASSWORD)

# URL de conexión a PostgreSQL
DATABASE_URL = (
    f"postgresql://{settings.DB_USER}:{password_escaper}"
    f"@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
)

# ── Motor y sesión ───────────────────────────────────────────
# pool_size: conexiones simultáneas abiertas
# max_overflow: conexiones extra si el pool se llena
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    echo=True   # muestra los SQL en consola — cambiar a False en producción
)

SessionLocal = sessionmaker(
    autocommit=False,   # los cambios no se guardan solos, hay que hacer commit()
    autoflush=False,
    bind=engine
)


# ── Clase base para los modelos ORM ─────────────────────────
class Base(DeclarativeBase):
    pass


# ── Dependencia para FastAPI ─────────────────────────────────
# Esta función se inyecta en cada endpoint con Depends(get_db)
# Abre una sesión, la entrega al endpoint, y la cierra al terminar
def get_db():
    db = SessionLocal()
    try:
        yield db        # el endpoint usa la sesión aquí
    finally:
        db.close()      # siempre se cierra, aunque haya error


# ── Función para verificar la conexión al arrancar ──────────
def verificar_conexion():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Conexión a PostgreSQL exitosa")
    except Exception as e:
        print(f"❌ Error conectando a PostgreSQL: {e}")
        raise