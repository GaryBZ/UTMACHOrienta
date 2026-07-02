import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { TestAnswer, TestCategory, TestQuestion } from '../models/test.model';

/**
 * TestAiService
 * -----------------------------------------------------------------------
 * Genera la "siguiente pregunta" del test vocacional en base a las
 * respuestas previas del estudiante.
 *
 * Por ahora esto es un MOCK: elige preguntas de un banco local siguiendo
 * la categoría dominante en las respuestas, y simula la latencia de una
 * llamada real a un modelo de IA con `delay()`.
 *
 * Para conectar el backend real, reemplaza el cuerpo de
 * `generateNextQuestion` por algo como:
 *
 *   return this.http.post<TestQuestion>('/api/test/next-question', {
 *     answers,
 *     askedQuestionIds,
 *   });
 *
 * mantén la misma firma (Observable<TestQuestion | null>) y el resto del
 * componente no necesita cambios.
 */
@Injectable({ providedIn: 'root' })
export class TestAiService {
  /** Banco de preguntas adaptativas agrupadas por categoría dominante */
  private readonly AI_QUESTION_BANK: Record<TestCategory, TestQuestion[]> = {
    tecnologia: [
      {
        id: 'ai-tech-1',
        section: 'Profundizando',
        title: '¿Qué tipo de proyecto tecnológico te llama más la atención?',
        options: [
          { id: 'ait1-a', label: 'Desarrollar una app o sistema web', desc: 'Software, producto digital', category: 'tecnologia' },
          { id: 'ait1-b', label: 'Diseñar redes e infraestructura', desc: 'Servidores, conectividad, seguridad', category: 'tecnologia' },
          { id: 'ait1-c', label: 'Automatizar procesos industriales con software', desc: 'IoT, control, producción', category: 'ingenieria' },
          { id: 'ait1-d', label: 'Analizar grandes volúmenes de datos', desc: 'Data, decisiones, negocio', category: 'negocios' },
        ],
      },
      {
        id: 'ai-tech-2',
        section: 'Profundizando',
        title: '¿Qué te resulta más satisfactorio?',
        options: [
          { id: 'ait2-a', label: 'Ver funcionar un programa que creaste', desc: 'De la idea al producto', category: 'tecnologia' },
          { id: 'ait2-b', label: 'Optimizar el rendimiento de un sistema', desc: 'Eficiencia, escalabilidad', category: 'tecnologia' },
          { id: 'ait2-c', label: 'Enseñar a otros a usar la tecnología', desc: 'Capacitación, soporte', category: 'social' },
          { id: 'ait2-d', label: 'Resolver un error complejo bajo presión', desc: 'Debugging, retos técnicos', category: 'tecnologia' },
        ],
      },
    ],
    ingenieria: [
      {
        id: 'ai-ing-1',
        section: 'Profundizando',
        title: '¿Qué tipo de estructura o proceso te interesa más construir?',
        options: [
          { id: 'aii1-a', label: 'Edificios y obras civiles', desc: 'Construcción, estructuras', category: 'ingenieria' },
          { id: 'aii1-b', label: 'Líneas de producción industrial', desc: 'Manufactura, optimización', category: 'ingenieria' },
          { id: 'aii1-c', label: 'Sistemas de agua y ambiente', desc: 'Sostenibilidad, recursos', category: 'ingenieria' },
          { id: 'aii1-d', label: 'Maquinaria y procesos mecánicos', desc: 'Diseño mecánico, mantenimiento', category: 'ingenieria' },
        ],
      },
      {
        id: 'ai-ing-2',
        section: 'Profundizando',
        title: '¿Prefieres trabajar con...?',
        options: [
          { id: 'aii2-a', label: 'Planos y cálculos estructurales', desc: 'Diseño técnico, precisión', category: 'ingenieria' },
          { id: 'aii2-b', label: 'Procesos y optimización de producción', desc: 'Mejora continua', category: 'negocios' },
          { id: 'aii2-c', label: 'Materiales y control de calidad', desc: 'Laboratorio, normas técnicas', category: 'salud' },
          { id: 'aii2-d', label: 'Equipos y mantenimiento técnico', desc: 'Trabajo práctico, taller', category: 'ingenieria' },
        ],
      },
    ],
    salud: [
      {
        id: 'ai-salud-1',
        section: 'Profundizando',
        title: '¿Qué área de la salud te atrae más?',
        options: [
          { id: 'ais1-a', label: 'Diagnóstico y análisis clínico', desc: 'Precisión, evidencia', category: 'salud' },
          { id: 'ais1-b', label: 'Investigación biomédica y laboratorio', desc: 'Ciencia, experimentación', category: 'salud' },
          { id: 'ais1-c', label: 'Atención directa a pacientes', desc: 'Contacto humano, cuidado', category: 'social' },
          { id: 'ais1-d', label: 'Nutrición y bienestar', desc: 'Prevención, hábitos saludables', category: 'salud' },
        ],
      },
      {
        id: 'ai-salud-2',
        section: 'Profundizando',
        title: '¿Cómo prefieres ayudar?',
        options: [
          { id: 'ais2-a', label: 'A través de la ciencia y la investigación', desc: 'Laboratorio, análisis', category: 'salud' },
          { id: 'ais2-b', label: 'En el trato humano directo', desc: 'Empatía, acompañamiento', category: 'social' },
          { id: 'ais2-c', label: 'Diseñando programas de prevención', desc: 'Salud pública, comunidad', category: 'salud' },
          { id: 'ais2-d', label: 'Con precisión técnica en procedimientos', desc: 'Rigor, protocolo', category: 'salud' },
        ],
      },
    ],
    negocios: [
      {
        id: 'ai-neg-1',
        section: 'Profundizando',
        title: '¿Qué aspecto de los negocios prefieres?',
        options: [
          { id: 'ain1-a', label: 'Números, finanzas y contabilidad', desc: 'Precisión, análisis financiero', category: 'negocios' },
          { id: 'ain1-b', label: 'Comercio internacional y exportaciones', desc: 'Mercados globales, aduanas', category: 'negocios' },
          { id: 'ain1-c', label: 'Marketing y análisis de mercado', desc: 'Consumidor, estrategia de marca', category: 'creativo' },
          { id: 'ain1-d', label: 'Gestión de personas y proyectos', desc: 'Liderazgo, organización', category: 'negocios' },
        ],
      },
      {
        id: 'ai-neg-2',
        section: 'Profundizando',
        title: '¿En qué contexto te ves trabajando?',
        options: [
          { id: 'ain2-a', label: 'Una empresa consolidada con procesos claros', desc: 'Estabilidad, estructura', category: 'negocios' },
          { id: 'ain2-b', label: 'Un negocio propio o startup', desc: 'Emprendimiento, riesgo', category: 'negocios' },
          { id: 'ain2-c', label: 'El comercio exterior y aduanas', desc: 'Importación, exportación', category: 'negocios' },
          { id: 'ain2-d', label: 'Una agencia de marketing o consultoría', desc: 'Creatividad aplicada al negocio', category: 'creativo' },
        ],
      },
    ],
    social: [
      {
        id: 'ai-social-1',
        section: 'Profundizando',
        title: '¿Qué problemática social te interesa más?',
        options: [
          { id: 'aisoc1-a', label: 'Educación y desarrollo comunitario', desc: 'Formación, impacto social', category: 'social' },
          { id: 'aisoc1-b', label: 'Justicia y derecho', desc: 'Normas, defensa de derechos', category: 'social' },
          { id: 'aisoc1-c', label: 'Comunicación y medios', desc: 'Información, opinión pública', category: 'creativo' },
          { id: 'aisoc1-d', label: 'Turismo y cultura', desc: 'Patrimonio, experiencias', category: 'negocios' },
        ],
      },
      {
        id: 'ai-social-2',
        section: 'Profundizando',
        title: '¿Cómo te gusta interactuar con otros?',
        options: [
          { id: 'aisoc2-a', label: 'Escuchando y orientando personas', desc: 'Acompañamiento, consejo', category: 'social' },
          { id: 'aisoc2-b', label: 'Escribiendo o comunicando ideas', desc: 'Redacción, discurso', category: 'creativo' },
          { id: 'aisoc2-c', label: 'Organizando eventos o experiencias', desc: 'Logística, coordinación', category: 'negocios' },
          { id: 'aisoc2-d', label: 'Representando o defendiendo causas', desc: 'Argumentación, ética', category: 'social' },
        ],
      },
    ],
    creativo: [
      {
        id: 'ai-crea-1',
        section: 'Profundizando',
        title: '¿Qué tipo de creación te atrae más?',
        options: [
          { id: 'aic1-a', label: 'Diseño gráfico y visual', desc: 'Identidad, estética', category: 'creativo' },
          { id: 'aic1-b', label: 'Marketing y contenido de marca', desc: 'Storytelling, campañas', category: 'creativo' },
          { id: 'aic1-c', label: 'Arquitectura y espacios', desc: 'Diseño espacial, funcionalidad', category: 'ingenieria' },
          { id: 'aic1-d', label: 'Producción audiovisual', desc: 'Video, sonido, edición', category: 'creativo' },
        ],
      },
      {
        id: 'ai-crea-2',
        section: 'Profundizando',
        title: '¿Qué buscas transmitir?',
        options: [
          { id: 'aic2-a', label: 'Una idea a través del diseño', desc: 'Claridad visual', category: 'creativo' },
          { id: 'aic2-b', label: 'Una emoción a través de una campaña', desc: 'Conexión con el público', category: 'creativo' },
          { id: 'aic2-c', label: 'Una experiencia a través de un espacio', desc: 'Ambiente, recorrido', category: 'ingenieria' },
          { id: 'aic2-d', label: 'Una historia a través de medios', desc: 'Narrativa, formato', category: 'social' },
        ],
      },
    ],
  };

