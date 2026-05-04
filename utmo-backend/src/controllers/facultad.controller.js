import FacultadModel from '../models/facultad.model.js';

export const getAll = async (req, res) => {
  try {
    const facultades = await FacultadModel.getAll();
    res.json({ ok: true, data: facultades });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

export const getById = async (req, res) => {
  try {
    const facultad = await FacultadModel.getById(req.params.id);
    if (!facultad) return res.status(404).json({ ok: false, message: 'Facultad no encontrada' });
    res.json({ ok: true, data: facultad });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const facultad = await FacultadModel.create(req.body);
    res.status(201).json({ ok: true, data: facultad });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const facultad = await FacultadModel.update(req.params.id, req.body);
    if (!facultad) return res.status(404).json({ ok: false, message: 'Facultad no encontrada' });
    res.json({ ok: true, data: facultad });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const facultad = await FacultadModel.remove(req.params.id);
    if (!facultad) return res.status(404).json({ ok: false, message: 'Facultad no encontrada' });
    res.json({ ok: true, message: 'Facultad eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};