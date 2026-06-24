import unittest

from pipeline.affinity_engine import AffinityEngine
from pipeline.question_bank import QuestionBank


class AffinityEngineTest(unittest.TestCase):
    def setUp(self):
        self.bank = QuestionBank()
        self.engine = AffinityEngine()

    def test_opcion_unica_suma_pesos(self):
        pregunta = self.bank.por_id("q_intereses_01")
        perfil = self.engine.actualizar(
            {},
            pregunta,
            opcion_ids=["op_logica"],
            respuesta_texto="Resolver problemas matemáticos o lógicos",
            turno=1,
        )

        afinidades = perfil["afinidad"]["afinidades_area"]
        self.assertGreater(afinidades["matemáticas/lógica"], 0.8)
        self.assertIn("intereses", perfil["afinidad"]["dimensiones_cubiertas"])

    def test_multiple_acumula_varias_opciones(self):
        pregunta = self.bank.por_id("q_habilidades_01")
        perfil = self.engine.actualizar(
            {},
            pregunta,
            opcion_ids=["op_analisis_datos", "op_comunicacion"],
            respuesta_texto="Analizar datos; Comunicar ideas",
            turno=2,
        )

        afinidades = perfil["afinidad"]["afinidades_area"]
        self.assertIn("tecnología/datos", afinidades)
        self.assertIn("comunicación/periodismo", afinidades)

    def test_no_duplica_evidencias_por_pregunta(self):
        pregunta = self.bank.por_id("q_intereses_01")
        perfil = self.engine.actualizar({}, pregunta, opcion_ids=["op_logica"], turno=1)
        perfil = self.engine.actualizar(perfil, pregunta, opcion_ids=["op_ayudar"], turno=1)

        self.assertEqual(len(perfil["afinidad"]["evidencias"]), 1)

    def test_confianza_y_estado_parcial(self):
        perfil = {}
        respuestas = [
            ("q_intereses_01", ["op_logica"]),
            ("q_habilidades_01", ["op_analisis_datos"]),
            ("q_valores_01", ["op_valor_5"]),
            ("q_entorno_01", ["op_entorno_oficina"]),
            ("q_modalidad_01", ["op_modalidad_individual"]),
            ("q_materias_01", ["op_materia_programacion"]),
        ]
        for turno, (pregunta_id, opcion_ids) in enumerate(respuestas, start=1):
            pregunta = self.bank.por_id(pregunta_id)
            perfil = self.engine.actualizar(perfil, pregunta, opcion_ids=opcion_ids, turno=turno)

        estado = self.engine.estado_parcial(perfil)
        self.assertGreaterEqual(estado["confianza"], 0.7)
        self.assertGreaterEqual(len(estado["dimensiones_cubiertas"]), 4)
        self.assertTrue(self.engine.perfil_suficiente(perfil))

    def test_perfil_disperso_no_es_suficiente(self):
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

        self.assertFalse(self.engine.perfil_suficiente(perfil))


if __name__ == "__main__":
    unittest.main()
