"""
llm/lmstudio_client.py — Cliente para el LLM local vía LM Studio.

Construye el prompt RAG (sistema + contexto + historial + pregunta)
y llama al endpoint OpenAI-compatible de LM Studio.

Uso:
    from llm.lmstudio_client import LLMClient

    llm = LLMClient()
    respuesta = llm.generar(
        pregunta="¿Qué carrera me recomiendas si me gustan las matemáticas?",
        chunks=[...],           # salida del Retriever
        historial=[...],        # lista de turnos anteriores (puede ser [])
    )
    print(respuesta)
"""

import logging
from typing import Optional

from settings import LLM_MODEL, LMSTUDIO_URL

logger = logging.getLogger(__name__)

LMSTUDIO_BASE_URL = LMSTUDIO_URL
MAX_TOKENS        = 1024
TEMPERATURE       = 0.3   # bajo: respuestas más consistentes y menos inventadas

SYSTEM_PROMPT = """Eres UTMACHOrienta, un asistente de orientación vocacional para estudiantes \
de bachillerato en Ecuador. Tu objetivo es ayudarles a descubrir qué carrera universitaria \
se alinea mejor con sus intereses, habilidades y contexto personal.

Reglas que debes seguir siempre:
- Responde únicamente basándote en el CONTEXTO proporcionado. Si la información no está \
en el contexto, dilo claramente en lugar de inventar.
- Sé empático y usa un lenguaje cercano, sin tecnicismos innecesarios.
- Cuando recomiendes una carrera, explica brevemente por qué encaja con el perfil del estudiante.
- Si el contexto incluye información de mallas curriculares, menciona materias relevantes.
- Termina siempre con una pregunta de seguimiento para conocer mejor al estudiante.
- Responde en español."""


class LLMClient:
    """
    Wrapper sobre la API OpenAI-compatible de LM Studio para generación de texto.

    Args:
        base_url:    URL de LM Studio (default: http://localhost:1234/v1).
        model:       Nombre exacto del modelo cargado en LM Studio.
        max_tokens:  Límite de tokens en la respuesta.
        temperature: 0.0 = determinístico, 1.0 = creativo.
    """

    def __init__(
        self,
        base_url: str  = LMSTUDIO_BASE_URL,
        model: str     = LLM_MODEL,
        max_tokens: int = MAX_TOKENS,
        temperature: float = TEMPERATURE,
    ):
        self.model       = model
        self.max_tokens  = max_tokens
        self.temperature = temperature

        try:
            from openai import OpenAI
            self._client = OpenAI(base_url=base_url, api_key="lm-studio")
        except ImportError:
            raise RuntimeError("Instala openai: pip install openai")

    # ── Construcción del prompt ──────────────────────────────────────

    @staticmethod
    def _formatear_contexto(chunks: list[dict]) -> str:
        """
        Convierte los chunks recuperados en un bloque de contexto legible.
        Incluye la fuente y tipo de documento para que el LLM pueda citarlos.
        """
        if not chunks:
            return "No se encontró información relevante en la base de conocimiento."

        partes = []
        for i, chunk in enumerate(chunks, start=1):
            meta   = chunk.get("metadatos", {})
            tipo   = meta.get("tipo_doc", "desconocido")
            fuente = meta.get("nombre_archivo", "sin fuente")
            carrera = meta.get("carrera", "")
            texto  = chunk.get("texto", "").strip()

            encabezado = f"[Fuente {i} | tipo: {tipo}"
            if carrera:
                encabezado += f" | carrera: {carrera}"
            encabezado += f" | archivo: {fuente}]"

            partes.append(f"{encabezado}\n{texto}")

        return "\n\n---\n\n".join(partes)

    @staticmethod
    def _formatear_historial(historial: list[dict]) -> list[dict]:
        """
        Convierte el historial de conversación al formato de mensajes OpenAI.
        Cada turno es {"rol": "usuario"|"asistente", "contenido": str}.
        """
        mensajes = []
        for turno in historial:
            rol = "user" if turno.get("rol") == "usuario" else "assistant"
            mensajes.append({"role": rol, "content": turno.get("contenido", "")})
        return mensajes

    # ── Generación ───────────────────────────────────────────────────

    def generar(
        self,
        pregunta: str,
        chunks: list[dict],
        historial: Optional[list[dict]] = None,
        system_prompt: Optional[str] = None,
    ) -> str:
        """
        Genera una respuesta RAG: contexto + historial + pregunta → LLM.

        Args:
            pregunta:      Mensaje actual del estudiante.
            chunks:        Chunks recuperados por el Retriever.
            historial:     Lista de turnos anteriores de la conversación.
                           Formato: [{"rol": "usuario"|"asistente", "contenido": str}]
            system_prompt: Sobrescribe el system prompt por defecto.

        Returns:
            Texto de respuesta generado por el LLM.
        """
        historial    = historial or []
        contexto_txt = self._formatear_contexto(chunks)

        # Mensaje de usuario enriquecido con el contexto RAG
        user_message = (
            f"CONTEXTO (información de referencia):\n{contexto_txt}\n\n"
            f"PREGUNTA DEL ESTUDIANTE:\n{pregunta}"
        )

        mensajes = [
            {"role": "system", "content": system_prompt or SYSTEM_PROMPT},
            *self._formatear_historial(historial),
            {"role": "user", "content": user_message},
        ]

        try:
            respuesta = self._client.chat.completions.create(
                model=self.model,
                messages=mensajes,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
            )
            texto = respuesta.choices[0].message.content.strip()
            logger.info("LLM generó %d chars.", len(texto))
            return texto

        except Exception as exc:
            logger.error("Error al llamar al LLM: %s", exc)
            return (
                "Lo siento, tuve un problema al generar la respuesta. "
                "Verifica que LM Studio esté corriendo con el modelo cargado."
            )

    def verificar_conexion(self) -> bool:
        """Comprueba que el LLM responde correctamente."""
        try:
            r = self._client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": "Responde solo 'ok'"}],
                max_tokens=5,
            )
            logger.info("✓ LLM OK: %s", r.choices[0].message.content.strip())
            return True
        except Exception as exc:
            logger.error("✗ LLM no responde: %s", exc)
            return False
