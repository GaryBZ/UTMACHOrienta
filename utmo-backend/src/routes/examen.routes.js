import { Router } from 'express';
import { getAll } from '../controllers/examen.controller.js';

const router = Router();

router.get('/', getAll);

export default router;