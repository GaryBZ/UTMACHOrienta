"""Politica determinista para decidir el siguiente objetivo adaptativo."""

from __future__ import annotations


DIMENSIONES_CRITICAS = ["intereses", "habilidades", "valores", "entorno", "modalidad"]


class AdaptivePolicy:
    """Elige que explorar despues del banco estructurado."""

    def decidir(self, perfil: dict, historial: list[dict] | None = None) -> dict:
        afinidad = (perfil or {}).get("afinidad", {})
        afinidades_area = afinidad.get("afinidades_area", {})
        dimensiones = set(afinidad.get("dimensiones_cubiertas", []))
        top_areas = self._top_areas(afinidades_area)

        faltantes = [dimension for dimension in DIMENSIONES_CRITICAS if dimension not in dimensiones]
        if faltantes:
            return {
                "objetivo": "explorar_dimension",
                "dimension": faltantes[0],
                "areas_en_conflicto": [],
                "areas_top": [area for area, _ in top_areas[:3]],
                "razon": f"Falta explorar la dimension {faltantes[0]}.",
            }

        if self._perfil_disperso(top_areas):
            return {
                "objetivo": "desempatar_areas",
                "dimension": "preferencias",
                "areas_en_conflicto": [area for area, _ in top_areas[:3]],
                "areas_top": [area for area, _ in top_areas[:5]],
                "razon": "Hay varias areas con puntajes cercanos y falta foco.",
            }

        if self._hay_empate(top_areas):
            return {
                "objetivo": "desempatar_areas",
                "dimension": "preferencias",
                "areas_en_conflicto": [area for area, _ in top_areas[:2]],
                "areas_top": [area for area, _ in top_areas[:5]],
                "razon": "Las dos areas principales estan muy cercanas.",
            }

        if top_areas:
            return {
                "objetivo": "profundizar_area",
                "dimension": "motivacion",
                "areas_en_conflicto": [],
                "areas_top": [top_areas[0][0]],
                "razon": f"Conviene profundizar el area dominante: {top_areas[0][0]}.",
            }

        return {
            "objetivo": "matizar_texto_libre",
            "dimension": "matices",
            "areas_en_conflicto": [],
            "areas_top": [],
            "razon": "No hay suficientes afinidades para orientar la siguiente pregunta.",
        }

    @staticmethod
    def _top_areas(afinidades_area: dict) -> list[tuple[str, float]]:
        return sorted(afinidades_area.items(), key=lambda item: item[1], reverse=True)

    @staticmethod
    def _hay_empate(top_areas: list[tuple[str, float]]) -> bool:
        if len(top_areas) < 2:
            return False
        return abs(top_areas[0][1] - top_areas[1][1]) <= 0.08

    @staticmethod
    def _perfil_disperso(top_areas: list[tuple[str, float]]) -> bool:
        if len(top_areas) < 4:
            return False
        return (top_areas[0][1] - top_areas[3][1]) < 0.30
