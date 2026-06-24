import unittest

from api.main import PreguntaOutput, RespuestaInput


class ApiContractTest(unittest.TestCase):
    def test_respuesta_input_acepta_contrato_nuevo(self):
        payload = RespuestaInput(
            respuesta="Resolver problemas matemáticos o lógicos",
            pregunta_id="q_intereses_01",
            opcion_ids=["op_logica"],
            pregunta_texto="¿Con cuál actividad disfrutas más tu tiempo?",
            pregunta_tipo="opciones",
        )

        self.assertEqual(payload.pregunta_id, "q_intereses_01")
        self.assertEqual(payload.opcion_ids, ["op_logica"])

    def test_respuesta_input_sigue_aceptando_texto_legado(self):
        payload = RespuestaInput(respuesta="Resolver problemas matemáticos o lógicos")

        self.assertEqual(payload.respuesta, "Resolver problemas matemáticos o lógicos")
        self.assertEqual(payload.opcion_ids, [])
        self.assertIsNone(payload.pregunta_id)

    def test_pregunta_output_expone_campos_nuevos_y_compatibles(self):
        output = PreguntaOutput(
            sesion_id=1,
            turno=1,
            pregunta_id="q_intereses_01",
            texto="Pregunta",
            tipo="opciones",
            opciones=["Opción"],
            opciones_detalle=[{"id": "op_1", "texto": "Opción"}],
            permite_texto_libre=True,
            es_recomendacion=False,
            progreso=0.1,
            estado_parcial={"confianza": 0.0},
        )

        self.assertEqual(output.opciones, ["Opción"])
        self.assertEqual(output.opciones_detalle[0]["id"], "op_1")
        self.assertEqual(output.estado_parcial["confianza"], 0.0)


if __name__ == "__main__":
    unittest.main()
