const pool = require('../config/db');

async function crearSesionTest(idUsuario) {
  if (!idUsuario) {
    throw new Error('idUsuario es obligatorio para crear una sesión vocacional');
  }

  const query = `
  INSERT INTO sesiones_test_vocacional (id_usuario, estado)
  VALUES ($1, 'en_progreso')
  RETURNING *;
`;

  const { rows } = await pool.query(query, [idUsuario]);
  return rows[0];
}

async function obtenerPreguntaExploracion() {
  const query = `
    SELECT *
    FROM preguntas_vocacionales
    WHERE fase = 'exploracion'
    ORDER BY RANDOM()
    LIMIT 1;
  `;

  const { rows } = await pool.query(query);

  return rows[0];
}

async function obtenerSesionPorId(sesionId) {
  const query = `
    SELECT *
    FROM sesiones_test_vocacional
    WHERE id = $1;
  `;

  const { rows } = await pool.query(query, [sesionId]);
  return rows[0];
}

async function obtenerPreguntaPorId(preguntaId) {
  const query = `
    SELECT *
    FROM preguntas_vocacionales
    WHERE id = $1;
  `;

  const { rows } = await pool.query(query, [preguntaId]);
  return rows[0];
}

async function guardarRespuesta({
  sesionId,
  pregunta,
  valorRespuesta,
  textoRespuesta,
  opcionSeleccionada,
  puntajesAplicados,
  puntajesMaximosAplicados
}) {
  const query = `
    INSERT INTO respuestas_test_vocacional (
      id_sesion,
      id_pregunta,
      pregunta_texto,
      tipo_pregunta,
      respuesta_valor,
      respuesta_texto,
      opcion_seleccionada,
      puntajes_aplicados,
      puntajes_maximos_aplicados
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;

  const values = [
    sesionId,
    pregunta.id,
    pregunta.pregunta,
    pregunta.tipo,
    valorRespuesta,
    textoRespuesta || null,
    opcionSeleccionada || null,
    puntajesAplicados,
    puntajesMaximosAplicados
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
}

async function actualizarSesionPuntajes({
  sesionId,
  puntajesObtenidos,
  puntajesMaximos,
  afinidadesActuales,
  confianzaActual,
  metadatos
}) {
  const asignacionMetadatos = metadatos === undefined ? '' : 'metadatos = $6,';
  const query = `
    UPDATE sesiones_test_vocacional
    SET
      puntajes_obtenidos = $2,
      puntajes_maximos = $3,
      afinidades_actuales = $4,
      confianza_actual = $5,
      ${asignacionMetadatos}
      preguntas_realizadas = preguntas_realizadas + 1
    WHERE id = $1
    RETURNING *;
  `;

  const values = [
    sesionId,
    puntajesObtenidos,
    puntajesMaximos,
    afinidadesActuales,
    confianzaActual
  ];

  if (metadatos !== undefined) {
    values.push(metadatos);
  }

  const { rows } = await pool.query(query, values);
  return rows[0];
}

async function obtenerIdsPreguntasRespondidas(sesionId) {
  const query = `
    SELECT id_pregunta
    FROM respuestas_test_vocacional
    WHERE id_sesion = $1;
  `;

  const { rows } = await pool.query(query, [sesionId]);

  return rows.map(row => row.id_pregunta);
}

async function obtenerSiguientePreguntaExploracion(sesionId) {
  const idsRespondidas = await obtenerIdsPreguntasRespondidas(sesionId);

  const query = `
    SELECT *
    FROM preguntas_vocacionales
    WHERE fase = 'exploracion'
      AND activa = true
      AND (
        $1::int[] IS NULL
        OR id <> ALL($1::int[])
      )
    ORDER BY RANDOM()
    LIMIT 1;
  `;

  const ids = idsRespondidas.length > 0 ? idsRespondidas : null;

  const { rows } = await pool.query(query, [ids]);

  return rows[0];
}

async function obtenerSiguientePreguntaPorFase(sesionId, fase) {
  const idsRespondidas = await obtenerIdsPreguntasRespondidas(sesionId);

  const query = `
    SELECT *
    FROM preguntas_vocacionales
    WHERE fase = $2
      AND activa = true
      AND (
        $1::int[] IS NULL
        OR id <> ALL($1::int[])
      )
    ORDER BY RANDOM()
    LIMIT 1;
  `;

  const ids = idsRespondidas.length > 0 ? idsRespondidas : null;

  const { rows } = await pool.query(query, [ids, fase]);
  return rows[0];
}

async function obtenerSiguientePregunta(sesionId) {
  const sesion = await obtenerSesionPorId(sesionId);

  if (!sesion) {
    throw new Error('Sesión no encontrada');
  }

  if (sesion.estado !== 'en_progreso') {
    throw new Error('La sesión no está en progreso');
  }

  if (sesion.preguntas_realizadas < 5) {
    return await obtenerSiguientePreguntaPorFase(sesionId, 'exploracion');
  }

  const areasTop = obtenerAreasTop(sesion.afinidades_actuales, 3);

  let pregunta = await obtenerPreguntaProfundizacionPorAreas(sesionId, areasTop);

  if (!pregunta) {
    pregunta = await obtenerSiguientePreguntaPorFase(sesionId, 'profundizacion');
  }

  if (!pregunta) {
    pregunta = await obtenerSiguientePreguntaPorFase(sesionId, 'exploracion');
  }

  return pregunta;
}

async function obtenerPreguntaProfundizacionPorAreas(sesionId, areasTop) {
  const idsRespondidas = await obtenerIdsPreguntasRespondidas(sesionId);

  const query = `
    SELECT *
    FROM preguntas_vocacionales
    WHERE fase = 'profundizacion'
      AND activa = true
      AND areas_objetivo && $2::text[]
      AND (
        $1::int[] IS NULL
        OR id <> ALL($1::int[])
      )
    ORDER BY RANDOM()
    LIMIT 1;
  `;

  const ids = idsRespondidas.length > 0 ? idsRespondidas : null;

  const { rows } = await pool.query(query, [ids, areasTop]);
  return rows[0];
}

function obtenerAreasTop(afinidadesActuales, limite = 3) {
  return Object.entries(afinidadesActuales || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, limite)
    .map(([area]) => area);
}

async function obtenerCarrerasConAreas() {
  const query = `
    SELECT
      c.id AS id_carrera,
      c.nombre AS nombre_carrera,
      c.nombre AS codigo_carrera,
      f.nombre_completo AS facultad,
      jsonb_object_agg(av.codigo, cav.peso) AS areas
    FROM carreras c
    INNER JOIN carrera_area_vocacional cav
      ON cav.id_carrera = c.id
    INNER JOIN areas_vocacionales av
      ON av.id = cav.id_area
    LEFT JOIN facultades f
      ON f.id = c.id_facultad
    WHERE c.activa = true
    GROUP BY c.id, c.nombre, f.nombre_completo
    ORDER BY c.nombre;
  `;

  const { rows } = await pool.query(query);
  return rows;
}

async function guardarResultadoFinal({
  sesionId,
  idUsuario,
  afinidades,
  confianza,
  rankingCarreras,
  carrerasRecomendadas,
  explicacion,
  versionModelo = '1.0.0'
}) {
  const query = `
    INSERT INTO resultados_test_vocacional (
      id_sesion,
      id_usuario,
      afinidades,
      confianza,
      ranking_carreras,
      carreras_recomendadas,
      explicacion,
      version_modelo
    )
    VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, $7, $8)
    RETURNING *;
  `;

  const values = [
    sesionId,
    idUsuario,
    JSON.stringify(afinidades),
    JSON.stringify(confianza),
    JSON.stringify(rankingCarreras),
    JSON.stringify(carrerasRecomendadas),
    explicacion,
    versionModelo
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
}

async function finalizarSesion(sesionId) {
  const query = `
    UPDATE sesiones_test_vocacional
    SET estado = 'finalizado',
        fecha_fin = NOW()
    WHERE id = $1
    RETURNING *;
  `;

  const { rows } = await pool.query(query, [sesionId]);
  return rows[0];
}

async function obtenerResultadoPorSesion(sesionId) {
  const query = `
    SELECT *
    FROM resultados_test_vocacional
    WHERE id_sesion = $1
    ORDER BY fecha DESC
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [sesionId]);
  return rows[0];
}

