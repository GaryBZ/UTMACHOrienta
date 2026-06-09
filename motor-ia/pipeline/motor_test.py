"""
pipeline/motor_test.py — Motor de preguntas adaptativas con RAG.

Responsabilidades:
  1. Generar la siguiente pregunta (con opciones) según el perfil acumulado.
  2. Decidir si el perfil ya es suficiente para recomendar (turnos 5-12).
  3. Generar el ranking de carreras cruzando el perfil contra las mallas en ChromaDB.

Límites duros:
  MIN_PREGUNTAS = 5   → siempre pregunta al menos 5 veces
  MAX_PREGUNTAS = 12  → a partir del turno 13 fuerza recomendación
"""

import json
import logging
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from retrieval.retriever import Retriever
from llm.lmstudio_client import LLMClient

logger = logging.getLogger(__name__)

MIN_PREGUNTAS = 5
MAX_PREGUNTAS = 12

LMSTUDIO_URL    = "http://localhost:1234/v1"
EMBEDDING_MODEL = "nomic-ai/nomic-embed-text-v1.5-GGUF"
LLM_MODEL       = "lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF"
CHROMA_PATH     = "./data/chroma_db"


# ── Prompts ───────────────────────────────────────────────────────────

SYSTEM_GENERAR_PREGUNTA = """Eres el motor de orientación vocacional de UTMACHOrienta. \
Tu tarea es generar UNA pregunta para descubrir los intereses, habilidades y valores \
de un estudiante de bachillerato en Ecuador.

Reglas estrictas:
- Responde SOLO con un objeto JSON válido, sin texto adicional, sin markdown, sin explicaciones.
- El JSON debe tener exactamente esta estructura:
{
  "texto": "texto de la pregunta",
  "tipo": "opciones" | "escala" | "texto_libre" | "multiple",
  "opciones": ["op1", "op2", "op3", "op4"],
  "permite_texto_libre": true | false
}
- Para tipo "escala": opciones = ["1 - Nada", "2", "3", "4", "5 - Mucho"]
- Para tipo "texto_libre": opciones = []
- Para tipo "multiple": el estudiante puede elegir varias opciones
- Para tipo "opciones": el estudiante elige exactamente una
- permite_texto_libre = true cuando ninguna opción podría representar al estudiante
- Las preguntas deben ser claras, empáticas y en español ecuatoriano
- No repitas áreas ya exploradas según el historial
- No menciones carreras específicas en las preguntas"""

SYSTEM_EVALUAR_PERFIL = """Eres un evaluador de perfiles vocacionales. \
Analiza el perfil acumulado del estudiante y decide si hay suficiente información \
para recomendar carreras universitarias con confianza.

Responde SOLO con JSON válido:
{
  "suficiente": true | false,
  "razon": "breve explicación de una línea"
}

Considera suficiente si conoces al menos:
- 2 áreas de interés claras
- Alguna preferencia de entorno de trabajo (con personas, datos, naturaleza, etc.)
- Alguna habilidad o materia preferida"""

SYSTEM_RECOMENDAR = """Eres UTMACHOrienta, un sistema de orientación vocacional. \
Recomienda carreras de la Universidad Técnica de Machala (UTMACH) basándote \
EXCLUSIVAMENTE en el CONTEXTO de mallas curriculares proporcionado y en el perfil del estudiante.

Reglas:
- Recomienda entre 1 y 3 carreras según cuántas realmente encajen con el perfil.
- NO inventes carreras. Solo puedes recomendar las que aparecen en el CONTEXTO.
- Responde SOLO con JSON válido, sin texto adicional:
{
  "carreras": [
    {
      "nombre": "nombre exacto de la carrera como aparece en el contexto",
      "puntaje": 0.95,
      "justificacion": "2-3 oraciones explicando por qué encaja con el perfil del estudiante"
    }
  ],
  "resumen_perfil": "resumen de 2 oraciones del perfil del estudiante"
}
- El puntaje va de 0.0 a 1.0 según qué tan bien encaja el perfil con la carrera.
- Ordena las carreras de mayor a menor puntaje."""

SYSTEM_EXTRAER_PERFIL = """Analiza la respuesta de un estudiante de bachillerato ecuatoriano y extrae información sobre su perfil vocacional.

Responde SOLO con JSON válido, sin texto adicional, sin markdown:
{
  "intereses": ["area1", "area2"],
  "entorno": "interior/oficina | exterior/naturaleza | laboratorio | salud/clinica | null",
  "modalidad": "equipo | independiente | flexible | null",
  "notas": "observación breve si hay algo relevante no categorizable, o null"
}

Áreas estándar disponibles (usa estas cuando apliquen):
matemáticas/lógica, tecnología/programación, tecnología/datos, artes/diseño,
trabajo con personas, salud, ciencias naturales, negocios/economía,
ciencias sociales/derecho, educación, ingeniería/construcción,
agropecuaria/ambiente, comunicación/periodismo, investigación/ciencia, turismo/idiomas.

Si el estudiante menciona algo que no encaja en ninguna área estándar, crea una etiqueta descriptiva corta.
Si la respuesta no revela ningún interés claro, retorna intereses: [].
Nunca retornes null para intereses, usa [] en su lugar."""




# ── Motor principal ───────────────────────────────────────────────────

