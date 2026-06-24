"""Banco estructurado de preguntas para el flujo adaptativo."""

from __future__ import annotations

from copy import deepcopy


TIPOS_VALIDOS = {"opciones", "multiple", "escala", "texto_libre"}


PREGUNTAS_INICIALES: list[dict] = [
    {
        "id": "q_intereses_01",
        "dimension": "intereses",
        "tipo": "opciones",
        "texto": (
            "¡Hola! Para ayudarte a encontrar tu carrera ideal en la UTMACH, "
            "vamos a hacerte algunas preguntas. ¿Con cuál de estas actividades "
            "disfrutas más tu tiempo?"
        ),
        "permite_texto_libre": True,
        "opciones": [
            {
                "id": "op_logica",
                "texto": "Resolver problemas matemáticos o lógicos",
                "pesos_area": {
                    "matemáticas/lógica": 0.9,
                    "tecnología/datos": 0.45,
                    "investigación/ciencia": 0.3,
                },
            },
            {
                "id": "op_crear",
                "texto": "Crear cosas con mis manos o de forma artística",
                "pesos_area": {
                    "artes/diseño": 0.85,
                    "ingeniería/construcción": 0.35,
                    "comunicación/periodismo": 0.25,
                },
            },
            {
                "id": "op_ayudar",
                "texto": "Ayudar o trabajar con otras personas",
                "pesos_area": {
                    "trabajo con personas": 0.85,
                    "salud": 0.45,
                    "educación": 0.4,
                    "ciencias sociales/derecho": 0.35,
                },
            },
            {
                "id": "op_investigar",
                "texto": "Investigar, leer y aprender cosas nuevas",
                "pesos_area": {
                    "investigación/ciencia": 0.75,
                    "ciencias naturales": 0.45,
                    "ciencias sociales/derecho": 0.35,
                    "educación": 0.25,
                },
            },
        ],
    },
    {
        "id": "q_habilidades_01",
        "dimension": "habilidades",
        "tipo": "multiple",
        "texto": "¿En cuáles de estas habilidades sientes que destacas más?",
        "permite_texto_libre": True,
        "opciones": [
            {
                "id": "op_analisis_datos",
                "texto": "Analizar datos, patrones o información compleja",
                "pesos_area": {
                    "tecnología/datos": 0.85,
                    "matemáticas/lógica": 0.55,
                    "negocios/economía": 0.25,
                },
            },
            {
                "id": "op_comunicacion",
                "texto": "Comunicar ideas, argumentar o escribir con claridad",
                "pesos_area": {
                    "comunicación/periodismo": 0.8,
                    "ciencias sociales/derecho": 0.55,
                    "educación": 0.35,
                },
            },
            {
                "id": "op_cuidado",
                "texto": "Escuchar, cuidar o acompañar a otras personas",
                "pesos_area": {
                    "salud": 0.75,
                    "trabajo con personas": 0.65,
                    "educación": 0.4,
                },
            },
            {
                "id": "op_organizacion",
                "texto": "Organizar proyectos, recursos o equipos",
                "pesos_area": {
                    "negocios/economía": 0.75,
                    "turismo/idiomas": 0.35,
                    "ciencias sociales/derecho": 0.25,
                },
            },
            {
                "id": "op_naturaleza",
                "texto": "Observar la naturaleza, animales, cultivos o ambiente",
                "pesos_area": {
                    "agropecuaria/ambiente": 0.85,
                    "ciencias naturales": 0.45,
                    "investigación/ciencia": 0.25,
                },
            },
        ],
    },
    {
        "id": "q_valores_01",
        "dimension": "valores",
        "tipo": "escala",
        "texto": "¿Qué tan importante es para ti que tu futura carrera tenga impacto directo en la vida de las personas?",
        "permite_texto_libre": False,
        "opciones": [
            {"id": "op_valor_1", "texto": "1 - Nada importante", "valor": 1, "pesos_area": {}},
            {"id": "op_valor_2", "texto": "2", "valor": 2, "pesos_area": {}},
            {"id": "op_valor_3", "texto": "3", "valor": 3, "pesos_area": {}},
            {"id": "op_valor_4", "texto": "4", "valor": 4, "pesos_area": {}},
            {
                "id": "op_valor_5",
                "texto": "5 - Muy importante",
                "valor": 5,
                "pesos_area": {
                    "trabajo con personas": 0.35,
                    "salud": 0.3,
                    "educación": 0.25,
                    "ciencias sociales/derecho": 0.2,
                },
            },
        ],
    },
    {
        "id": "q_entorno_01",
        "dimension": "entorno",
        "tipo": "opciones",
        "texto": "¿En qué tipo de entorno te imaginas trabajando con más comodidad?",
        "permite_texto_libre": False,
        "opciones": [
            {
                "id": "op_entorno_oficina",
                "texto": "Oficina, computador o espacios de análisis",
                "pesos_area": {
                    "tecnología/datos": 0.45,
                    "negocios/economía": 0.35,
                    "ciencias sociales/derecho": 0.25,
                },
                "atributos": {"entorno": "interior/oficina"},
            },
            {
                "id": "op_entorno_laboratorio",
                "texto": "Laboratorio, clínica o espacios técnicos",
                "pesos_area": {
                    "salud": 0.45,
                    "ciencias naturales": 0.35,
                    "investigación/ciencia": 0.3,
                },
                "atributos": {"entorno": "laboratorio"},
            },
            {
                "id": "op_entorno_campo",
                "texto": "Campo, naturaleza, cultivos o trabajo al aire libre",
                "pesos_area": {
                    "agropecuaria/ambiente": 0.65,
                    "ciencias naturales": 0.25,
                    "ingeniería/construcción": 0.2,
                },
                "atributos": {"entorno": "exterior/naturaleza"},
            },
            {
                "id": "op_entorno_personas",
                "texto": "Espacios donde interactúe constantemente con personas",
                "pesos_area": {
                    "trabajo con personas": 0.55,
                    "turismo/idiomas": 0.35,
                    "educación": 0.3,
                    "comunicación/periodismo": 0.25,
                },
                "atributos": {"entorno": "interaccion/personas"},
            },
        ],
    },
    {
        "id": "q_modalidad_01",
        "dimension": "modalidad",
        "tipo": "opciones",
        "texto": "¿Cómo prefieres trabajar cuando tienes un reto importante?",
        "permite_texto_libre": False,
        "opciones": [
            {
                "id": "op_modalidad_individual",
                "texto": "Concentrarme por mi cuenta y resolverlo paso a paso",
                "pesos_area": {
                    "matemáticas/lógica": 0.25,
                    "tecnología/datos": 0.25,
                    "investigación/ciencia": 0.2,
                },
                "atributos": {"modalidad": "independiente"},
            },
            {
                "id": "op_modalidad_equipo",
                "texto": "Trabajar en equipo, conversar y coordinar ideas",
                "pesos_area": {
                    "trabajo con personas": 0.4,
                    "negocios/economía": 0.25,
                    "educación": 0.25,
                    "turismo/idiomas": 0.2,
                },
                "atributos": {"modalidad": "equipo"},
            },
            {
                "id": "op_modalidad_liderar",
                "texto": "Liderar, tomar decisiones y organizar el avance",
                "pesos_area": {
                    "negocios/economía": 0.45,
                    "ciencias sociales/derecho": 0.3,
                    "comunicación/periodismo": 0.2,
                },
                "atributos": {"modalidad": "liderazgo"},
            },
            {
                "id": "op_modalidad_flexible",
                "texto": "Alternar entre trabajo individual y colaborativo",
                "pesos_area": {
                    "tecnología/datos": 0.15,
                    "ingeniería/construcción": 0.15,
                    "trabajo con personas": 0.15,
                },
                "atributos": {"modalidad": "flexible"},
            },
        ],
    },
    {
        "id": "q_materias_01",
        "dimension": "materias",
        "tipo": "multiple",
        "texto": "¿Qué materias o temas te gustaría seguir explorando en la universidad?",
        "permite_texto_libre": True,
        "opciones": [
            {
                "id": "op_materia_programacion",
                "texto": "Programación, inteligencia artificial o sistemas",
                "pesos_area": {
                    "tecnología/programación": 0.85,
                    "tecnología/datos": 0.55,
                    "matemáticas/lógica": 0.25,
                },
            },
            {
                "id": "op_materia_salud",
                "texto": "Biología, salud humana o cuidado clínico",
                "pesos_area": {
                    "salud": 0.75,
                    "ciencias naturales": 0.35,
                    "trabajo con personas": 0.25,
                },
            },
            {
                "id": "op_materia_empresas",
                "texto": "Empresas, economía, ventas o emprendimiento",
                "pesos_area": {
                    "negocios/economía": 0.8,
                    "turismo/idiomas": 0.25,
                    "comunicación/periodismo": 0.2,
                },
            },
            {
                "id": "op_materia_leyes",
                "texto": "Leyes, sociedad, derechos o debate público",
                "pesos_area": {
                    "ciencias sociales/derecho": 0.8,
                    "comunicación/periodismo": 0.25,
                    "trabajo con personas": 0.2,
                },
            },
            {
                "id": "op_materia_ambiente",
                "texto": "Ambiente, producción agropecuaria o alimentos",
                "pesos_area": {
                    "agropecuaria/ambiente": 0.75,
                    "ciencias naturales": 0.35,
                    "investigación/ciencia": 0.2,
                },
            },
        ],
    },
    {
        "id": "q_texto_libre_01",
        "dimension": "matices",
        "tipo": "texto_libre",
        "texto": "Cuéntame en una frase qué problema te gustaría ayudar a resolver en el futuro.",
        "opciones": [],
        "permite_texto_libre": True,
    },
]


