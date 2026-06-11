const repo = require('../repositories/testVocacional.repository');
const motor = require('./motorVocacional.service');
const iaService = require('./ia.service');

const AREAS_DISPONIBLES = [
  { codigo: 'negocios', nombre: 'Negocios y Gestion Empresarial', descripcion: 'Planificacion, liderazgo, gestion de equipos, emprendimiento y toma de decisiones.' },
  { codigo: 'finanzas', nombre: 'Finanzas y Economia', descripcion: 'Analisis financiero, presupuestos, inversiones, contabilidad, economia y datos.' },
  { codigo: 'comercio', nombre: 'Comercio y Servicios Globales', descripcion: 'Comercio internacional, turismo, logistica, atencion al cliente y relaciones interculturales.' },
  { codigo: 'agricultura', nombre: 'Ciencias Agricolas y de la Tierra', descripcion: 'Cultivos, suelos, produccion agricola, recursos naturales y sostenibilidad.' },
  { codigo: 'biologia_animal', nombre: 'Ciencias Biologicas y Acuaticas', descripcion: 'Bienestar animal, organismos acuaticos, veterinaria, crianza de especies y produccion biologica.' },
  { codigo: 'salud', nombre: 'Ciencias de la Salud', descripcion: 'Cuidado fisico de personas, diagnostico, tratamiento clinico y prevencion de enfermedades.' },
  { codigo: 'salud_mental', nombre: 'Salud Mental y Bienestar Social', descripcion: 'Conducta humana, escucha activa, acompanamiento emocional y resolucion de conflictos.' },
  { codigo: 'tecnologia', nombre: 'Tecnologia de la Informacion y Analisis de Datos', descripcion: 'Programacion, software, analisis de datos, inteligencia artificial y automatizacion.' },
  { codigo: 'ingenieria', nombre: 'Ingenieria, Industria y Medio Ambiente', descripcion: 'Diseno tecnico, construccion, procesos industriales, quimica aplicada y ambiente.' }
];

const TOTAL_PREGUNTAS_TEST = Number(process.env.TEST_VOCACIONAL_TOTAL_PREGUNTAS || 18);
const MIN_PREGUNTAS_FINALIZAR = Number(process.env.TEST_VOCACIONAL_MIN_PREGUNTAS_FINALIZAR || 12);

class TestVocacionalService {
  async iniciarTest(idUsuario) {
    if (!idUsuario) {
      throw new Error('idUsuario es obligatorio');
    }

    const sesion = await repo.crearSesionTest(idUsuario);
    const pregunta = await repo.obtenerSiguientePregunta(sesion.id);

    return {
      sesion,
      pregunta,
      configuracion: this.obtenerConfiguracionTest()
    };
  }

  async obtenerPregunta(sesionId) {
    const sesion = await repo.obtenerSesionPorId(sesionId);

    if (!sesion) {
      throw new Error('Sesion no encontrada');
    }

    if (sesion.estado !== 'en_progreso') {
      throw new Error('La sesion no esta en progreso');
    }

    if (this.debeFinalizarAutomaticamente(sesion)) {
      const resultado = await this.finalizarTest(sesionId, { forzar: true });

      return {
        test_finalizado: true,
        resultado
      };
    }

    if (sesion.preguntas_realizadas < 3) {
      const preguntaBanco = await repo.obtenerSiguientePregunta(sesionId);

      if (!preguntaBanco) {
        throw new Error('No hay preguntas disponibles');
      }

      return {
        fuente: 'banco',
        ...preguntaBanco
      };
    }

    return await this.generarPreguntaIA(sesionId);
  }

