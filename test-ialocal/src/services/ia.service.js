class IAService {
  constructor() {
    this.baseUrl = process.env.LM_STUDIO_URL || 'http://localhost:1234/v1';
    this.model = process.env.LM_STUDIO_MODEL || 'local-model';
  }

  async chat(messages, options = {}) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options.temperature ?? 0.4,
        max_tokens: options.max_tokens ?? 800
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error IA local: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return data.choices[0].message.content;
  }

  async generarPreguntaAdaptativa(contexto) {
    const messages = [
      {
        role: 'system',
        content: `Eres un orientador vocacional universitario especializado en entrevistas adaptativas.

Tu tarea es generar UN item de test vocacional personalizado para un estudiante, basado en sus afinidades actuales, confianza actual, historial y estrategia de entrevista.

Debes actuar como constructor de items de test vocacional, no como entrevistador narrativo ni recomendador de carreras.

REGLAS GENERALES:
- No recomiendes carreras.
- No diagnostiques personalidad, salud mental ni capacidades clinicas.
- No afirmes que el estudiante "es" de cierta forma.
- No uses lenguaje determinista.
- La consigna debe ser clara, breve y comprensible para un estudiante preuniversitario o universitario.
- La consigna debe parecerse a un test vocacional clasico, no a una entrevista conversacional.
- Usa una consigna breve como: "Elige la actividad que mas te interesaria realizar." o "Selecciona la actividad que mas se parece a tus intereses."
- No redactes preguntas largas con historias, proyectos, ferias, eventos, comunidades ficticias o dilemas tipo "prefieres X o Y".
- El item debe evaluar intereses mediante actividades concretas y breves.
- El item debe ayudar a distinguir entre las areas objetivo de forma indirecta.
- El impacto principal de cada opcion debe coincidir con el contenido de la opcion.
- Usa estrategia_entrevista para decidir el enfoque: profundizar, explorar baja confianza, desempatar o contrastar.
- Usa areas_a_diferenciar como las areas principales que debe evaluar la pregunta.
- areas_objetivo debe contener al menos dos codigos presentes en areas_a_diferenciar.
- Al menos tres de las cuatro opciones deben tener como mayor impacto un area de areas_a_diferenciar.
- Revisa preguntas_ia_previas e historial_reciente antes de redactar.
- No repitas el mismo tipo de actividad ni estructura de preguntas anteriores.
- Evita contextos narrativos repetidos: eventos, ferias, networking, promocion de productos, patrocinadores, proyectos comunitarios, calidad de vida, experiencia de usuarios.
- Si una opcion habla de animales, el mayor impacto debe ser biologia_animal.
- Si habla de atencion medica humana, el mayor impacto debe ser salud.
- Si habla de apoyo emocional o conducta humana, el mayor impacto debe ser salud_mental.

REGLAS SOBRE LAS OPCIONES:
- Las opciones NO pueden ser nombres de areas.
- Esta prohibido usar opciones como: "Salud", "Tecnologia", "Ingenieria", "Negocios", "Finanzas", "Biologia animal", "Salud mental".
- Debes generar exactamente 4 opciones.
- Cada opcion debe describir UNA actividad vocacional concreta.
- Cada opcion debe tener entre 5 y 16 palabras.
- Cada opcion debe iniciar preferiblemente con un verbo en infinitivo, por ejemplo: "Analizar", "Disenar", "Cuidar", "Organizar", "Investigar", "Programar".
- No uses opciones compuestas con "o", "y/o" ni dos actividades mezcladas.
- No uses opciones en forma de historia o escenario largo.
- El estudiante no debe notar explicitamente que area esta siendo evaluada.
- Cada opcion debe tener un impacto numerico entre 0 y 10.
- Las claves del objeto "impacto" deben ser codigos reales de areas.
- Nunca uses la clave "codigo_area".
- Usa unicamente codigos de areas presentes en el contexto recibido.
- La pregunta no debe estar centrada en una sola area objetivo.
- Debe presentar escenarios equivalentes para cada area a diferenciar.
- Las 4 opciones deben ser comparables en extension y nivel de especificidad.
- No mezcles todas las opciones dentro del mismo contexto animal, tecnologico, empresarial o clinico.

FORMATO DE RESPUESTA:
Debes responder exclusivamente con JSON valido.
No uses markdown.
No uses explicaciones fuera del JSON.
No agregues texto antes ni despues del JSON.

ESTRUCTURA OBLIGATORIA:
{
  "tipo": "opcion_multiple",
  "pregunta": "Consigna breve del item",
  "objetivo": "Objetivo vocacional de la pregunta",
  "areas_objetivo": ["codigo_area_1", "codigo_area_2", "codigo_area_3"],
  "opciones": [
    {
      "texto": "Actividad vocacional breve",
      "impacto": {
        "codigo_area_real": 10
      }
    }
  ]
}

EJEMPLO VALIDO:
{
  "tipo": "opcion_multiple",
  "pregunta": "Elige la actividad que mas te interesaria realizar.",
  "objetivo": "Diferenciar interes por atencion clinica, acompanamiento emocional y bienestar animal.",
  "areas_objetivo": ["salud", "salud_mental", "biologia_animal"],
  "opciones": [
    {
      "texto": "Atender necesidades fisicas de pacientes en una brigada medica.",
      "impacto": {
        "salud": 10,
        "salud_mental": 2
      }
    },
    {
      "texto": "Escuchar y orientar a personas con dificultades emocionales.",
      "impacto": {
        "salud_mental": 10,
        "salud": 2
      }
    },
    {
      "texto": "Cuidar y recuperar animales en situacion vulnerable.",
      "impacto": {
        "biologia_animal": 10,
        "salud": 3
      }
    },
    {
      "texto": "Organizar recursos y turnos de un equipo de trabajo.",
      "impacto": {
        "negocios": 8,
        "salud_mental": 2
      }
    }
  ]
}

EJEMPLO INVALIDO:
{
  "opciones": [
    {
      "texto": "Salud",
      "impacto": {
        "codigo_area": 10
      }
    }
  ]
}`
      },
      {
        role: 'user',
        content: JSON.stringify(contexto, null, 2)
      }
    ];

    const contenido = await this.chat(messages, {
      temperature: 0.45,
      max_tokens: 1000
    });

    const pregunta = this.parsearJSON(contenido);

    this.validarPreguntaAdaptativa(pregunta, contexto);

    return pregunta;
  }

  parsearJSON(texto) {
    try {
      return JSON.parse(texto);
    } catch {
      const inicio = texto.indexOf('{');
      const fin = texto.lastIndexOf('}');

      if (inicio === -1 || fin === -1) {
        throw new Error('La IA no devolvio JSON valido');
      }

      const jsonExtraido = texto.slice(inicio, fin + 1);
      return JSON.parse(jsonExtraido);
    }
  }

  validarPreguntaAdaptativa(pregunta, contexto) {
    if (!pregunta || typeof pregunta !== 'object') {
      throw new Error('La IA no devolvio un objeto JSON valido');
    }

    if (pregunta.tipo !== 'opcion_multiple') {
      throw new Error('La pregunta generada debe ser de tipo opcion_multiple');
    }

    if (!pregunta.pregunta || typeof pregunta.pregunta !== 'string') {
      throw new Error('La pregunta generada no tiene texto valido');
    }

    this.validarEstiloConsigna(pregunta.pregunta);

    if (!Array.isArray(pregunta.opciones) || pregunta.opciones.length !== 4) {
      throw new Error('La pregunta generada debe tener exactamente 4 opciones');
    }

    const codigosValidos = new Set(
      (contexto.areas_disponibles || []).map(area => area.codigo)
    );

    const nombresAreasProhibidos = [
      'salud',
      'salud mental',
      'biologia animal',
      'tecnologia',
      'ingenieria',
      'negocios',
      'finanzas',
      'comercio',
      'agricultura'
    ];

    for (const opcion of pregunta.opciones) {
      if (!opcion.texto || typeof opcion.texto !== 'string') {
        throw new Error('Cada opcion debe tener texto');
      }

      this.validarEstiloOpcion(opcion.texto);

      const textoNormalizado = opcion.texto.trim().toLowerCase();

      if (nombresAreasProhibidos.includes(textoNormalizado)) {
        throw new Error('Las opciones no pueden ser nombres de areas');
      }

      if (!opcion.impacto || typeof opcion.impacto !== 'object') {
        throw new Error('Cada opcion debe tener impacto');
      }

      if ('codigo_area' in opcion.impacto) {
        throw new Error('La IA uso codigo_area, lo cual no esta permitido');
      }

      for (const [area, valor] of Object.entries(opcion.impacto)) {
        if (!codigosValidos.has(area)) {
          throw new Error(`Area invalida en impacto: ${area}`);
        }

        if (typeof valor !== 'number' || valor < 0 || valor > 10) {
          throw new Error(`Impacto invalido para ${area}: ${valor}`);
        }
      }
    }
  }

  validarEstiloConsigna(texto) {
    const normalizado = this.normalizarTexto(texto);
    const prohibidos = [
      'si tuvieras',
      'si tuvieses',
      'te verias',
      'prefieres participar',
      'participar en un proyecto',
      'proyecto para mejorar',
      'feria',
      'evento',
      'networking'
    ];

    if (texto.length > 115) {
      throw new Error('La consigna debe ser breve, estilo test vocacional');
    }

    if (prohibidos.some(fragmento => normalizado.includes(fragmento))) {
      throw new Error('La consigna parece una entrevista narrativa, no un item vocacional');
    }
  }

  validarEstiloOpcion(texto) {
    const normalizado = this.normalizarTexto(texto);
    const palabras = normalizado.split(/\s+/).filter(Boolean);
    const prohibidos = [
      'si tuvieras',
      'si tuvieses',
      'proyecto para mejorar',
      'experiencia de los usuarios',
      'calidad de vida',
      'evento',
      'feria',
      'networking',
      'patrocinador'
    ];

    if (palabras.length < 5 || palabras.length > 18) {
      throw new Error('Cada opcion debe ser una actividad breve de 5 a 18 palabras');
    }

    if (normalizado.includes(' o ') || normalizado.includes(' y/o ')) {
      throw new Error('Cada opcion debe contener una sola actividad, sin alternativas mezcladas');
    }

    if (prohibidos.some(fragmento => normalizado.includes(fragmento))) {
      throw new Error('La opcion parece un escenario narrativo, no una actividad breve');
    }
  }

  normalizarTexto(texto) {
    return String(texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}

module.exports = new IAService();
