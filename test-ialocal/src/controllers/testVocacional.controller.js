const testService = require('../services/testVocacional.service');

async function iniciar(req, res) {
  try {
    const { idUsuario } = req.body;

    const resultado = await testService.iniciarTest(idUsuario);

    return res.status(201).json({
      ok: true,
      data: resultado
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

async function obtenerPregunta(req, res) {
  try {
    const { sesionId } = req.params;

    const pregunta = await testService.obtenerPregunta(Number(sesionId));

    return res.json({
      ok: true,
      data: pregunta
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

async function responder(req, res) {
  try {
    const { sesionId } = req.params;
    const { preguntaId, valorRespuesta } = req.body;

    const resultado = await testService.responderPregunta(
      Number(sesionId),
      Number(preguntaId),
      Number(valorRespuesta)
    );

    return res.json({
      ok: true,
      data: resultado
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

async function finalizar(req, res) {
  try {
    const { sesionId } = req.params;

    const resultado = await testService.finalizarTest(Number(sesionId));

    return res.json({
      ok: true,
      data: resultado
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

async function obtenerResultado(req, res) {
  try {
    const { sesionId } = req.params;

    const resultado = await testService.obtenerResultado(Number(sesionId));

    return res.json({
      ok: true,
      data: resultado
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

async function responderIA(req, res) {
  try {
    const { sesionId } = req.params;
    const { idPreguntaGenerada, opcionSeleccionada } = req.body;

    const resultado = await testService.responderPreguntaIA(
      Number(sesionId),
      Number(idPreguntaGenerada),
      Number(opcionSeleccionada)
    );

    return res.json({
      ok: true,
      data: resultado
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

module.exports = {
  iniciar,
  obtenerPregunta,
  responder,
  finalizar,
  obtenerResultado,
  responderIA
};