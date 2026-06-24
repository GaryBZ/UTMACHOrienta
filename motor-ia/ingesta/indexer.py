"""
indexer.py — Genera embeddings vía LM Studio y persiste chunks en ChromaDB.

Colecciones ChromaDB:
  - vocacional  → artículos y teorías
  - test        → tests e instrumentos
  - malla       → mallas curriculares
  - carrera     → fichas, perfiles y mapas de carreras

LM Studio expone una API OpenAI-compatible en localhost:1234.
El modelo de embeddings debe estar cargado en LM Studio antes de correr esto.

Uso rápido:
    from ingesta.indexer import Indexer

    idx = Indexer()                       # conecta a LM Studio + ChromaDB
    idx.indexar_chunks(chunks)            # indexa lista de chunks
    idx.indexar_pdf("data/raw/vocacional/articulo.pdf")   # shortcut todo-en-uno
    idx.indexar_directorio("data/raw/")   # indexa toda la carpeta

    # Ver estadísticas
    idx.estadisticas()
"""

import logging
import time
from pathlib import Path
from typing import Optional

from settings import CHROMA_PATH, EMBEDDING_MODEL, LMSTUDIO_URL

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# Configuración
# ─────────────────────────────────────────────

LMSTUDIO_BASE_URL = LMSTUDIO_URL

COLECCIONES = {
    "vocacional": "vocacional",
    "test": "test",
    "malla": "malla",
    "carrera": "carrera",
}

BATCH_SIZE = 32        # chunks por request de embedding (no saturar la VRAM del B580)
MAX_REINTENTOS = 3     # reintentos por batch si el servidor falla
PAUSA_ENTRE_BATCHES = 0.2  # segundos entre batches (evita throttling)


# ─────────────────────────────────────────────
# Cliente de embeddings (LM Studio)
# ─────────────────────────────────────────────

class ClienteEmbeddings:
    """
    Wrapper sobre la API OpenAI-compatible de LM Studio para embeddings.
    No depende de openai>=1.0 instalado; usa httpx o requests como fallback.
    """

    def __init__(self, base_url: str = LMSTUDIO_BASE_URL, modelo: str = EMBEDDING_MODEL):
        self.base_url = base_url.rstrip("/")
        self.modelo = modelo
        self._cliente = self._inicializar_cliente()

    def _inicializar_cliente(self):
        """Intenta openai primero, luego requests como fallback."""
        try:
            from openai import OpenAI
            cliente = OpenAI(base_url=self.base_url, api_key="lm-studio")
            logger.info("Cliente OpenAI SDK inicializado → %s", self.base_url)
            return ("openai", cliente)
        except ImportError:
            try:
                import requests
                logger.info("openai SDK no disponible. Usando requests → %s", self.base_url)
                return ("requests", requests)
            except ImportError:
                raise RuntimeError(
                    "Necesitas instalar 'openai' o 'requests':\n"
                    "  pip install openai"
                )

    def embeddings(self, textos: list[str]) -> list[list[float]]:
        """Genera embeddings para una lista de textos. Retorna lista de vectores."""
        tipo, cliente = self._cliente

        if tipo == "openai":
            respuesta = cliente.embeddings.create(model=self.modelo, input=textos)
            return [item.embedding for item in respuesta.data]

        elif tipo == "requests":
            import requests as req
            respuesta = req.post(
                f"{self.base_url}/embeddings",
                json={"model": self.modelo, "input": textos},
                headers={"Content-Type": "application/json"},
                timeout=120,
            )
            respuesta.raise_for_status()
            datos = respuesta.json()
            return [item["embedding"] for item in datos["data"]]

        raise RuntimeError("Cliente de embeddings no inicializado correctamente.")

    def verificar_conexion(self) -> bool:
        """Comprueba que LM Studio esté respondiendo."""
        try:
            self.embeddings(["test de conexión"])
            logger.info("✓ Conexión con LM Studio OK")
            return True
        except Exception as exc:
            logger.error("✗ No se pudo conectar con LM Studio: %s", exc)
            return False


# ─────────────────────────────────────────────
# Cliente ChromaDB
# ─────────────────────────────────────────────

