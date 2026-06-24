"""
api/main.py — API FastAPI para UTMACHOrienta.

Endpoints:
  POST /auth/registro          → crear cuenta
  POST /auth/login             → obtener token JWT
  POST /sesion/iniciar         → iniciar test, retorna primera pregunta
  POST /sesion/{id}/responder  → enviar respuesta, retorna siguiente pregunta o recomendación
  GET  /sesion/{id}/estado     → estado actual de la sesión
  POST /sesion/{id}/reiniciar  → reiniciar test manteniendo usuario
  GET  /carreras               → lista todas las carreras disponibles

Ejecutar:
  uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
"""

import sys
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
import bcrypt
import jwt
import chromadb

from db.models import Usuario, SesionTest, Respuesta, Recomendacion, get_db, crear_tablas
from pipeline.motor_test import MotorTest
from settings import (
    CHROMA_PATH,
    EMBEDDING_MODEL,
    JWT_SECRET_KEY,
    LLM_MODEL,
    LMSTUDIO_URL,
    get_cors_origins,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────
SECRET_KEY      = JWT_SECRET_KEY
ALGORITHM       = "HS256"
TOKEN_EXPIRE_H  = 24

# ── App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="UTMACHOrienta — Motor IA",
    description="API de orientación vocacional con RAG para la UTMACH",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# ── Motor (singleton) ─────────────────────────────────────────────────
_motor: Optional[MotorTest] = None

def get_motor() -> MotorTest:
    global _motor
    if _motor is None:
        _motor = MotorTest(
            lmstudio_url=LMSTUDIO_URL,
            embedding_model=EMBEDDING_MODEL,
            llm_model=LLM_MODEL,
            chroma_path=CHROMA_PATH,
        )
    return _motor


# ── Schemas Pydantic ──────────────────────────────────────────────────

class RegistroInput(BaseModel):
    nombre: str
    email: EmailStr
    password: str

class LoginOutput(BaseModel):
    access_token: str
    token_type: str
    usuario_id: int
    nombre: str

class RespuestaInput(BaseModel):
    respuesta: str = ""
    # El frontend devuelve también el texto y tipo de la pregunta que acaba de responder
    pregunta_texto: str = ""
    pregunta_tipo: str  = "opciones"
    pregunta_id: Optional[str] = None
    opcion_ids: list[str] = Field(default_factory=list)
    texto_libre: Optional[str] = None

class PreguntaOutput(BaseModel):
    sesion_id: int
    turno: int
    pregunta_id: Optional[str] = None
    texto: str
    tipo: str
    opciones: list[str]
    opciones_detalle: list[dict] = Field(default_factory=list)
    permite_texto_libre: bool
    es_recomendacion: bool
    progreso: float
    estado_parcial: Optional[dict] = None

class RecomendacionOutput(BaseModel):
    sesion_id: int
    turno: int
    es_recomendacion: bool
    carreras: list[dict]
    resumen_perfil: str
    progreso: float
    estado_parcial: Optional[dict] = None

class EstadoOutput(BaseModel):
    sesion_id: int
    estado: str
    turno_actual: int
    perfil: dict
    progreso: float


# ── Auth helpers ──────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verificar_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def crear_token(usuario_id: int) -> str:
    exp = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_H)
    return jwt.encode({"sub": str(usuario_id), "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)

def get_usuario_actual(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Usuario:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        usuario_id = int(payload["sub"])
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario or not usuario.activo:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")
    return usuario

def calcular_progreso(turno: int) -> float:
    from pipeline.motor_test import MAX_PREGUNTAS
    return min(turno / MAX_PREGUNTAS, 1.0)


# ── Startup ───────────────────────────────────────────────────────────

@app.on_event("startup")
def startup():
    crear_tablas()
    logger.info("Tablas PostgreSQL verificadas.")
    get_motor()
    logger.info("Motor IA listo.")


# ── Auth ──────────────────────────────────────────────────────────────

@app.post("/auth/registro", status_code=201)
def registro(datos: RegistroInput, db: Session = Depends(get_db)):
    if db.query(Usuario).filter(Usuario.email == datos.email).first():
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    usuario = Usuario(
        nombre=datos.nombre,
        email=datos.email,
        password_hash=hash_password(datos.password),
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return {"mensaje": "Cuenta creada correctamente", "usuario_id": usuario.id}


@app.post("/auth/login", response_model=LoginOutput)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.email == form.username).first()
    if not usuario or not verificar_password(form.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    return LoginOutput(
        access_token=crear_token(usuario.id),
        token_type="bearer",
        usuario_id=usuario.id,
        nombre=usuario.nombre,
    )


# ── Test ──────────────────────────────────────────────────────────────

@app.post("/sesion/iniciar")
def iniciar_sesion(
    usuario: Usuario  = Depends(get_usuario_actual),
    db: Session       = Depends(get_db),
    motor: MotorTest  = Depends(get_motor),
):
    """Crea nueva sesión y retorna la primera pregunta."""
    pregunta = motor.primera_pregunta()

    # Guardamos la primera pregunta en el perfil para que el frontend
    # la devuelva en el primer /responder
    sesion = SesionTest(
        usuario_id=usuario.id,
        perfil={
            "_ultima_pregunta": pregunta["texto"],
            "_ultima_pregunta_id": pregunta.get("pregunta_id"),
            "_ultimo_tipo": pregunta["tipo"],
            "_ultima_dimension": pregunta.get("dimension"),
        },
        turno_actual=1,
    )
    db.add(sesion)
    db.commit()
    db.refresh(sesion)

    return PreguntaOutput(
        sesion_id=sesion.id,
        turno=1,
        pregunta_id=pregunta.get("pregunta_id"),
        texto=pregunta["texto"],
        tipo=pregunta["tipo"],
        opciones=pregunta["opciones"],
        opciones_detalle=pregunta.get("opciones_detalle", []),
        permite_texto_libre=pregunta["permite_texto_libre"],
        es_recomendacion=False,
        progreso=calcular_progreso(1),
        estado_parcial=motor.estado_parcial(sesion.perfil),
    )


@app.post("/sesion/{sesion_id}/responder")
def responder(
    sesion_id: int,
    datos: RespuestaInput,
    usuario: Usuario  = Depends(get_usuario_actual),
    db: Session       = Depends(get_db),
    motor: MotorTest  = Depends(get_motor),
):
    """
    Recibe la respuesta del estudiante.
    El frontend debe enviar también pregunta_texto y pregunta_tipo
    (los valores que recibió en el PreguntaOutput anterior).
    """
    sesion = db.query(SesionTest).filter(
        SesionTest.id == sesion_id,
        SesionTest.usuario_id == usuario.id,
        SesionTest.estado == "en_progreso",
    ).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada o ya completada")

    perfil = dict(sesion.perfil or {})

    # Recuperar texto de la pregunta: primero desde el payload del frontend,
    # si no viene usamos el guardado en el perfil como fallback
    pregunta_obj_guardada = perfil.pop("_ultima_pregunta_obj", None)
    pregunta_id = datos.pregunta_id or perfil.pop("_ultima_pregunta_id", None)
    pregunta_texto = datos.pregunta_texto.strip() or perfil.pop("_ultima_pregunta", "")
    pregunta_tipo = datos.pregunta_tipo or perfil.pop("_ultimo_tipo", "opciones")
    pregunta = None
    if (
        isinstance(pregunta_obj_guardada, dict)
        and pregunta_obj_guardada.get("pregunta_id") == pregunta_id
    ):
        pregunta = pregunta_obj_guardada
    pregunta = pregunta or motor.obtener_pregunta(pregunta_id, pregunta_texto)
    if pregunta:
        pregunta_id = pregunta.get("id")
        pregunta_texto = pregunta.get("texto", pregunta_texto)
        pregunta_tipo = pregunta.get("tipo", pregunta_tipo)
    # Limpiar claves internas del perfil
    perfil.pop("_ultima_pregunta", None)
    perfil.pop("_ultima_pregunta_id", None)
    perfil.pop("_ultimo_tipo", None)
    perfil.pop("_ultima_dimension", None)

    turno_actual = sesion.turno_actual
    normalizada = motor.normalizar_respuesta(
        pregunta,
        datos.respuesta,
        opcion_ids=datos.opcion_ids,
        texto_libre=datos.texto_libre,
    )
    respuesta_texto = normalizada["respuesta_texto"]

    # ── 1. Reconstruir historial previo antes de agregar la respuesta actual ──
    respuestas_db = db.query(Respuesta).filter(
        Respuesta.sesion_id == sesion_id
    ).order_by(Respuesta.turno).all()

    historial = [
        {"pregunta": r.pregunta_texto, "respuesta": r.respuesta_dada}
        for r in respuestas_db
    ]
    historial.append({"pregunta": pregunta_texto, "respuesta": respuesta_texto})

    # ── 2. Guardar respuesta con el texto real de la pregunta ──
    respuesta_row = Respuesta(
        sesion_id=sesion_id,
        turno=turno_actual,
        pregunta_texto=pregunta_texto,
        tipo_pregunta=pregunta_tipo,
        opciones={
            "pregunta_id": pregunta_id,
            "opcion_ids": normalizada["opcion_ids"],
            "dimension": pregunta.get("dimension") if pregunta else None,
            "objetivo": pregunta.get("objetivo") if pregunta else None,
            "areas_en_conflicto": pregunta.get("areas_en_conflicto", []) if pregunta else [],
            "fuente_pregunta": pregunta.get("fuente") if pregunta else None,
            "pesos_aplicados": [
                {
                    "opcion_id": op.get("id"),
                    "pesos_area": op.get("pesos_area", {}),
                }
                for op in normalizada["opciones"]
            ],
            "texto_libre": normalizada.get("texto_libre"),
        },
        respuesta_dada=respuesta_texto,
    )
    db.add(respuesta_row)

    # ── 3. Actualizar perfil ──
    perfil = motor.actualizar_perfil(
        perfil,
        pregunta or {"texto": pregunta_texto, "tipo": pregunta_tipo},
        respuesta_texto,
        opcion_ids=normalizada["opcion_ids"],
        turno=turno_actual,
    )

    # ── 4. Decidir siguiente paso ──
    siguiente_turno = turno_actual + 1
    resultado = motor.siguiente_paso(perfil, historial, siguiente_turno)

    # ── 5. Persistir ──
    if resultado.get("es_recomendacion"):
        # Guardar texto de la próxima pregunta no aplica → limpiar clave interna
        sesion.perfil        = perfil
        sesion.turno_actual  = siguiente_turno
        sesion.estado        = "completado"
        sesion.completada_en = datetime.utcnow()

        recom_row = Recomendacion(
            sesion_id=sesion_id,
            carreras=resultado.get("carreras", []),
            resumen_perfil=resultado.get("resumen_perfil", ""),
        )
        db.add(recom_row)
        db.commit()

        return RecomendacionOutput(
            sesion_id=sesion_id,
            turno=siguiente_turno,
            es_recomendacion=True,
            carreras=resultado.get("carreras", []),
            resumen_perfil=resultado.get("resumen_perfil", ""),
            progreso=1.0,
            estado_parcial=motor.estado_parcial(perfil),
        )

    # Guardar texto de la siguiente pregunta en el perfil
    # para usarlo como fallback si el frontend no lo devuelve
    perfil["_ultima_pregunta"] = resultado.get("texto", "")
    perfil["_ultima_pregunta_id"] = resultado.get("pregunta_id")
    perfil["_ultimo_tipo"]     = resultado.get("tipo", "opciones")
    perfil["_ultima_dimension"] = resultado.get("dimension")
    perfil["_ultima_pregunta_obj"] = resultado

    sesion.perfil       = perfil
    sesion.turno_actual = siguiente_turno
    db.commit()

    return PreguntaOutput(
        sesion_id=sesion_id,
        turno=siguiente_turno,
        pregunta_id=resultado.get("pregunta_id"),
        texto=resultado.get("texto", ""),
        tipo=resultado.get("tipo", "opciones"),
        opciones=resultado.get("opciones", []),
        opciones_detalle=resultado.get("opciones_detalle", []),
        permite_texto_libre=resultado.get("permite_texto_libre", True),
        es_recomendacion=False,
        progreso=calcular_progreso(siguiente_turno),
        estado_parcial=motor.estado_parcial(perfil),
    )


@app.get("/sesion/{sesion_id}/estado", response_model=EstadoOutput)
def estado_sesion(
    sesion_id: int,
    usuario: Usuario = Depends(get_usuario_actual),
    db: Session      = Depends(get_db),
):
    sesion = db.query(SesionTest).filter(
        SesionTest.id == sesion_id,
        SesionTest.usuario_id == usuario.id,
    ).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    # Ocultar claves internas del perfil al frontend
    perfil = {k: v for k, v in (sesion.perfil or {}).items() if not k.startswith("_")}

    return EstadoOutput(
        sesion_id=sesion.id,
        estado=sesion.estado,
        turno_actual=sesion.turno_actual,
        perfil=perfil,
        progreso=calcular_progreso(sesion.turno_actual),
    )


@app.post("/sesion/{sesion_id}/reiniciar")
def reiniciar_sesion(
    sesion_id: int,
    usuario: Usuario = Depends(get_usuario_actual),
    db: Session      = Depends(get_db),
    motor: MotorTest = Depends(get_motor),
):
    sesion = db.query(SesionTest).filter(
        SesionTest.id == sesion_id,
        SesionTest.usuario_id == usuario.id,
    ).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    sesion.estado = "abandonado"
    db.commit()

    pregunta = motor.primera_pregunta()
    nueva = SesionTest(
        usuario_id=usuario.id,
        perfil={
            "_ultima_pregunta": pregunta["texto"],
            "_ultima_pregunta_id": pregunta.get("pregunta_id"),
            "_ultimo_tipo": pregunta["tipo"],
            "_ultima_dimension": pregunta.get("dimension"),
        },
        turno_actual=1,
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)

    return PreguntaOutput(
        sesion_id=nueva.id,
        turno=1,
        pregunta_id=pregunta.get("pregunta_id"),
        texto=pregunta["texto"],
        tipo=pregunta["tipo"],
        opciones=pregunta["opciones"],
        opciones_detalle=pregunta.get("opciones_detalle", []),
        permite_texto_libre=pregunta["permite_texto_libre"],
        es_recomendacion=False,
        progreso=calcular_progreso(1),
        estado_parcial=motor.estado_parcial(nueva.perfil),
    )


@app.get("/carreras")
def listar_carreras():
    """Lista todas las carreras indexadas en ChromaDB."""
    try:
        client = chromadb.PersistentClient(path=CHROMA_PATH)
        coleccion_usada = "carrera"
        try:
            col = client.get_collection("carrera")
        except Exception:
            coleccion_usada = "malla"
            col = client.get_collection("malla")
        metas  = col.get(include=["metadatas"])["metadatas"]
        carreras = sorted({
            m.get("carrera", "").strip()
            for m in metas
            if m.get("carrera", "").strip()
        })
        if not carreras and coleccion_usada != "malla":
            col = client.get_collection("malla")
            metas = col.get(include=["metadatas"])["metadatas"]
            carreras = sorted({
                m.get("carrera", "").strip()
                for m in metas
                if m.get("carrera", "").strip()
            })
            coleccion_usada = "malla"
        return {"carreras": carreras, "total": len(carreras), "coleccion": coleccion_usada}
    except Exception as e:
        logger.error("Error al listar carreras: %s", e)
        raise HTTPException(status_code=500, detail="No se pudo acceder a la base de conocimiento")


@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