  async responderPregunta(sesionId, preguntaId, valorRespuesta) {
    if (!sesionId || !preguntaId || valorRespuesta === undefined) {
      throw new Error('sesionId, preguntaId y valorRespuesta son obligatorios');
    }

    const valor = Number(valorRespuesta);

    if (!Number.isInteger(valor) || valor < 1 || valor > 5) {
      throw new Error('valorRespuesta debe ser un numero entero entre 1 y 5');
    }

    const sesion = await repo.obtenerSesionPorId(sesionId);

    if (!sesion) {
      throw new Error('Sesion no encontrada');
    }

    if (sesion.estado !== 'en_progreso') {
      throw new Error('La sesion no esta en progreso');
    }

    const pregunta = await repo.obtenerPreguntaPorId(preguntaId);

    if (!pregunta) {
      throw new Error('Pregunta no encontrada');
    }

    if (pregunta.tipo !== 'likert') {
      throw new Error('Por ahora solo se admiten preguntas tipo likert');
    }

    if (await repo.existeRespuestaBanco(sesionId, preguntaId)) {
      throw new Error('Esta pregunta ya fue respondida en la sesion');
    }

    const calculo = motor.calcularRespuestaLikert(sesion, pregunta, valor);

    await repo.guardarRespuesta({
      sesionId,
      pregunta,
      valorRespuesta: valor,
      textoRespuesta: null,
      opcionSeleccionada: null,
      puntajesAplicados: calculo.impactoAplicado,
      puntajesMaximosAplicados: Object.fromEntries(
        Object.entries(calculo.impactoAplicado).map(([area, peso]) => [
          area,
          peso * 5
        ])
      )
    });

    const sesionActualizada = await repo.actualizarSesionPuntajes({
      sesionId,
      puntajesObtenidos: calculo.puntajesObtenidos,
      puntajesMaximos: calculo.puntajesMaximos,
      afinidadesActuales: calculo.afinidadesActuales,
      confianzaActual: calculo.confianzaActual
    });

    if (this.debeFinalizarAutomaticamente(sesionActualizada)) {
      const resultado = await this.finalizarTest(sesionId, {
        forzar: true
      });

      return {
        sesion: sesionActualizada,
        respuesta_registrada: true,
        test_finalizado: true,
        resultado
      };
    }

    const siguientePregunta = await repo.obtenerSiguientePregunta(sesionId);

    return {
      sesion: sesionActualizada,
      respuesta_registrada: true,
      siguiente_pregunta: siguientePregunta
    };
  }

  async finalizarTest(sesionId, opciones = {}) {
    const sesion = await repo.obtenerSesionPorId(sesionId);

    if (!sesion) {
      throw new Error('Sesion no encontrada');
    }

    if (sesion.estado !== 'en_progreso') {
      throw new Error('La sesion no esta en progreso');
    }

    if (!opciones.forzar && sesion.preguntas_realizadas < MIN_PREGUNTAS_FINALIZAR) {
      throw new Error(`El test requiere al menos ${MIN_PREGUNTAS_FINALIZAR} respuestas antes de finalizar`);
    }

    const carreras = await repo.obtenerCarrerasConAreas();
    const metadatosRanking = opciones.metadatos || sesion.metadatos || {};
    const ranking = motor.calcularCompatibilidadCarreras(
      sesion.afinidades_actuales,
      carreras,
      metadatosRanking
    );

    const top3 = ranking.slice(0, 3);
    const principal = top3[0];
    const explicacion = `La carrera recomendada es ${principal.carrera} con una compatibilidad de ${principal.compatibilidad}%.`;

    const resultado = await repo.guardarResultadoFinal({
      sesionId,
      idUsuario: sesion.id_usuario,
      afinidades: sesion.afinidades_actuales,
      confianza: sesion.confianza_actual,
      rankingCarreras: top3,
      carrerasRecomendadas: top3.map(c => ({
        id_carrera: c.id_carrera,
        carrera: c.carrera,
        compatibilidad: c.compatibilidad,
        nivel: c.nivel
      })),
      explicacion
    });

    await repo.finalizarSesion(sesionId);

    return resultado;
  }

