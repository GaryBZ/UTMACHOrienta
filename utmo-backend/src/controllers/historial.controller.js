import * as HistorialService from '../services/historial.service.js';

export const registrarVisita = async (req, res) => {
  try {
    const id_usuario = req.user.id;
    const { id_carrera } = req.body;
    if (!id_carrera) return res.status(400).json({ ok: false, message: 'id_carrera requerido' });
    const data = await HistorialService.registrarVisita(id_usuario, id_carrera);
    res.status(201).json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

export const actualizarTabs = async (req, res) => {
  try {
    const id_usuario = req.user.id;
    const { id_carrera, tabs_vistos } = req.body;
    if (!id_carrera) {
      return res.status(400).json({ ok: false, message: 'id_carrera requerido' });
    }
    const data = await HistorialService.actualizarTabs(id_usuario, id_carrera, tabs_vistos ?? []);
    res.json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

export const getHistorialUsuario = async (req, res) => {
  try {
    const id_usuario = req.user.id;
    const data = await HistorialService.getHistorialUsuario(id_usuario);
    res.json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

export const getMasVisitadas = async (req, res) => {
  try {
    const data = await HistorialService.getMasVisitadas();
    res.json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

export const getVisitasPorCarrera = async (req, res) => {
  try {
    const data = await HistorialService.getVisitasPorCarrera(req.params.id_carrera);
    res.json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

export const getTendencias = async (req, res) => {
  try {
    const data = await HistorialService.getTendencias();
    res.json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};