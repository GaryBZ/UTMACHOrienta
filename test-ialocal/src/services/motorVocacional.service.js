function calcularRespuestaLikert(sesion, pregunta, valorRespuesta) {
  const puntajesObtenidos = sesion.puntajes_obtenidos || {};
  const puntajesMaximos = sesion.puntajes_maximos || {};

  const areasEvaluadas = pregunta.areas_evaluadas || {};

  for (const [area, peso] of Object.entries(areasEvaluadas)) {
    puntajesObtenidos[area] = (puntajesObtenidos[area] || 0) + peso * valorRespuesta;
    puntajesMaximos[area] = (puntajesMaximos[area] || 0) + peso * 5;
  }

  const afinidadesActuales = {};

  for (const [area, maximo] of Object.entries(puntajesMaximos)) {
    if (maximo > 0) {
      const obtenido = puntajesObtenidos[area] || 0;
      afinidadesActuales[area] = Number(
        ((obtenido / maximo) * 100).toFixed(2)
      );
    }
  }

  const confianzaActual = {};

  for (const area of Object.keys(puntajesMaximos)) {
    confianzaActual[area] = Math.min(
      100,
      Number(((puntajesMaximos[area] / 100) * 100).toFixed(2))
    );
  }

  return {
    puntajesObtenidos,
    puntajesMaximos,
    afinidadesActuales,
    confianzaActual,
    impactoAplicado: areasEvaluadas
  };
}

function calcularCompatibilidadCarreras(afinidadesActuales, carreras, metadatos = {}) {
  const rechazosAreas = metadatos.rechazos_areas || {};

  return carreras
    .map(carrera => {
      const areasCarrera = carrera.areas || {};
      const detalleAreas = {};
      let suma = 0;
      let total = 0;
      let penalizacionTotal = 0;

      for (const [area, pesoCarrera] of Object.entries(areasCarrera)) {
        const afinidadEstudiante = afinidadesActuales[area] ?? 0;
        const diferencia = Math.abs(afinidadEstudiante - Number(pesoCarrera));
        const penalizacionRechazo = calcularPenalizacionRechazo(
          Number(pesoCarrera),
          rechazosAreas[area] || 0
        );
        const compatibilidadArea = Math.max(0, 100 - diferencia - penalizacionRechazo);

        detalleAreas[area] = {
          estudiante: afinidadEstudiante,
          carrera: Number(pesoCarrera),
          compatibilidad: Number(compatibilidadArea.toFixed(2)),
          rechazos: rechazosAreas[area] || 0,
          penalizacion_rechazo: Number(penalizacionRechazo.toFixed(2))
        };

        suma += compatibilidadArea;
        penalizacionTotal += penalizacionRechazo;
        total++;
      }

      const compatibilidad = total > 0 ? suma / total : 0;

      return {
        id_carrera: carrera.id_carrera,
        codigo_carrera: carrera.codigo_carrera,
        carrera: carrera.nombre_carrera,
        facultad: carrera.facultad,
        compatibilidad: Number(compatibilidad.toFixed(2)),
        nivel: clasificarCompatibilidad(compatibilidad),
        penalizacion_rechazos: Number(penalizacionTotal.toFixed(2)),
        areas_coincidentes: detalleAreas
      };
    })
    .sort((a, b) => b.compatibilidad - a.compatibilidad);
}

function calcularPenalizacionRechazo(pesoCarrera, rechazosArea) {
  if (rechazosArea <= 0) {
    return 0;
  }

  const factorPeso = Math.max(0, Math.min(1, pesoCarrera / 100));

  if (rechazosArea === 1) {
    return 5 * factorPeso;
  }

  if (rechazosArea === 2) {
    return 15 * factorPeso;
  }

  return Math.min(35, (25 + (rechazosArea - 3) * 5) * factorPeso);
}

function clasificarCompatibilidad(valor) {
  if (valor >= 85) return 'muy_alta';
  if (valor >= 70) return 'alta';
  if (valor >= 60) return 'media';
  return 'baja';
}

function calcularRespuestaOpcionMultiple(sesion, preguntaGenerada, indiceOpcion) {
  const puntajesObtenidos = sesion.puntajes_obtenidos || {};
  const puntajesMaximos = sesion.puntajes_maximos || {};

  const opciones = preguntaGenerada.opciones || [];

  if (!Number.isInteger(indiceOpcion) || indiceOpcion < 0 || indiceOpcion >= opciones.length) {
    throw new Error('opcionSeleccionada no es válida');
  }

  const opcion = opciones[indiceOpcion];
  const impacto = opcion.impacto || {};

  for (const [area, valor] of Object.entries(impacto)) {
    puntajesObtenidos[area] = (puntajesObtenidos[area] || 0) + valor;
  }

  for (const opcionActual of opciones) {
    for (const [area, valor] of Object.entries(opcionActual.impacto || {})) {
      puntajesMaximos[area] = (puntajesMaximos[area] || 0) + valor;
    }
  }

  const afinidadesActuales = {};

  for (const [area, maximo] of Object.entries(puntajesMaximos)) {
    if (maximo > 0) {
      const obtenido = puntajesObtenidos[area] || 0;
      afinidadesActuales[area] = Number(
        ((obtenido / maximo) * 100).toFixed(2)
      );
    }
  }

  const confianzaActual = {};

  for (const area of Object.keys(puntajesMaximos)) {
    confianzaActual[area] = puntajesMaximos[area];
  }

  return {
    puntajesObtenidos,
    puntajesMaximos,
    afinidadesActuales,
    confianzaActual,
    impactoAplicado: impacto,
    opcionSeleccionada: opcion
  };
}

module.exports = {
  calcularRespuestaLikert,
  calcularCompatibilidadCarreras,
  calcularRespuestaOpcionMultiple
};