class MotorTest:
    """
    Motor de preguntas adaptativas para orientación vocacional.

    Args:
        lmstudio_url:    URL de LM Studio.
        embedding_model: Modelo de embeddings (debe coincidir con la ingesta).
        llm_model:       Modelo LLM en LM Studio.
        chroma_path:     Ruta de ChromaDB.
    """

    def __init__(
        self,
        lmstudio_url: str    = LMSTUDIO_URL,
        embedding_model: str = EMBEDDING_MODEL,
        llm_model: str       = LLM_MODEL,
        chroma_path: str     = CHROMA_PATH,
    ):
        self.retriever = Retriever(
            lmstudio_url=lmstudio_url,
            embedding_model=embedding_model,
            chroma_path=chroma_path,
        )
        self.llm = LLMClient(
            base_url=lmstudio_url,
            model=llm_model,
            max_tokens=512,
            temperature=0.4,
        )

    # ── Pregunta inicial ──────────────────────────────────────────────

    def primera_pregunta(self) -> dict:
        """Retorna siempre la misma pregunta de apertura (sin llamar al LLM)."""
        return {
            "turno": 1,
            "texto": "¡Hola! Para ayudarte a encontrar tu carrera ideal en la UTMACH, "
                     "vamos a hacerte algunas preguntas. ¿Con cuál de estas actividades "
                     "disfrutas más tu tiempo?",
            "tipo": "opciones",
            "opciones": [
                "Resolver problemas matemáticos o lógicos",
                "Crear cosas con mis manos o de forma artística",
                "Ayudar o trabajar con otras personas",
                "Investigar, leer y aprender cosas nuevas",
            ],
            "permite_texto_libre": True,
            "es_recomendacion": False,
        }

    # ── Siguiente pregunta ────────────────────────────────────────────

    def siguiente_paso(self, perfil: dict, historial: list[dict], turno: int) -> dict:
        """
        Decide si generar otra pregunta o emitir la recomendación.

        Args:
            perfil:    Perfil acumulado del estudiante (dict).
            historial: Lista de turnos anteriores {"pregunta": str, "respuesta": str}.
            turno:     Número del turno actual (empieza en 1).

        Returns:
            Dict con la pregunta O con la recomendación.
            Siempre incluye "es_recomendacion": bool y "turno": int.
        """
        # Turno 1-4: siempre pregunta
        if turno <= MIN_PREGUNTAS:
            return self._generar_pregunta(perfil, historial, turno)

        # Turno 13+: forzar recomendación
        if turno > MAX_PREGUNTAS:
            logger.info("Turno %d: forzando recomendación (límite máximo).", turno)
            return self._generar_recomendacion(perfil, turno)

        # Turnos 5-12: el LLM decide
        if self._perfil_suficiente(perfil, historial):
            logger.info("Turno %d: perfil suficiente, generando recomendación.", turno)
            return self._generar_recomendacion(perfil, turno)

        return self._generar_pregunta(perfil, historial, turno)

    # ── Generar pregunta ──────────────────────────────────────────────

    def _generar_pregunta(self, perfil: dict, historial: list[dict], turno: int) -> dict:
        """Llama al LLM para generar la siguiente pregunta adaptativa."""

        historial_txt = self._formatear_historial(historial)
        perfil_txt    = json.dumps(perfil, ensure_ascii=False, indent=2)

        prompt = (
            f"PERFIL ACUMULADO DEL ESTUDIANTE:\n{perfil_txt}\n\n"
            f"HISTORIAL DE PREGUNTAS Y RESPUESTAS:\n{historial_txt}\n\n"
            f"Genera la pregunta número {turno} para conocer mejor al estudiante. "
            f"Explora áreas que aún no se hayan cubierto en el historial."
        )

        respuesta_raw = self.llm.generar(
            pregunta=prompt,
            chunks=[],
            system_prompt=SYSTEM_GENERAR_PREGUNTA,
        )

        pregunta = self._parsear_json(respuesta_raw)

        if not pregunta or "texto" not in pregunta:
            logger.warning("LLM no retornó pregunta válida, usando fallback.")
            pregunta = self._pregunta_fallback(turno)

        pregunta["turno"]            = turno
        pregunta["es_recomendacion"] = False
        return pregunta

    # ── Evaluar si el perfil es suficiente ───────────────────────────

    def _perfil_suficiente(self, perfil: dict, historial: list[dict]) -> bool:
        """Pregunta al LLM si el perfil ya tiene suficiente info para recomendar."""
        perfil_txt    = json.dumps(perfil, ensure_ascii=False, indent=2)
        historial_txt = self._formatear_historial(historial)

        prompt = (
            f"PERFIL ACUMULADO:\n{perfil_txt}\n\n"
            f"HISTORIAL:\n{historial_txt}\n\n"
            f"¿Hay suficiente información para recomendar carreras universitarias?"
        )

        respuesta_raw = self.llm.generar(
            pregunta=prompt,
            chunks=[],
            system_prompt=SYSTEM_EVALUAR_PERFIL,
        )

        resultado = self._parsear_json(respuesta_raw)
        if resultado and isinstance(resultado.get("suficiente"), bool):
            return resultado["suficiente"]

        # Si el LLM no responde bien, ser conservador y seguir preguntando
        return False

    # ── Generar recomendación ─────────────────────────────────────────

    def _generar_recomendacion(self, perfil: dict, turno: int) -> dict:
        """
        Recupera mallas relevantes desde ChromaDB y genera el ranking de carreras.
        """
        # Construir consulta de búsqueda desde el perfil
        consulta = self._perfil_a_consulta(perfil)

        # Recuperar chunks de mallas (top 8 para tener variedad de carreras)
        chunks = self.retriever.buscar(
            consulta,
            coleccion="malla",
            top_k=8,
        )

        # También recuperar chunks vocacionales para enriquecer el contexto
        chunks_voc = self.retriever.buscar(
            consulta,
            coleccion="vocacional",
            top_k=3,
        )

        todos_chunks = chunks + chunks_voc
        perfil_txt   = json.dumps(perfil, ensure_ascii=False, indent=2)

        prompt = (
            f"PERFIL DEL ESTUDIANTE:\n{perfil_txt}\n\n"
            f"Basándote en el CONTEXTO de las mallas curriculares, "
            f"recomienda las carreras que mejor se ajusten a este perfil."
        )

        respuesta_raw = self.llm.generar(
            pregunta=prompt,
            chunks=todos_chunks,
            system_prompt=SYSTEM_RECOMENDAR,
        )

        recomendacion = self._parsear_json(respuesta_raw)

        if not recomendacion or "carreras" not in recomendacion:
            logger.warning("LLM no generó recomendación válida.")
            recomendacion = {
                "carreras": [],
                "resumen_perfil": "No se pudo generar una recomendación con la información disponible.",
            }

        recomendacion["turno"]            = turno
        recomendacion["es_recomendacion"] = True
        return recomendacion

    # ── Actualizar perfil ─────────────────────────────────────────────

    def actualizar_perfil(self, perfil: dict, pregunta: dict, respuesta_texto: str) -> dict:
        """
        Extrae información del perfil usando el LLM (Opción 1).
        Sin keywords hardcodeadas: el LLM entiende cualquier respuesta en lenguaje natural.

        Args:
            perfil:          Perfil acumulado del estudiante.
            pregunta:        Dict de la pregunta respondida {"texto": str, "tipo": str}.
            respuesta_texto: Respuesta del estudiante en texto libre.

        Returns:
            Perfil actualizado con intereses, entorno y modalidad acumulados.
        """
        prompt = (
            f"Pregunta que se le hizo al estudiante: {pregunta.get('texto', '(sin texto)')}\n"
            f"Respuesta del estudiante: {respuesta_texto}"
        )

        try:
            raw = self.llm.generar(
                pregunta=prompt,
                chunks=[],
                system_prompt=SYSTEM_EXTRAER_PERFIL,
            )
            extraido = self._parsear_json(raw)
        except Exception as exc:
            logger.warning("LLM falló al extraer perfil: %s. Usando perfil sin cambios.", exc)
            extraido = None

        if not extraido:
            logger.warning("No se pudo extraer perfil de: '%s'", respuesta_texto[:80])
            return perfil

        # ── Acumular intereses sin duplicar ──
        intereses = perfil.get("intereses", [])
        for area in extraido.get("intereses") or []:
            area = area.strip()
            if area and area not in intereses:
                intereses.append(area)
        perfil["intereses"] = intereses

        # ── Entorno: solo sobreescribir si el LLM detectó algo ──
        entorno = extraido.get("entorno")
        if entorno and entorno != "null":
            perfil["entorno"] = entorno

        # ── Modalidad: solo sobreescribir si el LLM detectó algo ──
        modalidad = extraido.get("modalidad")
        if modalidad and modalidad != "null":
            perfil["modalidad"] = modalidad

        # ── Notas libres: acumular ──
        notas = extraido.get("notas")
        if notas and notas != "null":
            perfil.setdefault("notas", []).append(notas)

        # ── Guardar valor de escala si aplica ──
        if pregunta.get("tipo") == "escala":
            import re as _re
            try:
                valor = int(_re.search(r"\d", respuesta_texto).group())
                area_pregunta = pregunta.get("texto", "")[:50]
                perfil.setdefault("escalas", {})[area_pregunta] = valor
            except (AttributeError, ValueError):
                pass

        logger.info(
            "Perfil actualizado | intereses=%s | entorno=%s | modalidad=%s",
            perfil.get("intereses"),
            perfil.get("entorno"),
            perfil.get("modalidad"),
        )
        return perfil

    # ── Utilidades ────────────────────────────────────────────────────

    @staticmethod
    def _formatear_historial(historial: list[dict]) -> str:
        if not historial:
            return "(sin historial aún)"
        lineas = []
        for i, turno in enumerate(historial, start=1):
            lineas.append(f"P{i}: {turno.get('pregunta', '')}")
            lineas.append(f"R{i}: {turno.get('respuesta', '')}")
        return "\n".join(lineas)

    @staticmethod
    def _perfil_a_consulta(perfil: dict) -> str:
        """Convierte el perfil acumulado en una consulta de texto para el retriever."""
        partes = []
        if perfil.get("intereses"):
            partes.append("intereses en " + ", ".join(perfil["intereses"]))
        if perfil.get("entorno"):
            partes.append(f"entorno preferido: {perfil['entorno']}")
        if perfil.get("modalidad"):
            partes.append(perfil["modalidad"])
        if not partes:
            return "carreras universitarias UTMACH perfil estudiante"
        return "carrera universitaria para estudiante con " + "; ".join(partes)

    @staticmethod
    def _parsear_json(texto: str) -> dict | None:
        """Extrae el primer objeto JSON válido de la respuesta del LLM."""
        if not texto:
            return None
        # Limpiar bloques markdown ```json ... ```
        texto = re.sub(r"```(?:json)?", "", texto).strip("`").strip()
        # Buscar el primer { ... } balanceado
        match = re.search(r"\{.*\}", texto, re.DOTALL)
        if not match:
            return None
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            logger.warning("JSON inválido del LLM: %s", texto[:200])
            return None

    @staticmethod
    def _pregunta_fallback(turno: int) -> dict:
        """Preguntas de respaldo si el LLM falla al generar JSON."""
        fallbacks = [
            {
                "texto": "¿Qué materia escolar disfrutas más?",
                "tipo": "opciones",
                "opciones": ["Matemáticas", "Ciencias naturales", "Lenguaje/Literatura", "Historia/Sociales"],
                "permite_texto_libre": True,
            },
            {
                "texto": "¿Cómo prefieres trabajar?",
                "tipo": "opciones",
                "opciones": ["Solo/a y concentrado/a", "En equipo con otros", "Mezclando ambos", "Depende del proyecto"],
                "permite_texto_libre": False,
            },
            {
                "texto": "¿Qué tan importante es para ti ayudar directamente a otras personas en tu trabajo futuro?",
                "tipo": "escala",
                "opciones": ["1 - Nada importante", "2", "3", "4", "5 - Muy importante"],
                "permite_texto_libre": False,
            },
            {
                "texto": "Si pudieras pasar un día haciendo cualquier actividad, ¿cuál elegirías?",
                "tipo": "texto_libre",
                "opciones": [],
                "permite_texto_libre": True,
            },
        ]
        idx = (turno - 2) % len(fallbacks)
        return fallbacks[idx]

