"""
Paquete de ingesta para el motor RAG de UTMACHOrienta.

from ingesta import cargar_pdf, chunkear_documento, Indexer
"""

from ingesta.knowledge_loader import cargar_knowledge_dir, cargar_json_curado, cargar_markdown_curado
from ingesta.chunker import chunkear_documento, chunkear_documentos
from ingesta.indexer import Indexer

try:
    from ingesta.loader import cargar_pdf, cargar_directorio
except ModuleNotFoundError as exc:
    def cargar_pdf(*args, **kwargs):
        raise RuntimeError("Instala dependencias de PDF: pip install pdfplumber pypdf") from exc

    def cargar_directorio(*args, **kwargs):
        raise RuntimeError("Instala dependencias de PDF: pip install pdfplumber pypdf") from exc

__all__ = [
    "cargar_pdf",
    "cargar_directorio",
    "cargar_knowledge_dir",
    "cargar_json_curado",
    "cargar_markdown_curado",
    "chunkear_documento",
    "chunkear_documentos",
    "Indexer",
]
