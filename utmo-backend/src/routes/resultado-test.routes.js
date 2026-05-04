import express from 'express';
const router = express.Router();
import * as controller from '../controllers/resultado-test.controller.js';

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.get('/usuario/:id_usuario', controller.getByUsuario);
router.post('/', controller.create);

export default router;