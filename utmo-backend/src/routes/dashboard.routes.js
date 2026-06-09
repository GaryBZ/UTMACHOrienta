import express from 'express';
import * as DashboardController from '../controllers/dashboard.controller.js';

const router = express.Router();

router.get('/stats', DashboardController.getStats);
router.get('/top-carreras', DashboardController.getTopCarreras);
router.get('/visitas-facultad', DashboardController.getVisitasFacultad);
router.get('/usuarios-roles', DashboardController.getUsuariosRoles);
router.get('/visitas-diarias', DashboardController.getVisitasDiarias);

export default router;