class ClienteChroma:
    """Maneja las tres colecciones ChromaDB del motor."""

    def __init__(self, ruta: str = CHROMA_PATH):
        try:
            import chromadb
        except ImportError:
            raise RuntimeError(
                "ChromaDB no está instalado.\n"
                "  pip install chromadb"
            )
        self.cliente = chromadb.PersistentClient(path=ruta)
        self._colecciones: dict = {}
        logger.info("ChromaDB inicializado en '%s'.", ruta)

    def obtener_coleccion(self, nombre: str):
        """Obtiene o crea una colección por nombre."""
        if nombre not in self._colecciones:
            # get_or_create evita error si ya existe
            col = self.cliente.get_or_create_collection(
                name=nombre,
                metadata={"hnsw:space": "cosine"},
            )
            self._colecciones[nombre] = col
            logger.debug("Colección '%s' lista (%d docs existentes).", nombre, col.count())
        return self._colecciones[nombre]

    def chunk_ya_indexado(self, coleccion_nombre: str, chunk_id: str) -> bool:
        """Evita re-indexar chunks idénticos (útil en re-ingestas parciales)."""
        col = self.obtener_coleccion(coleccion_nombre)
        resultado = col.get(ids=[chunk_id])
        return len(resultado["ids"]) > 0

    def insertar(
        self,
        coleccion_nombre: str,
        ids: list[str],
        embeddings: list[list[float]],
        textos: list[str],
        metadatos: list[dict],
    ):
        col = self.obtener_coleccion(coleccion_nombre)
        col.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=textos,
            metadatas=metadatos,
        )

    def estadisticas(self) -> dict:
        stats = {}
        for nombre in COLECCIONES.values():
            try:
                col = self.obtener_coleccion(nombre)
                stats[nombre] = col.count()
            except Exception:
                stats[nombre] = 0
        return stats


# ─────────────────────────────────────────────
# Indexer principal
# ─────────────────────────────────────────────