async function guardarPreguntaGeneradaLLM({
  sesionId,
  prompt,
  respuestaLLM,
  preguntaGenerada
}) {
  const query = `
    INSERT INTO preguntas_generadas_llm (
      id_sesion,
      prompt,
      respuesta_llm,
      pregunta_generada
    )
    VALUES ($1, $2, $3::jsonb, $4::jsonb)
    RETURNING *;
  `;

  const values = [
    sesionId,
    prompt,
    JSON.stringify(respuestaLLM),
    JSON.stringify(preguntaGenerada)
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
}

async function obtenerPreguntaGeneradaPorId(idGenerada) {
  const query = `
    SELECT *
    FROM preguntas_generadas_llm
    WHERE id = $1;
  `;

  const { rows } = await pool.query(query, [idGenerada]);
  return rows[0];
}

async function existeRespuestaBanco(sesionId, preguntaId) {
  const query = `
    SELECT 1
    FROM respuestas_test_vocacional
    WHERE id_sesion = $1
      AND id_pregunta = $2
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [sesionId, preguntaId]);
  return rows.length > 0;
}

async function existeRespuestaIAPorTexto(sesionId, preguntaTexto) {
  const query = `
    SELECT 1
    FROM respuestas_test_vocacional
    WHERE id_sesion = $1
      AND tipo_pregunta = 'opcion_multiple'
      AND pregunta_texto = $2
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [sesionId, preguntaTexto]);
  return rows.length > 0;
}