  async obtenerResultado(sesionId) {
    const resultado = await repo.obtenerResultadoPorSesion(sesionId);

    if (!resultado) {
      throw new Error('Resultado no encontrado para esta sesion');
    }

    return resultado;
  }

  async generarPreguntaIA(sesionId) {
    const sesion = await repo.obtenerSesionPorId(sesionId);

    if (!sesion) {
      throw new Error('Sesion no encontrada');
    }

    if (sesion.estado !== 'en_progreso') {
      throw new Error('La sesion no esta en progreso');
    }

    const historial = await repo.obtenerHistorialSesionVocacional(sesionId);
    const contexto = this.construirContextoIA(sesion, historial);
    const pregunta = await this.generarPreguntaConReintento(contexto, historial);

    const registro = await repo.guardarPreguntaGeneradaLLM({
      sesionId,
      prompt: JSON.stringify(contexto),
      respuestaLLM: pregunta,
      preguntaGenerada: pregunta
    });

    return {
      id_generada: registro.id,
      fuente: 'ia',
      ...this.agregarOpcionNinguna(pregunta)
    };
  }

  agregarOpcionNinguna(pregunta) {
    const areasRechazadas = Array.isArray(pregunta.areas_objetivo)
      ? pregunta.areas_objetivo
      : [];

    return {
      ...pregunta,
      pregunta: `${pregunta.pregunta} Si ninguna opcion te representa, selecciona la ultima.`,
      opciones: [
        ...(pregunta.opciones || []),
        {
          texto: 'Ninguna de estas actividades me interesa.',
          impacto: {},
          rechazo_areas: areasRechazadas
        }
      ]
    };
  }

  construirContextoIA(sesion, historial) {
    const estrategia = this.seleccionarEstrategiaEntrevista(sesion, historial);
    const preguntasPrevias = historial.preguntasIA
      .map(row => row.pregunta_generada?.pregunta)
      .filter(Boolean);
    const respuestasPrevias = historial.respuestas.slice(-8).map(respuesta => ({
      pregunta: respuesta.pregunta_texto,
      tipo: respuesta.tipo_pregunta,
      respuesta: respuesta.respuesta_texto ?? respuesta.respuesta_valor,
      impacto: respuesta.puntajes_aplicados
    }));

    return {
      areas_disponibles: AREAS_DISPONIBLES,
      afinidades_actuales: sesion.afinidades_actuales || {},
      confianza_actual: sesion.confianza_actual || {},
      preguntas_realizadas: sesion.preguntas_realizadas,
      estrategia_entrevista: estrategia,
      areas_a_diferenciar: estrategia.areas,
      historial_reciente: respuestasPrevias,
      preguntas_ia_previas: preguntasPrevias,
      objetivo: estrategia.objetivo,
      formato_item: {
        tipo: 'test_vocacional_clasico',
        consigna_recomendada: 'Elige la actividad que mas te interesaria realizar.',
        opciones: 'exactamente 4 actividades breves, comparables y no narrativas'
      },
      restricciones_adicionales: [
        'No repitas preguntas anteriores ni cambies solo palabras superficiales.',
        'No generes entrevistas narrativas ni dilemas largos.',
        'Evita frases como "si tuvieras que", "si tuvieses", "te verias", "participar en un proyecto" o "prefieres X o Y".',
        'Evita usar eventos, ferias, networking, promocion de productos, patrocinadores o logistica.',
        'No uses nombres de areas como opciones.',
        'Usa exactamente 4 opciones.',
        'Cada opcion debe ser una actividad vocacional breve de 5 a 16 palabras.',
        'Cada opcion debe evaluar una preferencia distinta.',
        'La consigna debe parecer de test vocacional, no de entrevista.',
        'Antes de entregar el JSON, revisa que el area con mayor impacto de cada opcion coincida con el contenido real de la opcion.'
      ]
    };
  }

