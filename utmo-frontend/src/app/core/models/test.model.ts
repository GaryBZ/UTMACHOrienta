/**
 * Modelos del Test Vocacional
 * -----------------------------------------------------------------------
 * `TestCategory` representa las grandes familias de carreras de UTMACH
 * (tecnología/FIC, ingeniería/FIC, salud/FCQS, negocios/FCE, social/FCS,
 * creativo/diseño). Cada opción de respuesta suma puntos a una categoría;
 * el motor de IA usa esos puntajes para decidir la siguiente pregunta.
 */

export type TestCategory =
  | 'tecnologia'
  | 'ingenieria'
  | 'salud'
  | 'negocios'
  | 'social'
  | 'creativo';

export interface TestOption {
  id: string;
  label: string;
  desc: string;
  category: TestCategory;
}

export interface TestQuestion {
  id: string;
  section: string;
  title: string;
  options: TestOption[];
  /** true para las 3 preguntas base (fijas), false/undefined para las generadas por IA */
  isBase?: boolean;
}

export interface TestAnswer {
  questionId: string;
  section: string;
  optionId: string;
  optionLabel: string;
  category: TestCategory;
}

export interface TestResult {
  answers: TestAnswer[];
  categoryScores: Record<TestCategory, number>;
}