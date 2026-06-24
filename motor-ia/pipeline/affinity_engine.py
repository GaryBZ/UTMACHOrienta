"""Calculo determinista de afinidades vocacionales."""

from __future__ import annotations

from copy import deepcopy


DIMENSIONES_CRITICAS = {"intereses", "habilidades", "valores", "entorno", "modalidad"}
MIN_RESPUESTAS_RECOMENDACION = 6
UMBRAL_CONFIANZA = 0.70
UMBRAL_GAP_TOP_AREAS = 0.08
UMBRAL_ENFOQUE_TOP = 0.25


class AffinityEngine:
    """Actualiza afinidades, evidencias y confianza a partir de opciones elegidas."""

    def actualizar(
        self,
        perfil: dict,
        pregunta: dict,
        opcion_ids: list[str] | None = None,
        respuesta_texto: str = "",
        turno: int | None = None,
    ) -> dict:
        perfil = deepcopy(perfil or {})
        afinidad = perfil.setdefault("afinidad", self.estado_inicial())
        pregunta_id = pregunta.get("id")

        if self._evidencia_ya_registrada(afinidad, pregunta_id):
            return perfil

        opciones = self._seleccionar_opciones(pregunta, opcion_ids, respuesta_texto)
        impacto = self._calcular_impacto(pregunta, opciones)
        afinidades_area = afinidad.setdefault("afinidades_area", {})

        for area, peso in impacto.items():
            afinidades_area[area] = round(min(1.0, afinidades_area.get(area, 0.0) + peso), 4)

        atributos = self._extraer_atributos(opciones)
        if atributos.get("entorno"):
            perfil["entorno"] = atributos["entorno"]
        if atributos.get("modalidad"):
            perfil["modalidad"] = atributos["modalidad"]

        dimension = pregunta.get("dimension")
        if dimension:
            dimensiones = afinidad.setdefault("dimensiones_cubiertas", [])
            if dimension not in dimensiones:
                dimensiones.append(dimension)

        evidencia = {
            "turno": turno,
            "pregunta_id": pregunta_id,
            "dimension": dimension,
            "respuesta": respuesta_texto,
            "opcion_ids": [op["id"] for op in opciones],
            "impacto": impacto,
        }
        afinidad.setdefault("evidencias", []).append(evidencia)
        self._recalcular_estado(perfil)
        return perfil

    def estado_parcial(self, perfil: dict) -> dict:
        afinidad = (perfil or {}).get("afinidad", {})
        afinidades_area = afinidad.get("afinidades_area", {})
        top_areas = sorted(
            [{"area": area, "puntaje": puntaje} for area, puntaje in afinidades_area.items()],
            key=lambda item: item["puntaje"],
            reverse=True,
        )[:5]
        return {
            "top_areas": top_areas,
            "confianza": afinidad.get("confianza", 0.0),
            "dimensiones_cubiertas": afinidad.get("dimensiones_cubiertas", []),
            "respuestas_contabilizadas": len(afinidad.get("evidencias", [])),
        }

    def perfil_suficiente(self, perfil: dict) -> bool:
        afinidad = (perfil or {}).get("afinidad", {})
        evidencias = afinidad.get("evidencias", [])
        if len(evidencias) < MIN_RESPUESTAS_RECOMENDACION:
            return False
        if afinidad.get("confianza", 0.0) < UMBRAL_CONFIANZA:
            return False

        dimensiones = set(afinidad.get("dimensiones_cubiertas", []))
        if len(dimensiones) < 4:
            return False
        if len(DIMENSIONES_CRITICAS - dimensiones) > 1:
            return False

        top = sorted(afinidad.get("afinidades_area", {}).values(), reverse=True)
        return self._enfoque_suficiente(top)

    @staticmethod
    def estado_inicial() -> dict:
        return {
            "afinidades_area": {},
            "confianza": 0.0,
            "dimensiones_cubiertas": [],
            "evidencias": [],
        }

    @staticmethod
    def _evidencia_ya_registrada(afinidad: dict, pregunta_id: str | None) -> bool:
        if not pregunta_id:
            return False
        return any(ev.get("pregunta_id") == pregunta_id for ev in afinidad.get("evidencias", []))

    @staticmethod
    def _seleccionar_opciones(pregunta: dict, opcion_ids: list[str] | None, respuesta_texto: str) -> list[dict]:
        ids = set(opcion_ids or [])
        opciones = [op for op in pregunta.get("opciones", []) if op.get("id") in ids]
        if opciones:
            return opciones

        respuesta = (respuesta_texto or "").strip()
        return [op for op in pregunta.get("opciones", []) if op.get("texto", "").strip() == respuesta]

    @staticmethod
    def _calcular_impacto(pregunta: dict, opciones: list[dict]) -> dict:
        impacto: dict[str, float] = {}
        if not opciones:
            return impacto

        divisor = max(len(opciones), 1) if pregunta.get("tipo") == "multiple" else 1
        for opcion in opciones:
            factor = 1.0
            if pregunta.get("tipo") == "escala":
                factor = max(float(opcion.get("valor", 0)) / 5.0, 0.0)
            for area, peso in (opcion.get("pesos_area") or {}).items():
                impacto[area] = impacto.get(area, 0.0) + (float(peso) * factor / divisor)

        return {area: round(valor, 4) for area, valor in impacto.items() if valor > 0}

    @staticmethod
    def _extraer_atributos(opciones: list[dict]) -> dict:
        atributos = {}
        for opcion in opciones:
            atributos.update(opcion.get("atributos") or {})
        return atributos

    def _recalcular_estado(self, perfil: dict) -> None:
        afinidad = perfil.setdefault("afinidad", self.estado_inicial())
        afinidades_area = afinidad.get("afinidades_area", {})
        evidencias = afinidad.get("evidencias", [])
        dimensiones = afinidad.get("dimensiones_cubiertas", [])

        top_areas = [
            area for area, _ in sorted(
                afinidades_area.items(),
                key=lambda item: item[1],
                reverse=True,
            )[:5]
        ]
        perfil["intereses"] = top_areas

        cobertura = min(len(dimensiones) / 5.0, 1.0)
        volumen = min(len(evidencias) / float(MIN_RESPUESTAS_RECOMENDACION), 1.0)
        fuerza = min(sum(afinidades_area.values()) / 3.0, 1.0)
        dispersion = self._dispersion(afinidades_area)
        afinidad["confianza"] = round((0.35 * cobertura) + (0.25 * volumen) + (0.25 * fuerza) + (0.15 * dispersion), 4)

    @staticmethod
    def _dispersion(afinidades_area: dict) -> float:
        valores = sorted(afinidades_area.values(), reverse=True)
        if not valores:
            return 0.0
        if len(valores) == 1:
            return min(valores[0], 1.0)
        gap_principal = max(valores[0] - valores[1], 0.0)
        gap_cluster = max(valores[1] - valores[2], 0.0) if len(valores) > 2 else gap_principal
        return min(max(gap_principal, gap_cluster) / 0.4, 1.0)

    @staticmethod
    def _enfoque_suficiente(valores: list[float]) -> bool:
        if len(valores) < 2:
            return False

        tercer_puntaje = valores[2] if len(valores) >= 3 else 0.0
        cuarto_puntaje = valores[3] if len(valores) >= 4 else 0.0

        if (
            (valores[0] - valores[1]) >= UMBRAL_GAP_TOP_AREAS
            and (valores[0] - tercer_puntaje) >= UMBRAL_ENFOQUE_TOP
        ):
            return True

        if (
            (valores[0] - valores[1]) <= UMBRAL_GAP_TOP_AREAS
            and (valores[1] - cuarto_puntaje) >= UMBRAL_ENFOQUE_TOP
        ):
            return True
        return False