  seleccionarEstrategiaEntrevista(sesion, historial) {
    const afinidades = sesion.afinidades_actuales || {};
    const confianza = sesion.confianza_actual || {};
    const generadas = historial.preguntasIA.length;
    const modo = generadas % 4;
    const top = this.ordenarAreasPorValor(afinidades, 'desc');
    const bajaConfianza = this.ordenarAreasPorValor(
      Object.fromEntries(AREAS_DISPONIBLES.map(area => [area.codigo, confianza[area.codigo] || 0])),
      'asc'
    );
    const desempate = this.obtenerAreasCercanas(afinidades);

    if (modo === 0) {
      return {
        tipo: 'profundizacion_top',
        areas: this.completarAreas(top.slice(0, 3), bajaConfianza),
        objetivo: 'Profundizar en las areas con mayor afinidad actual sin repetir escenarios anteriores.'
      };
    }

    if (modo === 1) {
      return {
        tipo: 'exploracion_baja_confianza',
        areas: this.completarAreas(bajaConfianza.slice(0, 3), top),
        objetivo: 'Explorar areas con menor confianza para evitar cerrar el perfil demasiado pronto.'
      };
    }

    if (modo === 2) {
      return {
        tipo: 'desempate',
        areas: this.completarAreas(desempate, top, bajaConfianza),
        objetivo: 'Desempatar areas con afinidades cercanas mediante escenarios claramente diferentes.'
      };
    }

    return {
      tipo: 'contraste',
      areas: this.completarAreas([top[0], bajaConfianza[0], bajaConfianza[1]], top),
      objetivo: 'Contrastar el area dominante con areas menos exploradas para validar si el perfil es consistente.'
    };
  }

  ordenarAreasPorValor(valores, direccion = 'desc') {
    const factor = direccion === 'asc' ? 1 : -1;

    return AREAS_DISPONIBLES
      .map(area => [area.codigo, Number(valores[area.codigo] || 0)])
      .sort((a, b) => (a[1] - b[1]) * factor)
      .map(([area]) => area);
  }

  obtenerAreasCercanas(afinidades) {
    const ordenadas = this.ordenarAreasPorValor(afinidades, 'desc')
      .map(area => [area, Number(afinidades[area] || 0)])
      .filter(([, valor]) => valor > 0);

    if (ordenadas.length < 2) {
      return this.ordenarAreasPorValor(afinidades, 'desc').slice(0, 2);
    }

    let mejorPar = ordenadas.slice(0, 2).map(([area]) => area);
    let menorDiferencia = Number.POSITIVE_INFINITY;

    for (let i = 0; i < ordenadas.length; i += 1) {
      for (let j = i + 1; j < ordenadas.length; j += 1) {
        const diferencia = Math.abs(ordenadas[i][1] - ordenadas[j][1]);

        if (diferencia < menorDiferencia) {
          menorDiferencia = diferencia;
          mejorPar = [ordenadas[i][0], ordenadas[j][0]];
        }
      }
    }

    return mejorPar;
  }

  completarAreas(...grupos) {
    const areas = [];

    for (const grupo of grupos) {
      for (const area of grupo.filter(Boolean)) {
        if (!areas.includes(area)) {
          areas.push(area);
        }

        if (areas.length === 3) {
          return areas;
        }
      }
    }

    for (const area of AREAS_DISPONIBLES.map(item => item.codigo)) {
      if (!areas.includes(area)) {
        areas.push(area);
      }

      if (areas.length === 3) {
        return areas;
      }
    }

    return areas;
  }

