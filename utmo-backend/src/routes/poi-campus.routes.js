import express from 'express';
const router = express.Router();
import * as controller from '../controllers/poi-campus.controller.js';

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.get('/categoria/:categoria', controller.getByCategoria);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

export default router;