async function existeRespuestaIAPorIdGenerada(sesionId, idPreguntaGenerada) {
  const query = `
    SELECT 1
    FROM respuestas_test_vocacional
    WHERE id_sesion = $1
      AND tipo_pregunta = 'opcion_multiple'
      AND opcion_seleccionada->>'idPreguntaGenerada' = $2
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [sesionId, String(idPreguntaGenerada)]);
  return rows.length > 0;
}

async function obtenerHistorialSesionVocacional(sesionId) {
  const respuestasQuery = `
    SELECT
      pregunta_texto,
      tipo_pregunta,
      respuesta_valor,
      respuesta_texto,
      opcion_seleccionada,
      puntajes_aplicados
    FROM respuestas_test_vocacional
    WHERE id_sesion = $1
    ORDER BY id;
  `;

  const preguntasIAQuery = `
    SELECT id, pregunta_generada
    FROM preguntas_generadas_llm
    WHERE id_sesion = $1
    ORDER BY id;
  `;

  const [respuestas, preguntasIA] = await Promise.all([
    pool.query(respuestasQuery, [sesionId]),
    pool.query(preguntasIAQuery, [sesionId])
  ]);

  return {
    respuestas: respuestas.rows,
    preguntasIA: preguntasIA.rows
  };
}

module.exports = {
  crearSesionTest,
  obtenerPreguntaExploracion,
  obtenerSesionPorId,
  obtenerPreguntaPorId,
  guardarRespuesta,
  actualizarSesionPuntajes,
  obtenerIdsPreguntasRespondidas,
  obtenerSiguientePreguntaExploracion,
  obtenerSiguientePreguntaPorFase,
  obtenerSiguientePregunta,
  obtenerPreguntaProfundizacionPorAreas,
  obtenerCarrerasConAreas,
  guardarResultadoFinal,
  finalizarSesion,
  obtenerResultadoPorSesion,
  guardarPreguntaGeneradaLLM,
  obtenerPreguntaGeneradaPorId,
  existeRespuestaBanco,
  existeRespuestaIAPorTexto,
  existeRespuestaIAPorIdGenerada,
  obtenerHistorialSesionVocacional
};
