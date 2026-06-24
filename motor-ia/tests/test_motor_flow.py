import unittest

from pipeline.motor_test import MotorTest


class MotorFlowTest(unittest.TestCase):
    def test_turno_7_usa_pregunta_libre_si_perfil_disperso(self):
        motor = MotorTest()
        perfil = {
            "afinidad": {
                "afinidades_area": {
                    "agropecuaria/ambiente": 0.9,
                    "artes/diseño": 0.85,
                    "ingeniería/construcción": 0.7,
                    "negocios/economía": 0.6417,
                    "trabajo con personas": 0.5417,
                },
                "confianza": 0.9062,
                "dimensiones_cubiertas": [
                    "intereses",
                    "habilidades",
                    "valores",
                    "entorno",
                    "modalidad",
                    "materias",
                ],
                "evidencias": [{"pregunta_id": f"q_{i}"} for i in range(6)],
            }
        }

        siguiente = motor.siguiente_paso(perfil, [], 7)

        self.assertFalse(siguiente["es_recomendacion"])
        self.assertEqual(siguiente["pregunta_id"], "q_texto_libre_01")
        self.assertEqual(siguiente["tipo"], "texto_libre")

    def test_despues_del_banco_usa_fallback_adaptativo_si_llm_falla(self):
        motor = MotorTest()
        motor.llm.generar = lambda *args, **kwargs: "no-json"
        perfil = {
            "afinidad": {
                "afinidades_area": {
                    "agropecuaria/ambiente": 0.9,
                    "artes/diseño": 0.85,
                    "ingeniería/construcción": 0.7,
                    "negocios/economía": 0.64,
                },
                "confianza": 0.91,
                "dimensiones_cubiertas": [
                    "intereses",
                    "habilidades",
                    "valores",
                    "entorno",
                    "modalidad",
                    "materias",
                    "matices",
                ],
                "evidencias": [{"pregunta_id": f"q_{i}"} for i in range(7)],
            }
        }

        siguiente = motor.siguiente_paso(perfil, [], 8)

        self.assertFalse(siguiente["es_recomendacion"])
        self.assertEqual(siguiente["fuente"], "fallback")
        self.assertEqual(siguiente["objetivo"], "desempatar_areas")
        self.assertTrue(siguiente["pregunta_id"].startswith("qa_t8_"))


if __name__ == "__main__":
    unittest.main()