# """
# pipeline/motor_test.py — Motor de preguntas adaptativas con RAG.

# Responsabilidades:
#   1. Generar la siguiente pregunta (con opciones) según el perfil acumulado.
#   2. Decidir si el perfil ya es suficiente para recomendar (turnos 5-12).
#   3. Generar el ranking de carreras cruzando el perfil contra las mallas en ChromaDB.

# Límites duros:
#   MIN_PREGUNTAS = 5   → siempre pregunta al menos 5 veces
#   MAX_PREGUNTAS = 12  → a partir del turno 13 fuerza recomendación
# """

# import json
# import logging
# import re
# import sys
# from pathlib import Path

# sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# from retrieval.retriever import Retriever
# from llm.lmstudio_client import LLMClient

# logger = logging.getLogger(__name__)

# MIN_PREGUNTAS = 5
# MAX_PREGUNTAS = 12

# LMSTUDIO_URL    = "http://localhost:1234/v1"
# EMBEDDING_MODEL = "nomic-ai/nomic-embed-text-v1.5-GGUF"
# LLM_MODEL       = "lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF"
# CHROMA_PATH     = "./data/chroma_db"


# # ── Prompts ───────────────────────────────────────────────────────────

# SYSTEM_GENERAR_PREGUNTA = """Eres el motor de orientación vocacional de UTMACHOrienta. \
# Tu tarea es generar UNA pregunta para descubrir los intereses, habilidades y valores \
# de un estudiante de bachillerato en Ecuador.

# Reglas estrictas:
# - Responde SOLO con un objeto JSON válido, sin texto adicional, sin markdown, sin explicaciones.
# - El JSON debe tener exactamente esta estructura:
# {
#   "texto": "texto de la pregunta",
#   "tipo": "opciones" | "escala" | "texto_libre" | "multiple",
#   "opciones": ["op1", "op2", "op3", "op4"],
#   "permite_texto_libre": true | false
# }
# - Para tipo "escala": opciones = ["1 - Nada", "2", "3", "4", "5 - Mucho"]
# - Para tipo "texto_libre": opciones = []
# - Para tipo "multiple": el estudiante puede elegir varias opciones
# - Para tipo "opciones": el estudiante elige exactamente una
# - permite_texto_libre = true cuando ninguna opción podría representar al estudiante
# - Las preguntas deben ser claras, empáticas y en español ecuatoriano
# - No repitas áreas ya exploradas según el historial
# - No menciones carreras específicas en las preguntas"""

# SYSTEM_EVALUAR_PERFIL = """Eres un evaluador de perfiles vocacionales. \
# Analiza el perfil acumulado del estudiante y decide si hay suficiente información \
# para recomendar carreras universitarias con confianza.

# Responde SOLO con JSON válido:
# {
#   "suficiente": true | false,
#   "razon": "breve explicación de una línea"
# }

# Considera suficiente si conoces al menos:
# - 2 áreas de interés claras
# - Alguna preferencia de entorno de trabajo (con personas, datos, naturaleza, etc.)
# - Alguna habilidad o materia preferida"""

# SYSTEM_RECOMENDAR = """Eres UTMACHOrienta, un sistema de orientación vocacional. \
# Recomienda carreras de la Universidad Técnica de Machala (UTMACH) basándote \
# EXCLUSIVAMENTE en el CONTEXTO de mallas curriculares proporcionado y en el perfil del estudiante.

# Reglas:
# - Recomienda entre 1 y 3 carreras según cuántas realmente encajen con el perfil.
# - NO inventes carreras. Solo puedes recomendar las que aparecen en el CONTEXTO.
# - Responde SOLO con JSON válido, sin texto adicional:
# {
#   "carreras": [
#     {
#       "nombre": "nombre exacto de la carrera como aparece en el contexto",
#       "puntaje": 0.95,
#       "justificacion": "2-3 oraciones explicando por qué encaja con el perfil del estudiante"
#     }
#   ],
#   "resumen_perfil": "resumen de 2 oraciones del perfil del estudiante"
# }
# - El puntaje va de 0.0 a 1.0 según qué tan bien encaja el perfil con la carrera.
# - Ordena las carreras de mayor a menor puntaje."""


# # ── Motor principal ───────────────────────────────────────────────────

# class MotorTest:
#     """
#     Motor de preguntas adaptativas para orientación vocacional.

