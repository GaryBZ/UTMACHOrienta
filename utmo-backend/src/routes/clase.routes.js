import express from 'express';
const router = express.Router();
import * as controller from '../controllers/clase.controller.js';

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.get('/carrera/:id_carrera', controller.getByCarrera);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

export default router;