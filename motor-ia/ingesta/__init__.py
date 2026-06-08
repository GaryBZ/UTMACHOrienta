"""
Paquete de ingesta para el motor RAG de UTMACHOrienta.

from ingesta import cargar_pdf, chunkear_documento, Indexer
"""

from ingesta.loader import cargar_pdf, cargar_directorio
from ingesta.chunker import chunkear_documento, chunkear_documentos
from ingesta.indexer import Indexer

__all__ = [
    "cargar_pdf",
    "cargar_directorio",
    "chunkear_documento",
    "chunkear_documentos",
    "Indexer",
]
