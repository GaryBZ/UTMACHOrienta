import { TestQuestion } from "./test.model";

/**
 * Preguntas base (fijas).
 * Son siempre las 3 primeras del test: sirven para ubicar al estudiante
 * en una familia de carreras general antes de que la IA empiece a
 * generar preguntas adaptativas más específicas.
 */
export const BASE_QUESTIONS: TestQuestion[] = [
  {
    id: 'base-1',
    section: 'Intereses',
    title: '¿Qué actividades disfrutas más?',
    isBase: true,
    options: [
      {
        id: 'b1-a',
        label: 'Resolver problemas lógicos y de programación',
        desc: 'Retos técnicos, algoritmos, sistemas',
        category: 'tecnologia',
      },
      {
        id: 'b1-b',
        label: 'Diseñar y construir soluciones físicas',
        desc: 'Estructuras, procesos, máquinas',
        category: 'ingenieria',
      },
      {
        id: 'b1-c',
        label: 'Ayudar a las personas y cuidar su bienestar',
        desc: 'Salud, atención, servicio',
        category: 'salud',
      },
      {
        id: 'b1-d',
        label: 'Gestionar negocios y analizar mercados',
        desc: 'Finanzas, estrategia, organización',
        category: 'negocios',
      },
    ],
  },
  {
    id: 'base-2',
    section: 'Habilidades',
    title: '¿En qué se te da mejor destacar?',
    isBase: true,
    options: [
      {
        id: 'b2-a',
        label: 'Pensamiento lógico y análisis de datos',
        desc: 'Matemáticas, algoritmos, precisión',
        category: 'tecnologia',
      },
      {
        id: 'b2-b',
        label: 'Trabajo en equipo y comunicación',
        desc: 'Liderazgo, relaciones, negociación',
        category: 'social',
      },
      {
        id: 'b2-c',
        label: 'Creatividad y sentido estético',
        desc: 'Diseño, expresión, innovación visual',
        category: 'creativo',
      },
      {
        id: 'b2-d',
        label: 'Precisión técnica y manual',
        desc: 'Construcción, montaje, procesos exactos',
        category: 'ingenieria',
      },
    ],
  },
  {
    id: 'base-3',
    section: 'Entorno de trabajo',
    title: '¿Cómo prefieres pasar tu jornada?',
    isBase: true,
    options: [
      {
        id: 'b3-a',
        label: 'Frente a una computadora, programando o diseñando sistemas',
        desc: 'Trabajo digital, remoto o híbrido',
        category: 'tecnologia',
      },
      {
        id: 'b3-b',
        label: 'En campo, laboratorio u obra, con trabajo práctico',
        desc: 'Manos a la obra, prueba y error',
        category: 'ingenieria',
      },
      {
        id: 'b3-c',
        label: 'En consultorio, hospital o comunidad, atendiendo personas',
        desc: 'Contacto humano directo',
        category: 'salud',
      },
      {
        id: 'b3-d',
        label: 'En oficina, liderando proyectos y tomando decisiones',
        desc: 'Estrategia, gestión, resultados',
        category: 'negocios',
      },
    ],
  },
];