import { Router } from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import {
  registrarVisita,
  getHistorialUsuario,
  getMasVisitadas,
  getVisitasPorCarrera,
  getTendencias,
  actualizarTabs
} from '../controllers/historial.controller.js';

const router = Router();

router.post('/visita', verifyToken, registrarVisita);
router.get('/usuario', verifyToken, getHistorialUsuario);
router.get('/mas-visitadas', getMasVisitadas);
router.get('/carrera/:id_carrera', getVisitasPorCarrera);
router.get('/tendencias', getTendencias);
router.patch('/tabs', verifyToken, actualizarTabs);

export default router;