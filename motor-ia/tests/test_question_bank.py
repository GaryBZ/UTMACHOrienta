import unittest

from pipeline.question_bank import QuestionBank


class QuestionBankTest(unittest.TestCase):
    def test_carga_y_valida_preguntas(self):
        bank = QuestionBank()
        primera = bank.primera()

        self.assertEqual(primera["id"], "q_intereses_01")
        self.assertEqual(primera["tipo"], "opciones")
        self.assertTrue(primera["opciones_texto"])
        self.assertTrue(primera["opciones"])

    def test_secuencia_inicial_tiene_variedad(self):
        bank = QuestionBank()
        tipos = [bank.por_turno(turno)["tipo"] for turno in range(1, 7)]

        self.assertIn("opciones", tipos)
        self.assertIn("multiple", tipos)
        self.assertIn("escala", tipos)

    def test_busca_por_id_y_texto(self):
        bank = QuestionBank()
        pregunta = bank.por_id("q_habilidades_01")
        por_texto = bank.buscar_por_texto(pregunta["texto"])

        self.assertEqual(pregunta["id"], por_texto["id"])


if __name__ == "__main__":
    unittest.main()
