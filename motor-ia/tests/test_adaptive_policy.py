import unittest

from pipeline.adaptive_policy import AdaptivePolicy


class AdaptivePolicyTest(unittest.TestCase):
    def setUp(self):
        self.policy = AdaptivePolicy()

    def test_detecta_dimension_faltante(self):
        perfil = {
            "afinidad": {
                "afinidades_area": {"tecnología/datos": 0.8},
                "dimensiones_cubiertas": ["intereses", "habilidades"],
            }
        }

        objetivo = self.policy.decidir(perfil, [])

        self.assertEqual(objetivo["objetivo"], "explorar_dimension")
        self.assertEqual(objetivo["dimension"], "valores")

    def test_detecta_empate_top(self):
        perfil = {
            "afinidad": {
                "afinidades_area": {
                    "tecnología/datos": 0.9,
                    "matemáticas/lógica": 0.88,
                    "salud": 0.2,
                },
                "dimensiones_cubiertas": ["intereses", "habilidades", "valores", "entorno", "modalidad"],
            }
        }

        objetivo = self.policy.decidir(perfil, [])

        self.assertEqual(objetivo["objetivo"], "desempatar_areas")
        self.assertEqual(objetivo["areas_en_conflicto"][:2], ["tecnología/datos", "matemáticas/lógica"])

    def test_detecta_perfil_disperso(self):
        perfil = {
            "afinidad": {
                "afinidades_area": {
                    "agropecuaria/ambiente": 0.9,
                    "artes/diseño": 0.85,
                    "ingeniería/construcción": 0.7,
                    "negocios/economía": 0.64,
                },
                "dimensiones_cubiertas": ["intereses", "habilidades", "valores", "entorno", "modalidad"],
            }
        }

        objetivo = self.policy.decidir(perfil, [])

        self.assertEqual(objetivo["objetivo"], "desempatar_areas")
        self.assertEqual(len(objetivo["areas_en_conflicto"]), 3)

    def test_profundiza_area_dominante(self):
        perfil = {
            "afinidad": {
                "afinidades_area": {
                    "tecnología/datos": 1.0,
                    "matemáticas/lógica": 0.6,
                    "salud": 0.1,
                },
                "dimensiones_cubiertas": ["intereses", "habilidades", "valores", "entorno", "modalidad"],
            }
        }

        objetivo = self.policy.decidir(perfil, [])

        self.assertEqual(objetivo["objetivo"], "profundizar_area")
        self.assertEqual(objetivo["areas_top"], ["tecnología/datos"])


if __name__ == "__main__":
    unittest.main()