class QuestionBank:
    """Carga y entrega preguntas estructuradas del test."""

    def __init__(self, preguntas: list[dict] | None = None):
        self._preguntas = deepcopy(preguntas or PREGUNTAS_INICIALES)
        self._por_id = {pregunta["id"]: pregunta for pregunta in self._preguntas}
        self.validar()

    def validar(self) -> None:
        ids = set()
        opcion_ids = set()
        for pregunta in self._preguntas:
            pregunta_id = pregunta.get("id")
            if not pregunta_id or pregunta_id in ids:
                raise ValueError(f"Pregunta duplicada o sin id: {pregunta_id}")
            ids.add(pregunta_id)
            if pregunta.get("tipo") not in TIPOS_VALIDOS:
                raise ValueError(f"Tipo inválido en {pregunta_id}: {pregunta.get('tipo')}")
            if not pregunta.get("dimension"):
                raise ValueError(f"Pregunta sin dimension: {pregunta_id}")
            if pregunta.get("tipo") != "texto_libre" and not pregunta.get("opciones"):
                raise ValueError(f"Pregunta sin opciones: {pregunta_id}")
            for opcion in pregunta.get("opciones", []):
                opcion_id = opcion.get("id")
                if not opcion_id or opcion_id in opcion_ids:
                    raise ValueError(f"Opción duplicada o sin id: {opcion_id}")
                opcion_ids.add(opcion_id)

    def primera(self) -> dict:
        return self.por_turno(1)

    def por_turno(self, turno: int) -> dict:
        idx = max(turno - 1, 0)
        if idx >= len(self._preguntas):
            idx = len(self._preguntas) - 1
        return self._serializar(self._preguntas[idx], turno)

    def total_preguntas(self) -> int:
        return len(self._preguntas)

    def por_id(self, pregunta_id: str | None) -> dict | None:
        if not pregunta_id:
            return None
        pregunta = self._por_id.get(pregunta_id)
        if not pregunta:
            return None
        return self._serializar(pregunta)

    def buscar_por_texto(self, texto: str) -> dict | None:
        texto_limpio = (texto or "").strip()
        for pregunta in self._preguntas:
            if pregunta.get("texto", "").strip() == texto_limpio:
                return self._serializar(pregunta)
        return None

    def opcion_por_texto(self, pregunta: dict, texto: str) -> dict | None:
        texto_limpio = (texto or "").strip()
        for opcion in pregunta.get("opciones", []):
            if opcion.get("texto", "").strip() == texto_limpio:
                return deepcopy(opcion)
        return None

    def opciones_por_ids(self, pregunta: dict, opcion_ids: list[str] | None) -> list[dict]:
        ids = set(opcion_ids or [])
        return [deepcopy(op) for op in pregunta.get("opciones", []) if op.get("id") in ids]

    @staticmethod
    def _serializar(pregunta: dict, turno: int | None = None) -> dict:
        data = deepcopy(pregunta)
        data["opciones_texto"] = [op["texto"] for op in data.get("opciones", [])]
        if turno is not None:
            data["turno"] = turno
        return data
