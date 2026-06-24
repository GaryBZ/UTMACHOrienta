"""
pipeline/rag_chain.py — Orquesta el pipeline RAG completo.

Conecta Retriever + LLMClient y mantiene el estado de sesión
(historial de conversación y perfil acumulado del estudiante).

Uso básico:
    from pipeline.rag_chain import RAGChain

    rag = RAGChain()
    respuesta = rag.chat("Me gustan las matemáticas y la programación")
    print(respuesta)

    # Continuar la conversación (el historial se mantiene automáticamente)
    respuesta = rag.chat("¿Qué materias tiene esa carrera?")
    print(respuesta)

    # Ver el perfil acumulado del estudiante
    print(rag.perfil)

    # Reiniciar sesión para un nuevo estudiante
    rag.nueva_sesion()
"""

import logging
import sys
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from retrieval.retriever import Retriever
from llm.lmstudio_client import LLMClient
from settings import CHROMA_PATH, EMBEDDING_MODEL, LLM_MODEL, LMSTUDIO_URL

logger = logging.getLogger(__name__)

# Cuántos chunks pasar al LLM por llamada
TOP_K_VOCACIONAL = 4
TOP_K_MALLA      = 3
TOP_K_CARRERA    = 4


class RAGChain:
    """
    Pipeline RAG completo con memoria de sesión.

    Mantiene:
    - historial: lista de turnos {rol, contenido}
    - perfil:    dict con datos acumulados del estudiante
                 (intereses, habilidades, carrera candidata, etc.)

    Args:
        lmstudio_url:    URL de LM Studio.
        embedding_model: Modelo de embeddings (debe coincidir con la ingesta).
        llm_model:       Modelo LLM cargado en LM Studio.
        chroma_path:     Ruta de ChromaDB.
        max_historial:   Máximo de turnos a mantener en contexto (evita crecer indefinidamente).
    """

    def __init__(
        self,
        lmstudio_url: str    = LMSTUDIO_URL,
        embedding_model: str = EMBEDDING_MODEL,
        llm_model: str       = LLM_MODEL,
        chroma_path: str     = CHROMA_PATH,
        max_historial: int   = 10,
    ):
        self.max_historial = max_historial

        self.retriever = Retriever(
            lmstudio_url=lmstudio_url,
            embedding_model=embedding_model,
            chroma_path=chroma_path,
        )
        self.llm = LLMClient(
            base_url=lmstudio_url,
            model=llm_model,
        )

        self._historial: list[dict] = []
        self._perfil: dict          = {}

        logger.info("RAGChain inicializado.")

    # ── Propiedades públicas ─────────────────────────────────────────

    @property
    def historial(self) -> list[dict]:
        return self._historial.copy()

    @property
    def perfil(self) -> dict:
        return self._perfil.copy()

    # ── Sesión ───────────────────────────────────────────────────────

    def nueva_sesion(self):
        """Reinicia historial y perfil para atender a un nuevo estudiante."""
        self._historial = []
        self._perfil    = {}
        logger.info("Nueva sesión iniciada.")

    # ── Lógica de routing ────────────────────────────────────────────

    def _decidir_colecciones(self, mensaje: str) -> list[str]:
        """
        Decide en qué colecciones buscar según el contenido del mensaje.
        Heurística simple basada en palabras clave.
        """
        msg = mensaje.lower()

        keywords_carrera = {
            "carrera", "carreras", "recomienda", "recomendar", "estudiar",
            "perfil", "egreso", "ingreso", "campo laboral", "ocupacional",
            "facultad", "titulo", "título", "modalidad", "duracion", "duración",
            "ingeniería", "medicina", "derecho", "administración", "economía",
            "datos", "programación", "salud", "educación", "turismo",
        }
        keywords_malla = {
            "malla", "materias", "asignatura", "asignaturas", "currículo",
            "curriculo", "pensum", "semestre", "semestres", "créditos",
            "creditos", "curso", "cursos",
        }
        keywords_vocacional = {
            "test", "prueba", "cuestionario", "holland", "riasec",
            "intereses", "aptitud", "habilidad", "habilidades", "valores",
            "vocacional", "orientación", "orientacion",
        }

        colecciones = ["vocacional", "carrera"]

        if any(k in msg for k in keywords_malla):
            colecciones.append("malla")
        if any(k in msg for k in keywords_carrera) and "carrera" not in colecciones:
            colecciones.append("carrera")
        if any(k in msg for k in keywords_vocacional) and "vocacional" not in colecciones:
            colecciones.append("vocacional")

        return colecciones

    def _construir_consulta(self, mensaje: str) -> str:
        """
        Enriquece la consulta con el perfil acumulado del estudiante
        para mejorar la relevancia del retrieval.
        """
        if not self._perfil:
            return mensaje

        contexto_perfil = []
        if self._perfil.get("intereses"):
            contexto_perfil.append(f"intereses: {', '.join(self._perfil['intereses'])}")
        if self._perfil.get("carrera_candidata"):
            contexto_perfil.append(f"carrera considerada: {self._perfil['carrera_candidata']}")

        if contexto_perfil:
            return f"{mensaje} [{'; '.join(contexto_perfil)}]"
        return mensaje

    def _actualizar_perfil(self, mensaje: str, respuesta: str):
        """
        Extrae información básica del perfil del estudiante desde el mensaje.
        Versión simple basada en keywords; en fases futuras se puede
        reemplazar por extracción con el LLM.
        """
        msg = mensaje.lower()

        # Acumular intereses mencionados
        areas = {
            "matemáticas": "matemáticas",
            "programación": "tecnología",
            "computación": "tecnología",
            "sistemas": "tecnología",
            "biología": "ciencias naturales",
            "química": "ciencias naturales",
            "arte": "artes",
            "diseño": "artes/diseño",
            "economía": "economía/negocios",
            "negocios": "economía/negocios",
            "derecho": "ciencias sociales/derecho",
            "medicina": "salud",
            "salud": "salud",
            "ingeniería": "ingeniería",
            "arquitectura": "arquitectura",
            "letras": "humanidades",
            "historia": "humanidades",
        }
        intereses = self._perfil.get("intereses", [])
        for kw, area in areas.items():
            if kw in msg and area not in intereses:
                intereses.append(area)
        if intereses:
            self._perfil["intereses"] = intereses

        # Detectar si el LLM recomendó una carrera concreta
        keywords_recomendacion = [
            "te recomiendo", "podrías estudiar", "carrera ideal",
            "sería", "encaja con", "considerar"
        ]
        if any(k in respuesta.lower() for k in keywords_recomendacion):
            # Guardar un flag para saber que ya se emitió una recomendación
            self._perfil["recomendacion_emitida"] = True

    # ── Chat principal ───────────────────────────────────────────────

    def chat(
        self,
        mensaje: str,
        colecciones: Optional[list[str]] = None,
        top_k: Optional[int] = None,
    ) -> str:
        """
        Punto de entrada principal. Recibe un mensaje del estudiante
        y retorna la respuesta del asistente.

        Args:
            mensaje:     Texto del estudiante.
            colecciones: Forzar colecciones específicas (opcional).
                         Si None, se infiere automáticamente.
            top_k:       Número de chunks a recuperar (opcional).

        Returns:
            Respuesta del asistente como string.
        """
        # 1. Decidir dónde buscar
        cols = colecciones or self._decidir_colecciones(mensaje)

        # 2. Construir consulta enriquecida con perfil del estudiante
        consulta = self._construir_consulta(mensaje)

        # 3. Recuperar chunks relevantes con presupuestos por colección
        chunks = self._recuperar_contexto(consulta, cols, top_k)

        # 4. Generar respuesta con el LLM
        respuesta = self.llm.generar(
            pregunta=mensaje,
            chunks=chunks,
            historial=self._historial[-self.max_historial:],
        )

        # 5. Actualizar historial y perfil
        self._historial.append({"rol": "usuario",    "contenido": mensaje})
        self._historial.append({"rol": "asistente",  "contenido": respuesta})
        self._actualizar_perfil(mensaje, respuesta)

        logger.info(
            "Turno %d | cols=%s | chunks=%d",
            len(self._historial) // 2,
            cols,
            len(chunks),
        )
        return respuesta

    def _recuperar_contexto(
        self,
        consulta: str,
        colecciones: list[str],
        top_k: Optional[int] = None,
    ) -> list[dict]:
        """Recupera contexto balanceado entre vocacional, carrera y malla."""
        if top_k is not None:
            return self.retriever.buscar_multi(
                consulta,
                colecciones=colecciones,
                top_k_por_coleccion=top_k,
            )

        presupuestos = {
            "vocacional": TOP_K_VOCACIONAL,
            "carrera": TOP_K_CARRERA,
            "malla": TOP_K_MALLA,
            "test": 2,
        }

        chunks = []
        for coleccion in colecciones:
            try:
                encontrados = self.retriever.buscar(
                    consulta,
                    coleccion=coleccion,
                    top_k=presupuestos.get(coleccion, TOP_K_VOCACIONAL),
                )
                for chunk in encontrados:
                    chunk["coleccion"] = coleccion
                chunks.extend(encontrados)
            except Exception as exc:
                logger.warning("Error buscando en '%s': %s", coleccion, exc)

        chunks.sort(key=lambda x: x["distancia"])
        return chunks

    # ── Utilidades ───────────────────────────────────────────────────

    def verificar(self) -> bool:
        """Verifica que LM Studio (embeddings + LLM) esté operativo."""
        emb_ok = self.retriever._lm_client is not None
        llm_ok = self.llm.verificar_conexion()
        return emb_ok and llm_ok

    def resumen_sesion(self) -> dict:
        """Retorna un resumen de la sesión actual."""
        return {
            "turnos":              len(self._historial) // 2,
            "perfil":              self._perfil,
            "colecciones_usadas":  list({
                c.get("coleccion", "vocacional")
                for c in []  # se podría trackear en el futuro
            }),
        }
