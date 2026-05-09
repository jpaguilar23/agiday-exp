# ============================================================
#  routers/auth.py — Autenticación con JWT
# ============================================================

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta

from database import get_db

router = APIRouter(prefix="/auth", tags=["Auth"])

# ── Configuración JWT ────────────────────────────────────────
SECRET_KEY  = "agiday-secret-key-cambiar-en-produccion"
ALGORITHM   = "HS256"
EXPIRA_HORAS = 8

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Schemas ──────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email:    str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str
    usuario:      dict


# ── Funciones helper ─────────────────────────────────────────
def verificar_password(password_plano: str, password_hash: str) -> bool:
    return pwd_context.verify(password_plano, password_hash)

def crear_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=EXPIRA_HORAS)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def obtener_usuario_del_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado"
        )


# ── Dependencia para proteger rutas ─────────────────────────
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)):
    return obtener_usuario_del_token(credentials.credentials)

def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    usuario = obtener_usuario_del_token(credentials.credentials)
    if usuario.get("rol") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado — se requiere rol administrador"
        )
    return usuario


# ── POST /auth/login ─────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
def login(datos: LoginRequest, db: Session = Depends(get_db)):
    # Buscar usuario por email
    usuario = db.execute(text("""
        SELECT id_usuario, nombre, email, password_hash, rol, activo
        FROM usuarios
        WHERE email = :email
    """), {"email": datos.email}).mappings().first()

    if not usuario:
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")

    if not usuario["activo"]:
        raise HTTPException(status_code=401, detail="Usuario desactivado")

    if not verificar_password(datos.password, usuario["password_hash"]):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")

    # Crear token JWT con los datos del usuario
    token = crear_token({
        "id_usuario": usuario["id_usuario"],
        "nombre":     usuario["nombre"],
        "email":      usuario["email"],
        "rol":        usuario["rol"]
    })

    return {
        "access_token": token,
        "token_type":   "bearer",
        "usuario": {
            "id_usuario": usuario["id_usuario"],
            "nombre":     usuario["nombre"],
            "email":      usuario["email"],
            "rol":        usuario["rol"]
        }
    }


# ── GET /auth/me — verificar token activo ───────────────────
@router.get("/me")
def me(usuario = Depends(require_auth)):
    return usuario