#     Args:
#         lmstudio_url:    URL de LM Studio.
#         embedding_model: Modelo de embeddings (debe coincidir con la ingesta).
#         llm_model:       Modelo LLM en LM Studio.
#         chroma_path:     Ruta de ChromaDB.
#     """

#     def __init__(
#         self,
#         lmstudio_url: str    = LMSTUDIO_URL,
#         embedding_model: str = EMBEDDING_MODEL,
#         llm_model: str       = LLM_MODEL,
#         chroma_path: str     = CHROMA_PATH,
#     ):
#         self.retriever = Retriever(
#             lmstudio_url=lmstudio_url,
#             embedding_model=embedding_model,
#             chroma_path=chroma_path,
#         )
#         self.llm = LLMClient(
#             base_url=lmstudio_url,
#             model=llm_model,
#             max_tokens=512,
#             temperature=0.4,
#         )

#     # ── Pregunta inicial ──────────────────────────────────────────────

#     def primera_pregunta(self) -> dict:
#         """Retorna siempre la misma pregunta de apertura (sin llamar al LLM)."""
#         return {
#             "turno": 1,
#             "texto": "¡Hola! Para ayudarte a encontrar tu carrera ideal en la UTMACH, "
#                      "vamos a hacerte algunas preguntas. ¿Con cuál de estas actividades "
#                      "disfrutas más tu tiempo?",
#             "tipo": "opciones",
#             "opciones": [
#                 "Resolver problemas matemáticos o lógicos",
#                 "Crear cosas con mis manos o de forma artística",
#                 "Ayudar o trabajar con otras personas",
#                 "Investigar, leer y aprender cosas nuevas",
#             ],
#             "permite_texto_libre": True,
#             "es_recomendacion": False,
#         }

#     # ── Siguiente pregunta ────────────────────────────────────────────

#     def siguiente_paso(self, perfil: dict, historial: list[dict], turno: int) -> dict:
#         """
#         Decide si generar otra pregunta o emitir la recomendación.

#         Args:
#             perfil:    Perfil acumulado del estudiante (dict).
#             historial: Lista de turnos anteriores {"pregunta": str, "respuesta": str}.
#             turno:     Número del turno actual (empieza en 1).

#         Returns:
#             Dict con la pregunta O con la recomendación.
#             Siempre incluye "es_recomendacion": bool y "turno": int.
#         """
#         # Turno 1-4: siempre pregunta
#         if turno <= MIN_PREGUNTAS:
#             return self._generar_pregunta(perfil, historial, turno)

#         # Turno 13+: forzar recomendación
#         if turno > MAX_PREGUNTAS:
#             logger.info("Turno %d: forzando recomendación (límite máximo).", turno)
#             return self._generar_recomendacion(perfil, turno)

#         # Turnos 5-12: el LLM decide
#         if self._perfil_suficiente(perfil, historial):
#             logger.info("Turno %d: perfil suficiente, generando recomendación.", turno)
#             return self._generar_recomendacion(perfil, turno)

#         return self._generar_pregunta(perfil, historial, turno)

#     # ── Generar pregunta ──────────────────────────────────────────────

#     def _generar_pregunta(self, perfil: dict, historial: list[dict], turno: int) -> dict:
#         """Llama al LLM para generar la siguiente pregunta adaptativa."""

#         historial_txt = self._formatear_historial(historial)
#         perfil_txt    = json.dumps(perfil, ensure_ascii=False, indent=2)

#         prompt = (
#             f"PERFIL ACUMULADO DEL ESTUDIANTE:\n{perfil_txt}\n\n"
#             f"HISTORIAL DE PREGUNTAS Y RESPUESTAS:\n{historial_txt}\n\n"
#             f"Genera la pregunta número {turno} para conocer mejor al estudiante. "
#             f"Explora áreas que aún no se hayan cubierto en el historial."
#         )

#         respuesta_raw = self.llm.generar(
#             pregunta=prompt,
#             chunks=[],
#             system_prompt=SYSTEM_GENERAR_PREGUNTA,
#         )

#         pregunta = self._parsear_json(respuesta_raw)

#         if not pregunta or "texto" not in pregunta:
#             logger.warning("LLM no retornó pregunta válida, usando fallback.")
#             pregunta = self._pregunta_fallback(turno)

#         pregunta["turno"]            = turno
#         pregunta["es_recomendacion"] = False
#         return pregunta

#     # ── Evaluar si el perfil es suficiente ───────────────────────────

#     def _perfil_suficiente(self, perfil: dict, historial: list[dict]) -> bool:
#         """Pregunta al LLM si el perfil ya tiene suficiente info para recomendar."""
#         perfil_txt    = json.dumps(perfil, ensure_ascii=False, indent=2)
#         historial_txt = self._formatear_historial(historial)

#         prompt = (
#             f"PERFIL ACUMULADO:\n{perfil_txt}\n\n"
#             f"HISTORIAL:\n{historial_txt}\n\n"
#             f"¿Hay suficiente información para recomendar carreras universitarias?"
#         )

#         respuesta_raw = self.llm.generar(
#             pregunta=prompt,
#             chunks=[],
#             system_prompt=SYSTEM_EVALUAR_PERFIL,
#         )

#         resultado = self._parsear_json(respuesta_raw)
#         if resultado and isinstance(resultado.get("suficiente"), bool):
#             return resultado["suficiente"]

#         # Si el LLM no responde bien, ser conservador y seguir preguntando
#         return False

#     # ── Generar recomendación ─────────────────────────────────────────

#     def _generar_recomendacion(self, perfil: dict, turno: int) -> dict:
#         """
#         Recupera mallas relevantes desde ChromaDB y genera el ranking de carreras.
#         """
#         # Construir consulta de búsqueda desde el perfil
#         consulta = self._perfil_a_consulta(perfil)

#         # Recuperar chunks de mallas (top 8 para tener variedad de carreras)
#         chunks = self.retriever.buscar(
#             consulta,
#             coleccion="malla",
#             top_k=8,
#         )

#         # También recuperar chunks vocacionales para enriquecer el contexto
#         chunks_voc = self.retriever.buscar(
#             consulta,
#             coleccion="vocacional",
#             top_k=3,
#         )

#         todos_chunks = chunks + chunks_voc
#         perfil_txt   = json.dumps(perfil, ensure_ascii=False, indent=2)

#         prompt = (
#             f"PERFIL DEL ESTUDIANTE:\n{perfil_txt}\n\n"
#             f"Basándote en el CONTEXTO de las mallas curriculares, "
#             f"recomienda las carreras que mejor se ajusten a este perfil."
#         )

#         respuesta_raw = self.llm.generar(
#             pregunta=prompt,
#             chunks=todos_chunks,
#             system_prompt=SYSTEM_RECOMENDAR,
#         )

#         recomendacion = self._parsear_json(respuesta_raw)

#         if not recomendacion or "carreras" not in recomendacion:
#             logger.warning("LLM no generó recomendación válida.")
#             recomendacion = {
#                 "carreras": [],
#                 "resumen_perfil": "No se pudo generar una recomendación con la información disponible.",
#             }

#         recomendacion["turno"]            = turno
#         recomendacion["es_recomendacion"] = True
#         return recomendacion

#     # ── Actualizar perfil ─────────────────────────────────────────────

