"""
retrieval/retriever.py — Recupera chunks relevantes desde ChromaDB.

Convierte la consulta del usuario en un embedding (vía LM Studio),
busca los chunks más similares en la colección correspondiente,
y los retorna listos para ser usados como contexto del LLM.

Uso:
    from retrieval.retriever import Retriever

    ret = Retriever()
    chunks = ret.buscar("¿Qué carreras son buenas para alguien analítico?")
    chunks = ret.buscar("materias de Ingeniería Civil", coleccion="malla", top_k=5)
"""

import logging
from typing import Optional

from settings import CHROMA_PATH, EMBEDDING_MODEL, LMSTUDIO_URL

logger = logging.getLogger(__name__)

LMSTUDIO_BASE_URL  = LMSTUDIO_URL

COLECCIONES_VALIDAS = {"vocacional", "test", "malla", "carrera"}
TOP_K_DEFAULT       = 4


class Retriever:
    """
    Busca chunks relevantes en ChromaDB usando embeddings de LM Studio.

    Args:
        lmstudio_url:    URL base de la API de LM Studio.
        embedding_model: Nombre del modelo de embeddings cargado en LM Studio.
        chroma_path:     Ruta donde está persistida la base ChromaDB.
    """

    def __init__(
        self,
        lmstudio_url: str = LMSTUDIO_BASE_URL,
        embedding_model: str = EMBEDDING_MODEL,
        chroma_path: str = CHROMA_PATH,
    ):
        self.embedding_model = embedding_model
        self._lm_client      = self._init_lm(lmstudio_url)
        self._chroma_client  = self._init_chroma(chroma_path)
        self._colecciones: dict = {}

    # ── Inicialización ───────────────────────────────────────────────

    def _init_lm(self, base_url: str):
        try:
            from openai import OpenAI
            return OpenAI(base_url=base_url, api_key="lm-studio")
        except ImportError:
            raise RuntimeError("Instala openai: pip install openai")

    def _init_chroma(self, path: str):
        try:
            import chromadb
            return chromadb.PersistentClient(path=path)
        except ImportError:
            raise RuntimeError("Instala chromadb: pip install chromadb")

    def _get_coleccion(self, nombre: str):
        if nombre not in self._colecciones:
            self._colecciones[nombre] = self._chroma_client.get_collection(nombre)
        return self._colecciones[nombre]

    # ── Embedding de la consulta ─────────────────────────────────────

    def _embed(self, texto: str) -> list[float]:
        respuesta = self._lm_client.embeddings.create(
            model=self.embedding_model,
            input=[texto],
        )
        return respuesta.data[0].embedding

    # ── Búsqueda principal ───────────────────────────────────────────

    def buscar(
        self,
        consulta: str,
        coleccion: str = "vocacional",
        top_k: int = TOP_K_DEFAULT,
        filtro_meta: Optional[dict] = None,
    ) -> list[dict]:
        """
        Busca los chunks más relevantes para una consulta.

        Args:
            consulta:    Texto libre de la pregunta o contexto del estudiante.
            coleccion:   "vocacional" | "test" | "malla" | "carrera"
            top_k:       Cuántos chunks retornar.
            filtro_meta: Filtro adicional de metadatos ChromaDB.
                         Ej: {"carrera": "ingenieria sistemas"}

        Returns:
            Lista de dicts ordenados por relevancia:
            [{"texto": str, "metadatos": dict, "distancia": float}, ...]
        """
        if coleccion not in COLECCIONES_VALIDAS:
            logger.warning("Colección '%s' no válida. Usando 'vocacional'.", coleccion)
            coleccion = "vocacional"

        vector = self._embed(consulta)

        kwargs = dict(
            query_embeddings=[vector],
            n_results=top_k,
            include=["documents", "metadatas", "distances"],
        )
        if filtro_meta:
            kwargs["where"] = filtro_meta

        col  = self._get_coleccion(coleccion)
        resp = col.query(**kwargs)

        resultados = []
        for texto, meta, dist in zip(
            resp["documents"][0],
            resp["metadatas"][0],
            resp["distances"][0],
        ):
            resultados.append({
                "texto":     texto,
                "metadatos": meta,
                "distancia": round(dist, 4),
            })

        logger.info(
            "Búsqueda en '%s': %d chunks recuperados (consulta: '%s...')",
            coleccion, len(resultados), consulta[:50],
        )
        return resultados

    def buscar_multi(
        self,
        consulta: str,
        colecciones: Optional[list[str]] = None,
        top_k_por_coleccion: int = 3,
    ) -> list[dict]:
        """
        Busca en múltiples colecciones y retorna resultados mezclados,
        ordenados por distancia (menor = más relevante).

        Útil para preguntas que tocan tanto teoría vocacional como mallas.
        """
        colecciones = colecciones or ["vocacional", "carrera", "malla"]
        todos = []
        for col in colecciones:
            try:
                chunks = self.buscar(consulta, coleccion=col, top_k=top_k_por_coleccion)
                for c in chunks:
                    c["coleccion"] = col
                todos.extend(chunks)
            except Exception as exc:
                logger.warning("Error buscando en '%s': %s", col, exc)

        todos.sort(key=lambda x: x["distancia"])
        return todos
