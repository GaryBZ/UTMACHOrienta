import { Router } from 'express';
import { getAll, toggleActivo } from '../controllers/usuario.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = Router();
router.get('/', verifyToken, getAll);
router.patch('/:id/activo', verifyToken, toggleActivo);

export default router;