#     def actualizar_perfil(self, perfil: dict, pregunta: dict, respuesta_texto: str) -> dict:
#         """
#         Extrae información del perfil a partir de la respuesta del estudiante.
#         Versión liviana basada en keywords; no consume tokens del LLM.

#         Args:
#             perfil:          Perfil actual (se modifica in-place y se retorna).
#             pregunta:        Dict de la pregunta que se respondió.
#             respuesta_texto: Lo que respondió el estudiante.

#         Returns:
#             Perfil actualizado.
#         """
#         resp = respuesta_texto.lower()

#         # ── Intereses ──
#         # Keywords amplias: captura frases completas del estudiante en texto libre
#         mapa_intereses = {
#             # Matemáticas / lógica
#             "matemát":     "matemáticas/lógica",
#             "matemat":     "matemáticas/lógica",
#             "lógic":       "matemáticas/lógica",
#             "logic":       "matemáticas/lógica",
#             "cálcul":      "matemáticas/lógica",
#             "calcul":      "matemáticas/lógica",
#             "estadíst":    "matemáticas/lógica",
#             "estadist":    "matemáticas/lógica",
#             # Tecnología / programación
#             "programac":   "tecnología/programación",
#             "programar":   "tecnología/programación",
#             "computac":    "tecnología/programación",
#             "computador":  "tecnología/programación",
#             "software":    "tecnología/programación",
#             "desarroll":   "tecnología/programación",
#             "web":         "tecnología/programación",
#             "aplicac":     "tecnología/programación",
#             "sistema":     "tecnología/programación",
#             # Tecnología / datos
#             "datos":       "tecnología/datos",
#             "inteligencia artificial": "tecnología/datos",
#             "machine":     "tecnología/datos",
#             "base de dato": "tecnología/datos",
#             # Artes / diseño / creatividad
#             "arte":        "artes/diseño",
#             "artes":       "artes/diseño",
#             "diseño":      "artes/diseño",
#             "disenar":     "artes/diseño",
#             "creativ":     "artes/diseño",
#             "original":    "artes/diseño",
#             "pintur":      "artes/diseño",
#             "dibujo":      "artes/diseño",
#             "escultur":    "artes/diseño",
#             "plástic":     "artes/diseño",
#             "plastic":     "artes/diseño",
#             "visual":      "artes/diseño",
#             "cultura":     "artes/diseño",
#             "cultural":    "artes/diseño",
#             "música":      "artes/diseño",
#             "musica":      "artes/diseño",
#             "teatro":      "artes/diseño",
#             "cine":        "artes/diseño",
#             "fotograf":    "artes/diseño",
#             # Trabajo con personas
#             "personas":    "trabajo con personas",
#             "ayudar":      "trabajo con personas",
#             "gente":       "trabajo con personas",
#             "comunidad":   "trabajo con personas",
#             "social":      "trabajo con personas",
#             "voluntar":    "trabajo con personas",
#             # Salud
#             "salud":       "salud",
#             "medicina":    "salud",
#             "médic":       "salud",
#             "medic":       "salud",
#             "enferm":      "salud",
#             "farmac":      "salud",
#             "paciente":    "salud",
#             "clínic":      "salud",
#             "clinic":      "salud",
#             # Ciencias naturales
#             "natural":     "ciencias naturales",
#             "biolog":      "ciencias naturales",
#             "química":     "ciencias naturales",
#             "quimic":      "ciencias naturales",
#             "física":      "ciencias naturales",
#             "fisic":       "ciencias naturales",
#             "ecolog":      "ciencias naturales",
#             # Negocios / economía
#             "negocio":     "negocios/economía",
#             "empresa":     "negocios/economía",
#             "administr":   "negocios/economía",
#             "economí":     "negocios/economía",
#             "econom":      "negocios/economía",
#             "financ":      "negocios/economía",
#             "contabil":    "negocios/economía",
#             "comerc":      "negocios/economía",
#             "mercado":     "negocios/economía",
#             "venta":       "negocios/economía",
#             # Derecho / ciencias sociales
#             "derecho":     "ciencias sociales/derecho",
#             "legal":       "ciencias sociales/derecho",
#             "ley":         "ciencias sociales/derecho",
#             "justicia":    "ciencias sociales/derecho",
#             "sociol":      "ciencias sociales/derecho",
#             "psicolog":    "ciencias sociales/derecho",
#             "trabajo social": "ciencias sociales/derecho",
#             # Educación
#             "educ":        "educación",
#             "enseñar":     "educación",
#             "ensenar":     "educación",
#             "docente":     "educación",
#             "maestr":      "educación",
#             "profesor":    "educación",
#             "pedagog":     "educación",
#             # Ingeniería / construcción
#             "construc":    "ingeniería/construcción",
#             "ingenier":    "ingeniería/construcción",
#             "arquitect":   "ingeniería/construcción",
#             "civil":       "ingeniería/construcción",
#             "mecánic":     "ingeniería/construcción",
#             "mecanic":     "ingeniería/construcción",
#             # Agropecuaria / ambiente
#             "campo":       "agropecuaria/ambiente",
#             "agricultur":  "agropecuaria/ambiente",
#             "ambiente":    "agropecuaria/ambiente",
#             "ambiental":   "agropecuaria/ambiente",
#             "agropec":     "agropecuaria/ambiente",
#             "acuicult":    "agropecuaria/ambiente",
#             "agronom":     "agropecuaria/ambiente",
#             "alimento":    "agropecuaria/ambiente",
#             # Comunicación
#             "comunic":     "comunicación/periodismo",
#             "periodis":    "comunicación/periodismo",
#             "medios":      "comunicación/periodismo",
#             "publicidad":  "comunicación/periodismo",
#             # Investigación
#             "investig":    "investigación/ciencia",
#             "ciencia":     "investigación/ciencia",
#             "laboratorio": "investigación/ciencia",
#             # Turismo / idiomas
#             "turismo":     "turismo/idiomas",
#             "turístic":    "turismo/idiomas",
#             "idioma":      "turismo/idiomas",
#             "idiomas":     "turismo/idiomas",
#             "lengua":      "turismo/idiomas",
#             "viaj":        "turismo/idiomas",
#         }

#         intereses = perfil.get("intereses", [])
#         for kw, area in mapa_intereses.items():
#             if kw in resp and area not in intereses:
#                 intereses.append(area)
#         perfil["intereses"] = intereses

#         # ── Entorno preferido ──
#         if any(k in resp for k in ["oficina", "computador", "escritorio", "interior", "adentro"]):
#             perfil["entorno"] = "interior/oficina"
#         elif any(k in resp for k in ["exterior", "campo", "naturaleza", "aire libre", "afuera"]):
#             perfil["entorno"] = "exterior/naturaleza"
#         elif any(k in resp for k in ["laboratorio", "lab"]):
#             perfil["entorno"] = "laboratorio"
#         elif any(k in resp for k in ["hospital", "clínica", "clinica", "paciente"]):
#             perfil["entorno"] = "salud/clínica"

#         # ── Modalidad de trabajo ──
#         if any(k in resp for k in ["equipo", "grupo", "colaborar", "con otros", "conjunt"]):
#             perfil["modalidad"] = "trabajo en equipo"
#         elif any(k in resp for k in ["solo", "independ", "individual", "por mi cuenta"]):
#             perfil["modalidad"] = "trabajo independiente"
#         elif any(k in resp for k in ["adapt", "depende", "ambos", "flexible"]):
#             perfil["modalidad"] = "flexible"

