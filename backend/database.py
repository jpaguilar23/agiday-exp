# ============================================================
#  database.py — Conexión a PostgreSQL
# ============================================================

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from pydantic_settings import BaseSettings
import urllib.parse


class Settings(BaseSettings):
    DATABASE_URL: str = ""
    DB_HOST: str = "localhost"
    DB_PORT: int = 5433
    DB_NAME: str = "postgres"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = ""

    class Config:
        env_file = ".env"


settings = Settings()

if settings.DATABASE_URL:
    DATABASE_URL = settings.DATABASE_URL
else:
    password_escaped = urllib.parse.quote_plus(settings.DB_PASSWORD)
    DATABASE_URL = (
        f"postgresql://{settings.DB_USER}:{password_escaped}"
        f"@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
    )

engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    echo=False
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verificar_conexion():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Conexión a PostgreSQL exitosa")
    except Exception as e:
        print(f"❌ Error conectando a PostgreSQL: {e}")
        raise