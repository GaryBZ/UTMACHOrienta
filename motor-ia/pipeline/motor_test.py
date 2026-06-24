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
from pipeline.adaptive_policy import AdaptivePolicy
from pipeline.affinity_engine import AffinityEngine
from pipeline.question_bank import QuestionBank
from settings import CHROMA_PATH, EMBEDDING_MODEL, LLM_MODEL, LMSTUDIO_URL

logger = logging.getLogger(__name__)

MIN_PREGUNTAS = 6
MAX_PREGUNTAS = 12

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

SYSTEM_GENERAR_PREGUNTA_ADAPTATIVA = """Eres un redactor de preguntas vocacionales para UTMACHOrienta. \
El motor ya decidio la estrategia; tu unica tarea es redactar UNA pregunta alineada al objetivo recibido.

Reglas estrictas:
- Responde SOLO con un objeto JSON valido, sin markdown ni explicaciones.
- El JSON debe tener exactamente:
{
  "texto": "texto de la pregunta",
  "tipo": "opciones" | "escala" | "texto_libre" | "multiple",
  "opciones": ["op1", "op2", "op3", "op4"],
  "permite_texto_libre": true | false
}
- No menciones carreras universitarias especificas.
- No repitas preguntas del historial.
- Prefiere opciones, multiple o escala. Usa texto_libre solo si el objetivo pide matices.
- Si el tipo no es texto_libre, incluye entre 3 y 5 opciones claras.
- Redacta en espanol ecuatoriano, con tono cercano y directo."""

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
EXCLUSIVAMENTE en el CONTEXTO proporcionado y en el perfil del estudiante.

