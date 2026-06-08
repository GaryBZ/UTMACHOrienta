"""
chunker.py — Divide documentos en chunks semánticos con metadatos heredados.

Estrategias por tipo de documento:
  - vocacional → chunks medianos (512 tokens), overlap alto (100)
                 para capturar contexto teórico completo
  - test       → chunks pequeños (256 tokens), overlap bajo (30)
                 cada pregunta/ítem debe quedar en su propio chunk
  - malla      → chunks grandes (768 tokens), overlap medio (80)
                 una asignatura con sus créditos no debe partirse

Uso rápido:
    from ingesta.chunker import chunkear_documento, chunkear_documentos

    doc = cargar_pdf("data/raw/vocacional/articulo.pdf", tipo_doc="vocacional")
    chunks = chunkear_documento(doc)
    # → lista de dicts con 'texto', 'metadatos', 'chunk_id'
"""

import re
import hashlib
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# Configuración por tipo de documento
# ─────────────────────────────────────────────

ESTRATEGIAS = {
    "vocacional": {
        "chunk_size": 512,
        "chunk_overlap": 100,
        "separadores": ["\n\n", "\n", ". ", "? ", "! ", " "],
        "descripcion": "Artículos y teorías vocacionales",
    },
    "test": {
        "chunk_size": 256,
        "chunk_overlap": 30,
        "separadores": ["\n\n", "\n", ". ", " "],
        "descripcion": "Tests e instrumentos vocacionales",
    },
    "malla": {
        "chunk_size": 768,
        "chunk_overlap": 80,
        "separadores": ["\n\n\n", "\n\n", "\n", ". ", " "],
        "descripcion": "Mallas curriculares",
    },
}

DEFAULT_ESTRATEGIA = ESTRATEGIAS["vocacional"]


# ─────────────────────────────────────────────
# Splitter propio (sin depender de LangChain en runtime)
# ─────────────────────────────────────────────
# Se usa LangChain si está instalado; si no, un splitter propio liviano.

def _obtener_splitter(chunk_size: int, chunk_overlap: int, separadores: list[str]):
    """
    Intenta usar LangChain RecursiveCharacterTextSplitter.
    Si no está disponible, usa el splitter propio.
    """
    try:
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        return RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=separadores,
            length_function=len,
            is_separator_regex=False,
        )
    except ImportError:
        logger.debug("LangChain no disponible; usando splitter propio.")
        return _SplitterPropio(chunk_size, chunk_overlap, separadores)


class _SplitterPropio:
    """
    Splitter recursivo mínimo que imita el comportamiento de LangChain
    sin necesitar instalación extra.
    """

    def __init__(self, chunk_size: int, chunk_overlap: int, separadores: list[str]):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separadores = separadores

    def split_text(self, texto: str) -> list[str]:
        # Intentar separadores en orden hasta que los chunks sean manejables
        for sep in self.separadores:
            partes = texto.split(sep)
            chunks = self._merge(partes, sep)
            if all(len(c) <= self.chunk_size * 1.2 for c in chunks):
                return chunks
        # Último recurso: corte por longitud
        return self._corte_forzado(texto)

    def _merge(self, partes: list[str], sep: str) -> list[str]:
        chunks, actual = [], ""
        for parte in partes:
            if len(actual) + len(parte) + len(sep) <= self.chunk_size:
                actual = actual + (sep if actual else "") + parte
            else:
                if actual:
                    chunks.append(actual.strip())
                actual = parte
        if actual:
            chunks.append(actual.strip())

        # Aplicar overlap: inicio de chunk N = final de chunk N-1
        if self.chunk_overlap <= 0 or len(chunks) <= 1:
            return [c for c in chunks if c]

        resultado = [chunks[0]]
        for chunk in chunks[1:]:
            overlap_texto = resultado[-1][-self.chunk_overlap :]
            resultado.append((overlap_texto + " " + chunk).strip())
        return [c for c in resultado if c]

    def _corte_forzado(self, texto: str) -> list[str]:
        chunks = []
        inicio = 0
        while inicio < len(texto):
            fin = inicio + self.chunk_size
            chunks.append(texto[inicio:fin].strip())
            inicio = fin - self.chunk_overlap
        return [c for c in chunks if c]


# ─────────────────────────────────────────────
# Generación de chunk_id determinístico
# ─────────────────────────────────────────────

