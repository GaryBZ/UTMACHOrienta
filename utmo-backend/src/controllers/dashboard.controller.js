import * as DashboardService from '../services/dashboard.service.js';

export const getStats = async (req, res) => {
  try {
    const data = await DashboardService.getStats();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getTopCarreras = async (req, res) => {
  try {
    const data = await DashboardService.getTopCarreras();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getVisitasFacultad = async (req, res) => {
  try {
    const data = await DashboardService.getVisitasFacultad();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getUsuariosRoles = async (req, res) => {
  try {
    const data = await DashboardService.getUsuariosRoles();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getVisitasDiarias = async (req, res) => {
  try {
    const dias = parseInt(req.query.dias) || 30;
    const data = await DashboardService.getVisitasDiarias(dias);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};