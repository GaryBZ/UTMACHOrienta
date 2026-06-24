"""Configuracion compartida para Motor IA.

Los defaults permiten desarrollo local sin archivo .env; en produccion deben
sobrescribirse con variables de entorno.
"""

from __future__ import annotations

import os


def _getenv(name: str, default: str) -> str:
    value = os.getenv(name)
    return value.strip() if value and value.strip() else default


def get_cors_origins() -> list[str]:
    raw = _getenv("CORS_ORIGINS", "*")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


JWT_SECRET_KEY = _getenv("JWT_SECRET_KEY", "cambia_esto_en_produccion_usa_variable_de_entorno")
LMSTUDIO_URL = _getenv("LMSTUDIO_URL", "http://localhost:1234/v1")
EMBEDDING_MODEL = _getenv("EMBEDDING_MODEL", "text-embedding-baai-bge-m3-568m")
LLM_MODEL = _getenv("LLM_MODEL", "bartowski/meta-llama-3.1-8b-instruct")
CHROMA_PATH = _getenv("CHROMA_PATH", "./data/chroma_db")