Reglas:
- Recomienda entre 1 y 3 carreras según cuántas realmente encajen con el perfil.
- NO inventes carreras. Solo puedes recomendar las que aparecen en el CONTEXTO.
- Prioriza las fichas de carrera para identificar compatibilidad vocacional.
- Usa las mallas curriculares para fundamentar con materias representativas.
- Usa el contexto vocacional solo para explicar el perfil, no para inventar carreras.
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
            max_tokens=900,
            temperature=0.4,
        )
        self.question_bank = QuestionBank()
        self.affinity_engine = AffinityEngine()
        self.adaptive_policy = AdaptivePolicy()

    # ── Pregunta inicial ──────────────────────────────────────────────

    def primera_pregunta(self) -> dict:
        """Retorna la primera pregunta estructurada del banco."""
        return self._pregunta_desde_banco(1)

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
        if turno <= max(MIN_PREGUNTAS, self.question_bank.total_preguntas()):
            return self._pregunta_desde_banco(turno)

        # Turno 13+: forzar recomendación
        if turno > MAX_PREGUNTAS:
            logger.info("Turno %d: forzando recomendación (límite máximo).", turno)
            return self._generar_recomendacion(perfil, turno)

        if self._perfil_suficiente(perfil, historial):
            logger.info("Turno %d: perfil suficiente, generando recomendación.", turno)
            return self._generar_recomendacion(perfil, turno)

        if turno <= self.question_bank.total_preguntas():
            return self._pregunta_desde_banco(turno)

        objetivo = self.adaptive_policy.decidir(perfil, historial)
        return self._generar_pregunta_adaptativa(perfil, historial, turno, objetivo)

    def obtener_pregunta(self, pregunta_id: str | None = None, pregunta_texto: str = "") -> dict | None:
        """Recupera una pregunta estructurada por id o texto para compatibilidad."""
        return self.question_bank.por_id(pregunta_id) or self.question_bank.buscar_por_texto(pregunta_texto)

    def normalizar_respuesta(
        self,
        pregunta: dict | None,
        respuesta_texto: str,
        opcion_ids: list[str] | None = None,
        texto_libre: str | None = None,
    ) -> dict:
        """Convierte respuestas nuevas o legadas en texto + opcion_ids auditable."""
        opcion_ids = opcion_ids or []
        texto = (texto_libre or respuesta_texto or "").strip()
        opciones = []

        if pregunta:
            if pregunta.get("opciones_detalle"):
                ids = set(opcion_ids or [])
                opciones = [
                    op for op in pregunta.get("opciones_detalle", [])
                    if op.get("id") in ids
                ]
            if not opciones:
                opciones = self.question_bank.opciones_por_ids(pregunta, opcion_ids)
            if not opciones and texto:
                opciones_disponibles = pregunta.get("opciones_detalle") or pregunta.get("opciones", [])
                if pregunta.get("tipo") == "multiple":
                    partes = [p.strip() for p in texto.split(";") if p.strip()]
                    for parte in partes:
                        opcion = self._opcion_por_texto_en_lista(opciones_disponibles, parte)
                        if opcion:
                            opciones.append(opcion)
                else:
                    opcion = self._opcion_por_texto_en_lista(opciones_disponibles, texto)
                    if opcion:
                        opciones.append(opcion)

            if opciones:
                opcion_ids = [op["id"] for op in opciones]
                texto = "; ".join(op["texto"] for op in opciones)

        return {
            "respuesta_texto": texto,
            "opcion_ids": opcion_ids,
            "opciones": opciones,
            "texto_libre": texto_libre,
        }

    @staticmethod
    def _opcion_por_texto_en_lista(opciones: list, texto: str) -> dict | None:
        texto_limpio = (texto or "").strip()
        for opcion in opciones:
            if isinstance(opcion, dict):
                if opcion.get("texto", "").strip() == texto_limpio:
                    return opcion
            elif str(opcion).strip() == texto_limpio:
                return {"id": "", "texto": str(opcion), "pesos_area": {}}
        return None

    def estado_parcial(self, perfil: dict) -> dict:
        return self.affinity_engine.estado_parcial(perfil)

    def _pregunta_desde_banco(self, turno: int) -> dict:
        pregunta = self.question_bank.por_turno(turno)
        return {
            "turno": turno,
            "id": pregunta["id"],
            "pregunta_id": pregunta["id"],
            "dimension": pregunta["dimension"],
            "texto": pregunta["texto"],
            "tipo": pregunta["tipo"],
            "opciones": pregunta["opciones_texto"],
            "opciones_detalle": pregunta.get("opciones", []),
            "permite_texto_libre": pregunta.get("permite_texto_libre", False),
            "es_recomendacion": False,
        }

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

        chunks_guia = self._buscar_contexto_seguro(
            "dimensiones vocacionales preguntas adaptativas intereses habilidades valores",
            coleccion="vocacional",
            top_k=3,
        )

        respuesta_raw = self.llm.generar(
            pregunta=prompt,
            chunks=chunks_guia,
            system_prompt=SYSTEM_GENERAR_PREGUNTA,
        )

        pregunta = self._parsear_json(respuesta_raw)

        if not pregunta or "texto" not in pregunta:
            logger.warning("LLM no retornó pregunta válida, usando fallback.")
            pregunta = self._pregunta_fallback(turno)

        pregunta["turno"]            = turno
        pregunta["es_recomendacion"] = False
        return pregunta

    def _generar_pregunta_adaptativa(
        self,
        perfil: dict,
        historial: list[dict],
        turno: int,
        objetivo: dict,
    ) -> dict:
        """Genera una pregunta con estrategia decidida por el motor."""
        historial_txt = self._formatear_historial(historial)
        perfil_txt = json.dumps(self.affinity_engine.estado_parcial(perfil), ensure_ascii=False, indent=2)
        objetivo_txt = json.dumps(objetivo, ensure_ascii=False, indent=2)

        prompt = (
            f"OBJETIVO DEL MOTOR:\n{objetivo_txt}\n\n"
            f"ESTADO PARCIAL:\n{perfil_txt}\n\n"
            f"HISTORIAL:\n{historial_txt}\n\n"
            "Redacta la siguiente pregunta adaptativa. No decidas si el test termina; solo redacta la pregunta."
        )

        chunks_guia = self._buscar_contexto_seguro(
            "preguntas adaptativas dimensiones vocacionales intereses habilidades valores",
            coleccion="vocacional",
            top_k=3,
        )
        respuesta_raw = self.llm.generar(
            pregunta=prompt,
            chunks=chunks_guia,
            system_prompt=SYSTEM_GENERAR_PREGUNTA_ADAPTATIVA,
        )
        pregunta = self._parsear_json(respuesta_raw)

        if not self._pregunta_llm_valida(pregunta, historial):
            logger.warning("Pregunta adaptativa inválida; usando fallback.")
            pregunta = self._pregunta_adaptativa_fallback(turno, objetivo)
        else:
            pregunta = self._normalizar_pregunta_adaptativa(pregunta, turno, objetivo, fuente="llm")

        return pregunta

    def _normalizar_pregunta_adaptativa(
        self,
        pregunta: dict,
        turno: int,
        objetivo: dict,
        fuente: str,
    ) -> dict:
        opciones = pregunta.get("opciones") or []
        opciones_detalle = [
            {
                "id": f"ad_t{turno}_op{i}",
                "texto": texto,
                "pesos_area": {},
            }
            for i, texto in enumerate(opciones, start=1)
        ]
        pregunta_id = f"qa_t{turno}_{objetivo.get('objetivo', 'adaptativa')}"
        return {
            "turno": turno,
            "id": pregunta_id,
            "pregunta_id": pregunta_id,
            "dimension": objetivo.get("dimension", "adaptativa"),
            "objetivo": objetivo.get("objetivo"),
            "areas_en_conflicto": objetivo.get("areas_en_conflicto", []),
            "texto": pregunta.get("texto", "").strip(),
            "tipo": pregunta.get("tipo", "opciones"),
            "opciones": opciones,
            "opciones_detalle": opciones_detalle,
            "permite_texto_libre": bool(pregunta.get("permite_texto_libre", True)),
            "es_recomendacion": False,
            "fuente": fuente,
        }

    def _pregunta_llm_valida(self, pregunta: dict | None, historial: list[dict]) -> bool:
        if not isinstance(pregunta, dict):
            return False
        texto = (pregunta.get("texto") or "").strip()
        tipo = pregunta.get("tipo")
        opciones = pregunta.get("opciones")
        if not texto or len(texto) > 240:
            return False
        if tipo not in {"opciones", "multiple", "escala", "texto_libre"}:
            return False
        if tipo != "texto_libre":
            if not isinstance(opciones, list) or not (2 <= len(opciones) <= 5):
                return False
            if any(not isinstance(op, str) or not op.strip() or len(op) > 120 for op in opciones):
                return False
        if tipo == "texto_libre" and opciones not in ([], None):
            return False
        if self._pregunta_repetida(texto, historial):
            return False
        if self._menciona_carrera(texto, opciones or []):
            return False
        return True

    @staticmethod
    def _pregunta_repetida(texto: str, historial: list[dict]) -> bool:
        normalizada = texto.strip().lower()
        return any(turno.get("pregunta", "").strip().lower() == normalizada for turno in historial)

    @staticmethod
    def _menciona_carrera(texto: str, opciones: list[str]) -> bool:
        contenido = " ".join([texto, *opciones]).lower()
        carreras = {
            "derecho",
            "medicina",
            "enfermería",
            "administración de empresas",
            "tecnologías de la información",
            "ciencia de datos",
            "inteligencia artificial",
            "agronomía",
            "turismo",
            "arquitectura",
            "contabilidad",
            "economía",
            "acuicultura",
            "alimentos",
        }
        return any(carrera in contenido for carrera in carreras)

    def _pregunta_adaptativa_fallback(self, turno: int, objetivo: dict) -> dict:
        objetivo_tipo = objetivo.get("objetivo")
        dimension = objetivo.get("dimension", "preferencias")
        areas = objetivo.get("areas_en_conflicto") or objetivo.get("areas_top") or []

        if objetivo_tipo == "desempatar_areas" and areas:
            texto = "Para afinar mejor tu perfil, ¿qué tipo de actividad te resultaría más motivadora?"
            opciones = [
                f"Profundizar en temas relacionados con {areas[0]}",
                f"Explorar actividades conectadas con {areas[1]}" if len(areas) > 1 else "Explorar otra área práctica",
                "Combinar varias áreas en proyectos aplicados",
                "Aún no estoy seguro/a y necesito comparar ejemplos",
            ]
            tipo = "opciones"
        elif dimension == "entorno":
            texto = "¿Qué ambiente de trabajo te ayudaría a rendir mejor?"
            opciones = ["Espacios tranquilos de análisis", "Trabajo con personas", "Campo o exteriores", "Laboratorio o espacios técnicos"]
            tipo = "opciones"
        elif dimension == "modalidad":
            texto = "Cuando aprendes algo nuevo, ¿qué forma de trabajo prefieres?"
            opciones = ["Resolverlo solo/a", "Conversarlo en equipo", "Liderar la organización", "Alternar según la tarea"]
            tipo = "opciones"
        elif dimension == "valores":
            texto = "¿Qué tan importante es para ti que tu carrera tenga estabilidad laboral?"
            opciones = ["1 - Poco importante", "2", "3", "4", "5 - Muy importante"]
            tipo = "escala"
        elif objetivo_tipo == "profundizar_area" and areas:
            texto = f"¿Qué te atrae más de las actividades relacionadas con {areas[0]}?"
            opciones = ["Resolver problemas", "Crear soluciones", "Ayudar a otros", "Investigar y aprender más"]
            tipo = "opciones"
        else:
            texto = "Cuéntame qué esperas sentir o lograr con tu futura profesión."
            opciones = []
            tipo = "texto_libre"

        pregunta = {
            "texto": texto,
            "tipo": tipo,
            "opciones": opciones,
            "permite_texto_libre": tipo != "escala",
        }
        return self._normalizar_pregunta_adaptativa(pregunta, turno, objetivo, fuente="fallback")

    # ── Evaluar si el perfil es suficiente ───────────────────────────

    def _perfil_suficiente(self, perfil: dict, historial: list[dict]) -> bool:
        """Decide suficiencia con reglas deterministas del motor."""
        return self.affinity_engine.perfil_suficiente(perfil)

    # ── Generar recomendación ─────────────────────────────────────────

    def _generar_recomendacion(self, perfil: dict, turno: int) -> dict:
        """
        Recupera mallas relevantes desde ChromaDB y genera el ranking de carreras.
        """
        # Construir consulta de búsqueda desde el perfil
        consulta = self._perfil_a_consulta(perfil)

        # Las fichas de carrera son la fuente principal para compatibilidad vocacional.
        chunks_carrera = self._buscar_contexto_seguro(
            consulta,
            coleccion="carrera",
            top_k=8,
        )

        # Las mallas fundamentan con materias y semestres de las carreras candidatas.
        chunks_malla = self._buscar_contexto_seguro(
            consulta,
            coleccion="malla",
            top_k=6,
        )

        # El contexto vocacional ayuda a redactar la explicación del perfil.
        chunks_voc = self._buscar_contexto_seguro(
            consulta,
            coleccion="vocacional",
            top_k=3,
        )

        todos_chunks = self._deduplicar_chunks(chunks_carrera + chunks_malla + chunks_voc)
        perfil_txt   = json.dumps(perfil, ensure_ascii=False, indent=2)

        prompt = (
            f"PERFIL DEL ESTUDIANTE:\n{perfil_txt}\n\n"
            f"Basándote en el CONTEXTO de fichas de carrera, mallas curriculares "
            f"y guías vocacionales, "
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

    def _buscar_contexto_seguro(self, consulta: str, coleccion: str, top_k: int) -> list[dict]:
        """Busca contexto sin romper el flujo si una colección falla."""
        try:
            chunks = self.retriever.buscar(consulta, coleccion=coleccion, top_k=top_k)
            for chunk in chunks:
                chunk["coleccion"] = coleccion
            return chunks
        except Exception as exc:
            logger.warning("No se pudo recuperar contexto de '%s': %s", coleccion, exc)
            return []

    @staticmethod
    def _deduplicar_chunks(chunks: list[dict]) -> list[dict]:
        vistos = set()
        resultado = []
        for chunk in chunks:
            meta = chunk.get("metadatos", {})
            clave = (
                meta.get("nombre_archivo"),
                meta.get("seccion"),
                meta.get("semestre"),
                chunk.get("texto", "")[:80],
            )
            if clave in vistos:
                continue
            vistos.add(clave)
            resultado.append(chunk)
        return resultado

    # ── Actualizar perfil ─────────────────────────────────────────────

    def actualizar_perfil(
        self,
        perfil: dict,
        pregunta: dict,
        respuesta_texto: str,
        opcion_ids: list[str] | None = None,
        turno: int | None = None,
    ) -> dict:
        """
        Actualiza el perfil con afinidades deterministas.
        """
        if not pregunta or not pregunta.get("id"):
            logger.warning("Pregunta no estructurada; perfil sin cambio determinista.")
            return perfil

        perfil = self.affinity_engine.actualizar(
            perfil,
            pregunta,
            opcion_ids=opcion_ids,
            respuesta_texto=respuesta_texto,
            turno=turno,
        )
        estado = self.affinity_engine.estado_parcial(perfil)
        logger.info("Perfil actualizado | top_areas=%s | confianza=%s", estado["top_areas"], estado["confianza"])
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
