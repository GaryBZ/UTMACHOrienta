"""
db/models.py — Modelos SQLAlchemy para PostgreSQL.

Tablas:
  - usuarios       → credenciales básicas
  - sesiones_test  → cada vez que un usuario inicia el test
  - respuestas     → cada respuesta individual del estudiante
  - recomendaciones → resultado final por sesión
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float,
    DateTime, ForeignKey, JSON, Boolean, create_engine
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
import os

Base = declarative_base()


class Usuario(Base):
    __tablename__ = "usuarios"

    id            = Column(Integer, primary_key=True, index=True)
    nombre        = Column(String(100), nullable=False)
    email         = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    creado_en     = Column(DateTime, default=datetime.utcnow)
    activo        = Column(Boolean, default=True)

    sesiones      = relationship("SesionTest", back_populates="usuario")


class SesionTest(Base):
    __tablename__ = "sesiones_test"

    id              = Column(Integer, primary_key=True, index=True)
    usuario_id      = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    estado          = Column(String(20), default="en_progreso")
    # en_progreso | completado | abandonado
    perfil          = Column(JSON, default=dict)
    # perfil acumulado: intereses, habilidades, valores, etc.
    turno_actual    = Column(Integer, default=0)
    iniciada_en     = Column(DateTime, default=datetime.utcnow)
    completada_en   = Column(DateTime, nullable=True)

    usuario         = relationship("Usuario", back_populates="sesiones")
    respuestas      = relationship("Respuesta", back_populates="sesion")
    recomendacion   = relationship("Recomendacion", back_populates="sesion", uselist=False)


class Respuesta(Base):
    __tablename__ = "respuestas"

    id              = Column(Integer, primary_key=True, index=True)
    sesion_id       = Column(Integer, ForeignKey("sesiones_test.id"), nullable=False)
    turno           = Column(Integer, nullable=False)
    pregunta_texto  = Column(Text, nullable=False)
    tipo_pregunta   = Column(String(30), nullable=False)
    # opciones | escala | texto_libre | multiple
    opciones        = Column(JSON, nullable=True)   # opciones que se mostraron
    respuesta_dada  = Column(Text, nullable=False)  # lo que eligió/escribió
    respondida_en   = Column(DateTime, default=datetime.utcnow)

    sesion          = relationship("SesionTest", back_populates="respuestas")


class Recomendacion(Base):
    __tablename__ = "recomendaciones"

    id              = Column(Integer, primary_key=True, index=True)
    sesion_id       = Column(Integer, ForeignKey("sesiones_test.id"), unique=True, nullable=False)
    carreras        = Column(JSON, nullable=False)
    # [{"nombre": str, "puntaje": float, "justificacion": str}]
    resumen_perfil  = Column(Text, nullable=True)
    generada_en     = Column(DateTime, default=datetime.utcnow)

    sesion          = relationship("SesionTest", back_populates="recomendacion")


# ── Conexión ─────────────────────────────────────────────────────────

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://utmach:utmach123@localhost:5432/utmachorienta"
)

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def crear_tablas():
    """Crea todas las tablas si no existen."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency de FastAPI para inyectar sesión de BD."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()