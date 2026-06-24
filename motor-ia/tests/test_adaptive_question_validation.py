import unittest

from pipeline.motor_test import MotorTest


class AdaptiveQuestionValidationTest(unittest.TestCase):
    def setUp(self):
        self.motor = MotorTest()

    def test_acepta_pregunta_valida(self):
        pregunta = {
            "texto": "¿Qué actividad te ayudaría a confirmar mejor tus intereses?",
            "tipo": "opciones",
            "opciones": ["Analizar información", "Crear soluciones", "Trabajar con personas"],
            "permite_texto_libre": True,
        }

        self.assertTrue(self.motor._pregunta_llm_valida(pregunta, []))

    def test_rechaza_tipo_invalido(self):
        pregunta = {
            "texto": "Pregunta",
            "tipo": "ranking",
            "opciones": ["A", "B"],
            "permite_texto_libre": False,
        }

        self.assertFalse(self.motor._pregunta_llm_valida(pregunta, []))

    def test_rechaza_pregunta_repetida(self):
        pregunta = {
            "texto": "¿Qué ambiente de trabajo prefieres?",
            "tipo": "opciones",
            "opciones": ["Oficina", "Campo", "Laboratorio"],
            "permite_texto_libre": False,
        }
        historial = [{"pregunta": "¿Qué ambiente de trabajo prefieres?", "respuesta": "Oficina"}]

        self.assertFalse(self.motor._pregunta_llm_valida(pregunta, historial))

    def test_rechaza_mencion_de_carrera(self):
        pregunta = {
            "texto": "¿Te interesaría estudiar Medicina?",
            "tipo": "opciones",
            "opciones": ["Sí", "No", "No estoy seguro"],
            "permite_texto_libre": False,
        }

        self.assertFalse(self.motor._pregunta_llm_valida(pregunta, []))

    def test_normaliza_pregunta_adaptativa(self):
        objetivo = {
            "objetivo": "desempatar_areas",
            "dimension": "preferencias",
            "areas_en_conflicto": ["tecnología/datos", "negocios/economía"],
        }
        pregunta = {
            "texto": "¿Qué tipo de reto prefieres?",
            "tipo": "opciones",
            "opciones": ["Analizar datos", "Organizar proyectos", "Crear contenido"],
            "permite_texto_libre": True,
        }

        normalizada = self.motor._normalizar_pregunta_adaptativa(pregunta, 8, objetivo, "llm")

        self.assertEqual(normalizada["pregunta_id"], "qa_t8_desempatar_areas")
        self.assertEqual(normalizada["areas_en_conflicto"], ["tecnología/datos", "negocios/economía"])
        self.assertEqual(len(normalizada["opciones_detalle"]), 3)


if __name__ == "__main__":
    unittest.main()