#         # ── Escala (si la pregunta era de escala 1-5) ──
#         if pregunta.get("tipo") == "escala":
#             try:
#                 valor = int(re.search(r"\d", resp).group())
#                 area_pregunta = pregunta.get("texto", "")[:40]
#                 perfil.setdefault("escalas", {})[area_pregunta] = valor
#             except (AttributeError, ValueError):
#                 pass

#         return perfil

#     # ── Utilidades ────────────────────────────────────────────────────

#     @staticmethod
#     def _formatear_historial(historial: list[dict]) -> str:
#         if not historial:
#             return "(sin historial aún)"
#         lineas = []
#         for i, turno in enumerate(historial, start=1):
#             lineas.append(f"P{i}: {turno.get('pregunta', '')}")
#             lineas.append(f"R{i}: {turno.get('respuesta', '')}")
#         return "\n".join(lineas)

#     @staticmethod
#     def _perfil_a_consulta(perfil: dict) -> str:
#         """Convierte el perfil acumulado en una consulta de texto para el retriever."""
#         partes = []
#         if perfil.get("intereses"):
#             partes.append("intereses en " + ", ".join(perfil["intereses"]))
#         if perfil.get("entorno"):
#             partes.append(f"entorno preferido: {perfil['entorno']}")
#         if perfil.get("modalidad"):
#             partes.append(perfil["modalidad"])
#         if not partes:
#             return "carreras universitarias UTMACH perfil estudiante"
#         return "carrera universitaria para estudiante con " + "; ".join(partes)

#     @staticmethod
#     def _parsear_json(texto: str) -> dict | None:
#         """Extrae el primer objeto JSON válido de la respuesta del LLM."""
#         if not texto:
#             return None
#         # Limpiar bloques markdown ```json ... ```
#         texto = re.sub(r"```(?:json)?", "", texto).strip("`").strip()
#         # Buscar el primer { ... } balanceado
#         match = re.search(r"\{.*\}", texto, re.DOTALL)
#         if not match:
#             return None
#         try:
#             return json.loads(match.group())
#         except json.JSONDecodeError:
#             logger.warning("JSON inválido del LLM: %s", texto[:200])
#             return None

#     @staticmethod
#     def _pregunta_fallback(turno: int) -> dict:
#         """Preguntas de respaldo si el LLM falla al generar JSON."""
#         fallbacks = [
#             {
#                 "texto": "¿Qué materia escolar disfrutas más?",
#                 "tipo": "opciones",
#                 "opciones": ["Matemáticas", "Ciencias naturales", "Lenguaje/Literatura", "Historia/Sociales"],
#                 "permite_texto_libre": True,
#             },
#             {
#                 "texto": "¿Cómo prefieres trabajar?",
#                 "tipo": "opciones",
#                 "opciones": ["Solo/a y concentrado/a", "En equipo con otros", "Mezclando ambos", "Depende del proyecto"],
#                 "permite_texto_libre": False,
#             },
#             {
#                 "texto": "¿Qué tan importante es para ti ayudar directamente a otras personas en tu trabajo futuro?",
#                 "tipo": "escala",
#                 "opciones": ["1 - Nada importante", "2", "3", "4", "5 - Muy importante"],
#                 "permite_texto_libre": False,
#             },
#             {
#                 "texto": "Si pudieras pasar un día haciendo cualquier actividad, ¿cuál elegirías?",
#                 "tipo": "texto_libre",
#                 "opciones": [],
#                 "permite_texto_libre": True,
#             },
#         ]
#         idx = (turno - 2) % len(fallbacks)
#         return fallbacks[idx]

# """
# pipeline/motor_test.py — Motor de preguntas adaptativas con RAG.

# Responsabilidades:
#   1. Generar la siguiente pregunta (con opciones) según el perfil acumulado.
#   2. Decidir si el perfil ya es suficiente para recomendar (turnos 5-12).
#   3. Generar el ranking de carreras cruzando el perfil contra las mallas en ChromaDB.

# Límites duros:
#   MIN_PREGUNTAS = 5   → siempre pregunta al menos 5 veces
#   MAX_PREGUNTAS = 12  → a partir del turno 13 fuerza recomendación
# """

# import json
# import logging
# import re
# import sys
# from pathlib import Path

# sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# from retrieval.retriever import Retriever
# from llm.lmstudio_client import LLMClient

# logger = logging.getLogger(__name__)

# MIN_PREGUNTAS = 5
# MAX_PREGUNTAS = 12

# LMSTUDIO_URL    = "http://localhost:1234/v1"
# EMBEDDING_MODEL = "nomic-ai/nomic-embed-text-v1.5-GGUF"
# LLM_MODEL       = "lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF"
# CHROMA_PATH     = "./data/chroma_db"


# # ── Prompts ───────────────────────────────────────────────────────────

# SYSTEM_GENERAR_PREGUNTA = """Eres el motor de orientación vocacional de UTMACHOrienta. \
# Tu tarea es generar UNA pregunta para descubrir los intereses, habilidades y valores \
# de un estudiante de bachillerato en Ecuador.

# Reglas estrictas:
# - Responde SOLO con un objeto JSON válido, sin texto adicional, sin markdown, sin explicaciones.
# - El JSON debe tener exactamente esta estructura:
# {
#   "texto": "texto de la pregunta",
#   "tipo": "opciones" | "escala" | "texto_libre" | "multiple",
#   "opciones": ["op1", "op2", "op3", "op4"],
#   "permite_texto_libre": true | false
# }
# - Para tipo "escala": opciones = ["1 - Nada", "2", "3", "4", "5 - Mucho"]
# - Para tipo "texto_libre": opciones = []
# - Para tipo "multiple": el estudiante puede elegir varias opciones
# - Para tipo "opciones": el estudiante elige exactamente una
# - permite_texto_libre = true cuando ninguna opción podría representar al estudiante
# - Las preguntas deben ser claras, empáticas y en español ecuatoriano
# - No repitas áreas ya exploradas según el historial
# - No menciones carreras específicas en las preguntas"""

# SYSTEM_EVALUAR_PERFIL = """Eres un evaluador de perfiles vocacionales. \
# Analiza el perfil acumulado del estudiante y decide si hay suficiente información \
# para recomendar carreras universitarias con confianza.

# Responde SOLO con JSON válido:
# {
#   "suficiente": true | false,
#   "razon": "breve explicación de una línea"
# }

# Considera suficiente si conoces al menos:
# - 2 áreas de interés claras
# - Alguna preferencia de entorno de trabajo (con personas, datos, naturaleza, etc.)
# - Alguna habilidad o materia preferida"""

# SYSTEM_RECOMENDAR = """Eres UTMACHOrienta, un sistema de orientación vocacional. \
# Recomienda carreras de la Universidad Técnica de Machala (UTMACH) basándote \
# EXCLUSIVAMENTE en el CONTEXTO de mallas curriculares proporcionado y en el perfil del estudiante.