  async generarPreguntaConReintento(contextoBase, historial) {
    const maxIntentos = 3;
    let ultimoError;

    for (let intento = 1; intento <= maxIntentos; intento += 1) {
      const contexto = {
        ...contextoBase,
        intento_generacion: intento,
        restricciones_adicionales: intento === 1
          ? contextoBase.restricciones_adicionales
          : [
              ...contextoBase.restricciones_adicionales,
              `La pregunta anterior fue rechazada: ${ultimoError?.message || 'no cumplio las reglas'}. Genera un item de test vocacional clasico, usa exactamente 4 actividades breves y respeta areas_a_diferenciar.`
            ]
      };

      try {
        const pregunta = await iaService.generarPreguntaAdaptativa(contexto);
        this.validarPreguntaContraEstrategia(pregunta, contexto);

        if (!this.esPreguntaDemasiadoSimilar(pregunta, historial)) {
          return pregunta;
        }

        ultimoError = new Error('La IA genero una pregunta demasiado parecida al historial');
      } catch (error) {
        ultimoError = error;
      }
    }

    throw new Error(`No se pudo generar una pregunta IA valida tras ${maxIntentos} intentos: ${ultimoError.message}`);
  }

  validarPreguntaContraEstrategia(pregunta, contexto) {
    const areasSolicitadas = new Set(contexto.areas_a_diferenciar || []);
    const areasImpactadas = new Set();
    const areasPrincipales = new Set();

    for (const opcion of pregunta.opciones || []) {
      let areaPrincipal = null;
      let mayorImpacto = -1;

      for (const [area, valor] of Object.entries(opcion.impacto || {})) {
        areasImpactadas.add(area);

        if (valor > mayorImpacto) {
          mayorImpacto = valor;
          areaPrincipal = area;
        }
      }

      if (areaPrincipal) {
        areasPrincipales.add(areaPrincipal);
      }
    }

    const solicitadasImpactadas = [...areasSolicitadas]
      .filter(area => areasImpactadas.has(area));
    const solicitadasPrincipales = [...areasSolicitadas]
      .filter(area => areasPrincipales.has(area));
    const minimoPrincipales = Math.min(3, areasSolicitadas.size);

    if (solicitadasImpactadas.length < 2 || solicitadasPrincipales.length < minimoPrincipales) {
      throw new Error('La pregunta IA no respeta suficientes areas_a_diferenciar');
    }

    if (Array.isArray(pregunta.areas_objetivo)) {
      const objetivoAlineado = pregunta.areas_objetivo
        .filter(area => areasSolicitadas.has(area));

      if (objetivoAlineado.length < 2) {
        throw new Error('areas_objetivo no coincide con areas_a_diferenciar');
      }
    }
  }

  esPreguntaDemasiadoSimilar(preguntaNueva, historial) {
    const textoNuevo = this.textoComparablePregunta(preguntaNueva);
    const preguntasPrevias = historial.preguntasIA
      .map(row => this.textoComparablePregunta(row.pregunta_generada))
      .filter(Boolean);

    return preguntasPrevias.some(textoPrevio => (
      this.similitudTexto(textoNuevo, textoPrevio) >= 0.55
    ));
  }

  textoComparablePregunta(pregunta) {
    if (!pregunta) {
      return '';
    }

    const opciones = Array.isArray(pregunta.opciones)
      ? pregunta.opciones.map(opcion => opcion.texto).join(' ')
      : '';

    return opciones || pregunta.pregunta || '';
  }

  similitudTexto(a, b) {
    const tokensA = new Set(this.tokenizar(a));
    const tokensB = new Set(this.tokenizar(b));

    if (tokensA.size === 0 || tokensB.size === 0) {
      return 0;
    }

    const interseccion = [...tokensA].filter(token => tokensB.has(token)).length;
    const union = new Set([...tokensA, ...tokensB]).size;

    return interseccion / union;
  }