class Indexer:
    """
    Orquesta la generación de embeddings y la persistencia en ChromaDB.

    Ejemplo completo:
        idx = Indexer()
        idx.indexar_directorio("data/raw/")
        print(idx.estadisticas())
    """

    def __init__(
        self,
        lmstudio_url: str = LMSTUDIO_BASE_URL,
        embedding_model: str = EMBEDDING_MODEL,
        chroma_path: str = CHROMA_PATH,
    ):
        self.embeddings_client = ClienteEmbeddings(lmstudio_url, embedding_model)
        self.chroma = ClienteChroma(chroma_path)

    def verificar(self) -> bool:
        """Verifica que LM Studio y ChromaDB están operativos."""
        return self.embeddings_client.verificar_conexion()

    # ── Indexar lista de chunks ──────────────────────────────────────

    def indexar_chunks(
        self,
        chunks: list[dict],
        omitir_duplicados: bool = True,
        verbose: bool = True,
    ) -> dict:
        """
        Indexa una lista de chunks (salida de chunker.chunkear_documentos).

        Args:
            chunks:            Lista de dicts con 'chunk_id', 'texto', 'metadatos'.
            omitir_duplicados: Si True, salta chunks cuyo chunk_id ya existe en Chroma.
            verbose:           Muestra progreso por consola.

        Returns:
            {"indexados": int, "omitidos": int, "errores": int}
        """
        indexados = 0
        omitidos = 0
        errores = 0

        # Agrupar por colección (tipo_doc)
        por_coleccion: dict[str, list[dict]] = {}
        for chunk in chunks:
            tipo = chunk["metadatos"].get("tipo_doc", "vocacional")
            coleccion = COLECCIONES.get(tipo, "vocacional")
            por_coleccion.setdefault(coleccion, []).append(chunk)

        for coleccion_nombre, lista_chunks in por_coleccion.items():
            if verbose:
                logger.info(
                    "Indexando colección '%s': %d chunks...",
                    coleccion_nombre,
                    len(lista_chunks),
                )

            # Filtrar duplicados si corresponde
            if omitir_duplicados:
                pendientes = [
                    c for c in lista_chunks
                    if not self.chroma.chunk_ya_indexado(coleccion_nombre, c["chunk_id"])
                ]
                omitidos += len(lista_chunks) - len(pendientes)
            else:
                pendientes = lista_chunks

            if not pendientes:
                logger.info("  Sin chunks nuevos en '%s'.", coleccion_nombre)
                continue

            # Procesar en batches
            for i in range(0, len(pendientes), BATCH_SIZE):
                batch = pendientes[i : i + BATCH_SIZE]
                ids = [c["chunk_id"] for c in batch]
                textos = [c["texto"] for c in batch]
                metas = [self._sanitizar_metadatos(c["metadatos"]) for c in batch]

                for intento in range(1, MAX_REINTENTOS + 1):
                    try:
                        vecs = self.embeddings_client.embeddings(textos)
                        self.chroma.insertar(coleccion_nombre, ids, vecs, textos, metas)
                        indexados += len(batch)
                        if verbose:
                            logger.info(
                                "  Batch %d/%d → %d chunks indexados",
                                i // BATCH_SIZE + 1,
                                -(-len(pendientes) // BATCH_SIZE),
                                len(batch),
                            )
                        time.sleep(PAUSA_ENTRE_BATCHES)
                        break
                    except Exception as exc:
                        logger.warning("  Intento %d/%d falló: %s", intento, MAX_REINTENTOS, exc)
                        if intento == MAX_REINTENTOS:
                            errores += len(batch)
                            logger.error("  Batch descartado después de %d intentos.", MAX_REINTENTOS)
                        else:
                            time.sleep(1.5 * intento)

        logger.info(
            "Ingesta finalizada: %d indexados | %d omitidos | %d errores",
            indexados, omitidos, errores,
        )
        return {"indexados": indexados, "omitidos": omitidos, "errores": errores}

    # ── Shortcuts ────────────────────────────────────────────────────

    def indexar_pdf(
        self,
        ruta: str | Path,
        tipo_doc: Optional[str] = None,
        carrera: Optional[str] = None,
        fuente: Optional[str] = None,
    ) -> dict:
        """
        Shortcut: carga un PDF, lo chunkea y lo indexa en un solo paso.

        Returns:
            Dict con estadísticas {"indexados", "omitidos", "errores"} +
            "chunks_generados" y "paginas".
        """
        from ingesta.loader import cargar_pdf
        from ingesta.chunker import chunkear_documento

        doc = cargar_pdf(ruta, tipo_doc=tipo_doc, carrera=carrera, fuente=fuente)
        if not doc["ok"]:
            logger.error("No se pudo cargar '%s': %s", ruta, doc["error"])
            return {"indexados": 0, "omitidos": 0, "errores": 1, "chunks_generados": 0}

        chunks = chunkear_documento(doc)
        stats = self.indexar_chunks(chunks)
        stats["chunks_generados"] = len(chunks)
        stats["paginas"] = doc["paginas"]
        return stats

    def indexar_directorio(self, directorio: str | Path) -> dict:
        """
        Shortcut: carga todos los PDFs de un directorio, los chunkea e indexa.

        Returns:
            Dict acumulado con estadísticas totales.
        """
        from ingesta.loader import cargar_directorio
        from ingesta.chunker import chunkear_documentos

        docs = cargar_directorio(directorio)
        chunks = chunkear_documentos(docs)
        stats = self.indexar_chunks(chunks)
        stats["pdfs_procesados"] = len(docs)
        stats["chunks_generados"] = len(chunks)
        return stats

    def indexar_knowledge(self, directorio: str | Path = "data/knowledge") -> dict:
        """
        Indexa la base de conocimiento curada JSON/Markdown.

        Returns:
            Dict acumulado con estadísticas totales.
        """
        from ingesta.knowledge_loader import cargar_knowledge_dir
        from ingesta.chunker import chunkear_documentos

        docs = cargar_knowledge_dir(directorio)
        chunks = chunkear_documentos(docs)
        stats = self.indexar_chunks(chunks)
        stats["documentos_procesados"] = len(docs)
        stats["chunks_generados"] = len(chunks)
        return stats

    # ── Utilidades ───────────────────────────────────────────────────

    def estadisticas(self) -> dict:
        """Retorna conteo de documentos por colección en ChromaDB."""
        stats = self.chroma.estadisticas()
        total = sum(stats.values())
        logger.info(
            "ChromaDB — vocacional: %d | test: %d | malla: %d | carrera: %d | total: %d",
            stats.get("vocacional", 0),
            stats.get("test", 0),
            stats.get("malla", 0),
            stats.get("carrera", 0),
            total,
        )
        return stats

    def eliminar_documento(self, nombre_archivo: str):
        """
        Elimina todos los chunks de un documento específico (por nombre de archivo).
        Útil para re-indexar un PDF actualizado.
        """
        for coleccion_nombre in COLECCIONES.values():
            col = self.chroma.obtener_coleccion(coleccion_nombre)
            resultado = col.get(where={"nombre_archivo": nombre_archivo})
            if resultado["ids"]:
                col.delete(ids=resultado["ids"])
                logger.info(
                    "Eliminados %d chunks de '%s' en colección '%s'.",
                    len(resultado["ids"]),
                    nombre_archivo,
                    coleccion_nombre,
                )

    @staticmethod
    def _sanitizar_metadatos(meta: dict) -> dict:
        """
        ChromaDB solo acepta str, int, float, bool en metadatos.
        Convierte el resto a str para evitar errores de tipo.
        """
        sanitizado = {}
        for k, v in meta.items():
            if isinstance(v, (str, int, float, bool)):
                sanitizado[k] = v
            else:
                sanitizado[k] = str(v)
        return sanitizado