# Reglas:
# - Recomienda entre 1 y 3 carreras según cuántas realmente encajen con el perfil.
# - NO inventes carreras. Solo puedes recomendar las que aparecen en el CONTEXTO.
# - Responde SOLO con JSON válido, sin texto adicional:
# {
#   "carreras": [
#     {
#       "nombre": "nombre exacto de la carrera como aparece en el contexto",
#       "puntaje": 0.95,
#       "justificacion": "2-3 oraciones explicando por qué encaja con el perfil del estudiante"
#     }
#   ],
#   "resumen_perfil": "resumen de 2 oraciones del perfil del estudiante"
# }
# - El puntaje va de 0.0 a 1.0 según qué tan bien encaja el perfil con la carrera.
# - Ordena las carreras de mayor a menor puntaje."""


# # ── Motor principal ───────────────────────────────────────────────────

# class MotorTest:
#     """
#     Motor de preguntas adaptativas para orientación vocacional.

#     Args:
#         lmstudio_url:    URL de LM Studio.
#         embedding_model: Modelo de embeddings (debe coincidir con la ingesta).
#         llm_model:       Modelo LLM en LM Studio.
#         chroma_path:     Ruta de ChromaDB.
#     """

#     def __init__(
#         self,
#         lmstudio_url: str    = LMSTUDIO_URL,
#         embedding_model: str = EMBEDDING_MODEL,
#         llm_model: str       = LLM_MODEL,
#         chroma_path: str     = CHROMA_PATH,
#     ):
#         self.retriever = Retriever(
#             lmstudio_url=lmstudio_url,
#             embedding_model=embedding_model,
#             chroma_path=chroma_path,
#         )
#         self.llm = LLMClient(
#             base_url=lmstudio_url,
#             model=llm_model,
#             max_tokens=512,
#             temperature=0.4,
#         )

#     # ── Pregunta inicial ──────────────────────────────────────────────

#     def primera_pregunta(self) -> dict:
#         """Retorna siempre la misma pregunta de apertura (sin llamar al LLM)."""
#         return {
#             "turno": 1,
#             "texto": "¡Hola! Para ayudarte a encontrar tu carrera ideal en la UTMACH, "
#                      "vamos a hacerte algunas preguntas. ¿Con cuál de estas actividades "
#                      "disfrutas más tu tiempo?",
#             "tipo": "opciones",
#             "opciones": [
#                 "Resolver problemas matemáticos o lógicos",
#                 "Crear cosas con mis manos o de forma artística",
#                 "Ayudar o trabajar con otras personas",
#                 "Investigar, leer y aprender cosas nuevas",
#             ],
#             "permite_texto_libre": True,
#             "es_recomendacion": False,
#         }

#     # ── Siguiente pregunta ────────────────────────────────────────────

#     def siguiente_paso(self, perfil: dict, historial: list[dict], turno: int) -> dict:
#         """
#         Decide si generar otra pregunta o emitir la recomendación.

#         Args:
#             perfil:    Perfil acumulado del estudiante (dict).
#             historial: Lista de turnos anteriores {"pregunta": str, "respuesta": str}.
#             turno:     Número del turno actual (empieza en 1).

#         Returns:
#             Dict con la pregunta O con la recomendación.
#             Siempre incluye "es_recomendacion": bool y "turno": int.
#         """
#         # Turno 1-4: siempre pregunta
#         if turno <= MIN_PREGUNTAS:
#             return self._generar_pregunta(perfil, historial, turno)

#         # Turno 13+: forzar recomendación
#         if turno > MAX_PREGUNTAS:
#             logger.info("Turno %d: forzando recomendación (límite máximo).", turno)
#             return self._generar_recomendacion(perfil, turno)

#         # Turnos 5-12: el LLM decide
#         if self._perfil_suficiente(perfil, historial):
#             logger.info("Turno %d: perfil suficiente, generando recomendación.", turno)
#             return self._generar_recomendacion(perfil, turno)

#         return self._generar_pregunta(perfil, historial, turno)

#     # ── Generar pregunta ──────────────────────────────────────────────

#     def _generar_pregunta(self, perfil: dict, historial: list[dict], turno: int) -> dict:
#         """Llama al LLM para generar la siguiente pregunta adaptativa."""

#         historial_txt = self._formatear_historial(historial)
#         perfil_txt    = json.dumps(perfil, ensure_ascii=False, indent=2)

#         prompt = (
#             f"PERFIL ACUMULADO DEL ESTUDIANTE:\n{perfil_txt}\n\n"
#             f"HISTORIAL DE PREGUNTAS Y RESPUESTAS:\n{historial_txt}\n\n"
#             f"Genera la pregunta número {turno} para conocer mejor al estudiante. "
#             f"Explora áreas que aún no se hayan cubierto en el historial."
#         )

#         respuesta_raw = self.llm.generar(
#             pregunta=prompt,
#             chunks=[],
#             system_prompt=SYSTEM_GENERAR_PREGUNTA,
#         )

#         pregunta = self._parsear_json(respuesta_raw)

#         if not pregunta or "texto" not in pregunta:
#             logger.warning("LLM no retornó pregunta válida, usando fallback.")
#             pregunta = self._pregunta_fallback(turno)

#         pregunta["turno"]            = turno
#         pregunta["es_recomendacion"] = False
#         return pregunta

#     # ── Evaluar si el perfil es suficiente ───────────────────────────

#     def _perfil_suficiente(self, perfil: dict, historial: list[dict]) -> bool:
#         """Pregunta al LLM si el perfil ya tiene suficiente info para recomendar."""
#         perfil_txt    = json.dumps(perfil, ensure_ascii=False, indent=2)
#         historial_txt = self._formatear_historial(historial)

#         prompt = (
#             f"PERFIL ACUMULADO:\n{perfil_txt}\n\n"
#             f"HISTORIAL:\n{historial_txt}\n\n"
#             f"¿Hay suficiente información para recomendar carreras universitarias?"
#         )

#         respuesta_raw = self.llm.generar(
#             pregunta=prompt,
#             chunks=[],
#             system_prompt=SYSTEM_EVALUAR_PERFIL,
#         )

#         resultado = self._parsear_json(respuesta_raw)
#         if resultado and isinstance(resultado.get("suficiente"), bool):
#             return resultado["suficiente"]

#         # Si el LLM no responde bien, ser conservador y seguir preguntando
#         return False

#     # ── Generar recomendación ─────────────────────────────────────────

#     def _generar_recomendacion(self, perfil: dict, turno: int) -> dict:
#         """
#         Recupera mallas relevantes desde ChromaDB y genera el ranking de carreras.
#         """
#         # Construir consulta de búsqueda desde el perfil
#         consulta = self._perfil_a_consulta(perfil)

#         # Recuperar chunks de mallas (top 8 para tener variedad de carreras)
#         chunks = self.retriever.buscar(
#             consulta,
#             coleccion="malla",
#             top_k=8,
#         )

#         # También recuperar chunks vocacionales para enriquecer el contexto
#         chunks_voc = self.retriever.buscar(
#             consulta,
#             coleccion="vocacional",
#             top_k=3,
#         )

#         todos_chunks = chunks + chunks_voc
#         perfil_txt   = json.dumps(perfil, ensure_ascii=False, indent=2)

#         prompt = (
#             f"PERFIL DEL ESTUDIANTE:\n{perfil_txt}\n\n"
#             f"Basándote en el CONTEXTO de las mallas curriculares, "
#             f"recomienda las carreras que mejor se ajusten a este perfil."
#         )