  tokenizar(texto) {
    const palabrasVacias = new Set([
      'que', 'para', 'con', 'una', 'uno', 'unos', 'unas', 'como', 'cual',
      'cuales', 'mas', 'menos', 'por', 'del', 'las', 'los', 'tus', 'sus',
      'estarias', 'estas', 'este', 'esta', 'seria', 'serian', 'realizar'
    ]);

    return String(texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9_ ]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 3 && !palabrasVacias.has(token));
  }

  async responderPreguntaIA(sesionId, idPreguntaGenerada, opcionSeleccionada) {
    const sesion = await repo.obtenerSesionPorId(sesionId);

    if (!sesion) {
      throw new Error('Sesion no encontrada');
    }

    if (sesion.estado !== 'en_progreso') {
      throw new Error('La sesion no esta en progreso');
    }

    const registro = await repo.obtenerPreguntaGeneradaPorId(idPreguntaGenerada);

    if (!registro) {
      throw new Error('Pregunta generada por IA no encontrada');
    }

    if (registro.id_sesion !== sesionId) {
      throw new Error('La pregunta IA no pertenece a esta sesion');
    }

    const preguntaGenerada = registro.pregunta_generada;
    const preguntaParaResponder = this.agregarOpcionNinguna(preguntaGenerada);
    const indiceOpcion = Number(opcionSeleccionada);

    if (await repo.existeRespuestaIAPorIdGenerada(sesionId, idPreguntaGenerada)) {
      throw new Error('Esta pregunta IA ya fue respondida en la sesion');
    }

    const calculo = motor.calcularRespuestaOpcionMultiple(
      sesion,
      preguntaParaResponder,
      indiceOpcion
    );
    const metadatosActualizados = this.actualizarRechazosAreas(
      sesion.metadatos || {},
      calculo.opcionSeleccionada
    );

    await repo.guardarRespuesta({
      sesionId,
      pregunta: {
        id: null,
        pregunta: preguntaParaResponder.pregunta,
        tipo: 'opcion_multiple'
      },
      valorRespuesta: null,
      textoRespuesta: calculo.opcionSeleccionada.texto,
      opcionSeleccionada: {
        idPreguntaGenerada,
        indiceOpcion,
        ...calculo.opcionSeleccionada
      },
      puntajesAplicados: calculo.impactoAplicado,
      puntajesMaximosAplicados: Object.fromEntries(
        Object.entries(calculo.impactoAplicado).map(([area, valor]) => [
          area,
          valor
        ])
      )
    });

    const sesionActualizada = await repo.actualizarSesionPuntajes({
      sesionId,
      puntajesObtenidos: calculo.puntajesObtenidos,
      puntajesMaximos: calculo.puntajesMaximos,
      afinidadesActuales: calculo.afinidadesActuales,
      confianzaActual: calculo.confianzaActual,
      metadatos: metadatosActualizados
    });

    if (this.debeFinalizarAutomaticamente(sesionActualizada)) {
      const resultado = await this.finalizarTest(sesionId, { forzar: true });

      return {
        sesion: sesionActualizada,
        respuesta_registrada: true,
        test_finalizado: true,
        resultado
      };
    }

    const siguientePregunta = await this.generarPreguntaIA(sesionId);

    return {
      sesion: sesionActualizada,
      respuesta_registrada: true,
      siguiente_pregunta: siguientePregunta
    };
  }

  debeFinalizarAutomaticamente(sesion) {
    return Number(sesion.preguntas_realizadas || 0) >= TOTAL_PREGUNTAS_TEST;
  }

  actualizarRechazosAreas(metadatos, opcionSeleccionada) {
    const rechazosAreas = { ...(metadatos.rechazos_areas || {}) };

    for (const area of opcionSeleccionada.rechazo_areas || []) {
      rechazosAreas[area] = (rechazosAreas[area] || 0) + 1;
    }

    return {
      ...metadatos,
      rechazos_areas: rechazosAreas
    };
  }

  obtenerConfiguracionTest() {
    return {
      total_preguntas: TOTAL_PREGUNTAS_TEST,
      minimo_para_finalizar: MIN_PREGUNTAS_FINALIZAR
    };
  }
}

module.exports = new TestVocacionalService();