  /**
   * Genera la siguiente pregunta adaptativa.
   * Devuelve `null` cuando ya no hay preguntas relevantes que generar
   * (el componente interpreta esto como "fin del test").
   */
  generateNextQuestion(
    answers: TestAnswer[],
    askedQuestionIds: string[]
  ): Observable<TestQuestion | null> {
    const orderedCategories = this.rankCategoriesByScore(answers);

    for (const category of orderedCategories) {
      const remaining = this.AI_QUESTION_BANK[category].filter(
        (q) => !askedQuestionIds.includes(q.id)
      );
      if (remaining.length > 0) {
        // Simula la latencia real de una llamada a un modelo de IA
        const latency = 1200 + Math.random() * 900;
        return of(remaining[0]).pipe(delay(latency));
      }
    }

    return of(null).pipe(delay(600));
  }

  private rankCategoriesByScore(answers: TestAnswer[]): TestCategory[] {
    const scores: Record<TestCategory, number> = {
      tecnologia: 0,
      ingenieria: 0,
      salud: 0,
      negocios: 0,
      social: 0,
      creativo: 0,
    };

    for (const answer of answers) {
      scores[answer.category] += 1;
    }

    return (Object.keys(scores) as TestCategory[]).sort(
      (a, b) => scores[b] - scores[a]
    );
  }
}