#         respuesta_raw = self.llm.generar(
#             pregunta=prompt,
#             chunks=todos_chunks,
#             system_prompt=SYSTEM_RECOMENDAR,
#         )

#         recomendacion = self._parsear_json(respuesta_raw)

#         if not recomendacion or "carreras" not in recomendacion:
#             logger.warning("LLM no generó recomendación válida.")
#             recomendacion = {
#                 "carreras": [],
#                 "resumen_perfil": "No se pudo generar una recomendación con la información disponible.",
#             }

#         recomendacion["turno"]            = turno
#         recomendacion["es_recomendacion"] = True
#         return recomendacion

#     # ── Actualizar perfil ─────────────────────────────────────────────

#     def actualizar_perfil(self, perfil: dict, pregunta: dict, respuesta_texto: str) -> dict:
#         """
#         Extrae información del perfil a partir de la respuesta del estudiante.
#         Versión liviana basada en keywords; no consume tokens del LLM.

#         Args:
#             perfil:          Perfil actual (se modifica in-place y se retorna).
#             pregunta:        Dict de la pregunta que se respondió.
#             respuesta_texto: Lo que respondió el estudiante.

#         Returns:
#             Perfil actualizado.
#         """
#         resp = respuesta_texto.lower()

#         # ── Intereses ──
#         mapa_intereses = {
#             "matemática": "matemáticas/lógica",
#             "lógic":      "matemáticas/lógica",
#             "programac":  "tecnología/programación",
#             "computac":   "tecnología/programación",
#             "sistema":    "tecnología/programación",
#             "datos":      "tecnología/datos",
#             "inteligencia artificial": "tecnología/datos",
#             "arte":       "artes/diseño",
#             "diseño":     "artes/diseño",
#             "música":     "artes",
#             "personas":   "trabajo con personas",
#             "ayudar":     "trabajo con personas",
#             "salud":      "salud",
#             "medicina":   "salud",
#             "enferm":     "salud",
#             "natural":    "ciencias naturales",
#             "biolog":     "ciencias naturales",
#             "química":    "ciencias naturales",
#             "negocio":    "negocios/economía",
#             "empresa":    "negocios/economía",
#             "administr":  "negocios/economía",
#             "derecho":    "ciencias sociales/derecho",
#             "ley":        "ciencias sociales/derecho",
#             "educ":       "educación",
#             "enseñar":    "educación",
#             "construc":   "ingeniería/construcción",
#             "ingenier":   "ingeniería/construcción",
#             "campo":      "agropecuaria/ambiente",
#             "agricultur": "agropecuaria/ambiente",
#             "ambiente":   "agropecuaria/ambiente",
#             "comunic":    "comunicación/periodismo",
#             "investig":   "investigación/ciencia",
#         }

#         intereses = perfil.get("intereses", [])
#         for kw, area in mapa_intereses.items():
#             if kw in resp and area not in intereses:
#                 intereses.append(area)
#         perfil["intereses"] = intereses

#         # ── Entorno preferido ──
#         if any(k in resp for k in ["oficina", "computador", "escritorio", "interior"]):
#             perfil["entorno"] = "interior/oficina"
#         elif any(k in resp for k in ["exterior", "campo", "naturaleza", "aire libre"]):
#             perfil["entorno"] = "exterior/naturaleza"
#         elif any(k in resp for k in ["laboratorio", "lab"]):
#             perfil["entorno"] = "laboratorio"
#         elif any(k in resp for k in ["hospital", "clínica", "paciente"]):
#             perfil["entorno"] = "salud/clínica"

#         # ── Modalidad de trabajo ──
#         if any(k in resp for k in ["equipo", "grupo", "colaborar", "personas"]):
#             perfil["modalidad"] = "trabajo en equipo"
#         elif any(k in resp for k in ["solo", "independ", "individual"]):
#             perfil["modalidad"] = "trabajo independiente"

#         # ── Escala (si la pregunta era de escala 1-5) ──
#         if pregunta.get("tipo") == "escala":
#             try:
#                 valor = int(re.search(r"\d", resp).group())
#                 area_pregunta = pregunta.get("texto", "")[:40]
#                 perfil.setdefault("escalas", {})[area_pregunta] = valor
#             except (AttributeError, ValueError):
#                 pass

#         return perfil

#     # ── Utilidades ────────────────────────────────────────────────────

#     @staticmethod
#     def _formatear_historial(historial: list[dict]) -> str:
#         if not historial:
#             return "(sin historial aún)"
#         lineas = []
#         for i, turno in enumerate(historial, start=1):
#             lineas.append(f"P{i}: {turno.get('pregunta', '')}")
#             lineas.append(f"R{i}: {turno.get('respuesta', '')}")
#         return "\n".join(lineas)

#     @staticmethod
#     def _perfil_a_consulta(perfil: dict) -> str:
#         """Convierte el perfil acumulado en una consulta de texto para el retriever."""
#         partes = []
#         if perfil.get("intereses"):
#             partes.append("intereses en " + ", ".join(perfil["intereses"]))
#         if perfil.get("entorno"):
#             partes.append(f"entorno preferido: {perfil['entorno']}")
#         if perfil.get("modalidad"):
#             partes.append(perfil["modalidad"])
#         if not partes:
#             return "carreras universitarias UTMACH perfil estudiante"
#         return "carrera universitaria para estudiante con " + "; ".join(partes)

#     @staticmethod
#     def _parsear_json(texto: str) -> dict | None:
#         """Extrae el primer objeto JSON válido de la respuesta del LLM."""
#         if not texto:
#             return None
#         # Limpiar bloques markdown ```json ... ```
#         texto = re.sub(r"```(?:json)?", "", texto).strip("`").strip()
#         # Buscar el primer { ... } balanceado
#         match = re.search(r"\{.*\}", texto, re.DOTALL)
#         if not match:
#             return None
#         try:
#             return json.loads(match.group())
#         except json.JSONDecodeError:
#             logger.warning("JSON inválido del LLM: %s", texto[:200])
#             return None

#     @staticmethod
#     def _pregunta_fallback(turno: int) -> dict:
#         """Preguntas de respaldo si el LLM falla al generar JSON."""
#         fallbacks = [
#             {
#                 "texto": "¿Qué materia escolar disfrutas más?",
#                 "tipo": "opciones",
#                 "opciones": ["Matemáticas", "Ciencias naturales", "Lenguaje/Literatura", "Historia/Sociales"],
#                 "permite_texto_libre": True,
#             },
#             {
#                 "texto": "¿Cómo prefieres trabajar?",
#                 "tipo": "opciones",
#                 "opciones": ["Solo/a y concentrado/a", "En equipo con otros", "Mezclando ambos", "Depende del proyecto"],
#                 "permite_texto_libre": False,
#             },
#             {
#                 "texto": "¿Qué tan importante es para ti ayudar directamente a otras personas en tu trabajo futuro?",
#                 "tipo": "escala",
#                 "opciones": ["1 - Nada importante", "2", "3", "4", "5 - Muy importante"],
#                 "permite_texto_libre": False,
#             },
#             {
#                 "texto": "Si pudieras pasar un día haciendo cualquier actividad, ¿cuál elegirías?",
#                 "tipo": "texto_libre",
#                 "opciones": [],
#                 "permite_texto_libre": True,
#             },
#         ]
#         idx = (turno - 2) % len(fallbacks)
#         return fallbacks[idx]