def _generar_chunk_id(nombre_archivo: str, indice: int, texto: str) -> str:
    """
    ID estable basado en nombre de archivo + índice + hash del contenido.
    Permite detectar si un chunk ya fue indexado (útil para actualizaciones).
    """
    hash_contenido = hashlib.md5(texto.encode()).hexdigest()[:8]
    nombre_limpio = re.sub(r"[^a-zA-Z0-9_\-]", "_", nombre_archivo)
    return f"{nombre_limpio}__chunk{indice:04d}__{hash_contenido}"


# ─────────────────────────────────────────────
# Detección de ruido en chunks
# ─────────────────────────────────────────────

def _es_chunk_util(texto: str, min_palabras: int = 15) -> bool:
    """
    Descarta chunks que son encabezados de página, números solos,
    o texto demasiado corto para aportar contexto.
    """
    palabras = texto.split()
    if len(palabras) < min_palabras:
        return False
    # Chunk con más del 40% de tokens numéricos → probablemente tabla de créditos sin contexto
    tokens_numericos = sum(1 for p in palabras if re.match(r"^[\d.,\-]+$", p))
    if tokens_numericos / len(palabras) > 0.4:
        return False
    return True


# ─────────────────────────────────────────────
# Función principal: chunkear un documento
# ─────────────────────────────────────────────

def chunkear_documento(
    documento: dict,
    chunk_size: Optional[int] = None,
    chunk_overlap: Optional[int] = None,
    filtrar_ruido: bool = True,
) -> list[dict]:
    """
    Divide el texto de un documento en chunks semánticos.

    Args:
        documento:      Dict retornado por loader.cargar_pdf().
        chunk_size:     Sobrescribe el tamaño de chunk para este documento.
        chunk_overlap:  Sobrescribe el overlap.
        filtrar_ruido:  Si True, descarta chunks demasiado cortos o numéricos.

    Returns:
        Lista de dicts, cada uno con:
          {
            "chunk_id":  str  — ID único y estable,
            "texto":     str  — contenido del chunk,
            "metadatos": dict — metadatos del doc + posición del chunk,
          }
    """
    if not documento.get("ok"):
        logger.warning("Documento con error omitido: %s", documento.get("ruta"))
        return []

    texto = documento["texto"]
    metadatos_doc = documento["metadatos"]
    tipo_doc = metadatos_doc.get("tipo_doc", "vocacional")

    estrategia = ESTRATEGIAS.get(tipo_doc, DEFAULT_ESTRATEGIA)
    cs = chunk_size or estrategia["chunk_size"]
    co = chunk_overlap or estrategia["chunk_overlap"]
    seps = estrategia["separadores"]

    splitter = _obtener_splitter(cs, co, seps)
    fragmentos_raw = splitter.split_text(texto)

    chunks = []
    for i, fragmento in enumerate(fragmentos_raw):
        fragmento = fragmento.strip()
        if not fragmento:
            continue
        if filtrar_ruido and not _es_chunk_util(fragmento):
            logger.debug("Chunk ruidoso descartado (doc=%s, idx=%d).", metadatos_doc["nombre_archivo"], i)
            continue

        chunk_id = _generar_chunk_id(metadatos_doc["nombre_archivo"], i, fragmento)

        # Metadatos del chunk = metadatos del doc + posición
        metadatos_chunk = {
            **metadatos_doc,
            "chunk_index": i,
            "chunk_total": len(fragmentos_raw),
            "chunk_size_config": cs,
            "chunk_chars": len(fragmento),
        }

        chunks.append({
            "chunk_id": chunk_id,
            "texto": fragmento,
            "metadatos": metadatos_chunk,
        })

    logger.info(
        "✓ Chunkeado: %s | %d chunks (tipo=%s, cs=%d, co=%d)",
        metadatos_doc["nombre_archivo"],
        len(chunks),
        tipo_doc,
        cs,
        co,
    )
    return chunks


# ─────────────────────────────────────────────
# Carga masiva de documentos
# ─────────────────────────────────────────────

def chunkear_documentos(
    documentos: list[dict],
    filtrar_ruido: bool = True,
) -> list[dict]:
    """
    Chunkea una lista de documentos (salida de loader.cargar_directorio).

    Args:
        documentos:    Lista de dicts de loader.
        filtrar_ruido: Pasa el flag a cada llamada individual.

    Returns:
        Lista plana de todos los chunks de todos los documentos.
    """
    todos_los_chunks = []
    for doc in documentos:
        chunks = chunkear_documento(doc, filtrar_ruido=filtrar_ruido)
        todos_los_chunks.extend(chunks)

    logger.info(
        "Total chunks generados: %d (de %d documentos).",
        len(todos_los_chunks),
        len(documentos),
    )
    return todos_los_chunks
