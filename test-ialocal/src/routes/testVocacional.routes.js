const express = require('express');
const router = express.Router();

const controller = require('../controllers/testVocacional.controller');

router.post('/iniciar', controller.iniciar);
router.get('/:sesionId/pregunta', controller.obtenerPregunta);
router.post('/:sesionId/responder', controller.responder);
router.post('/:sesionId/finalizar', controller.finalizar);
router.get('/:sesionId/resultado', controller.obtenerResultado);
router.post('/:sesionId/responder-ia', controller.responderIA);
module.exports = router;