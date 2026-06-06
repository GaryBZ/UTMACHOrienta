import * as ClaseService from '../services/clase.service.js';

export const getAll = async (req, res) => {
  try {
    const data = await ClaseService.getAllClases();
    res.json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

export const getById = async (req, res) => {
  try {
    const data = await ClaseService.getClaseById(req.params.id);
    res.json({ ok: true, data });
  } catch (error) {
    res.status(404).json({ ok: false, message: error.message });
  }
};

export const getByCarrera = async (req, res) => {
  try {
    const data = await ClaseService.getClasesByCarrera(req.params.id_carrera);
    res.json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const data = await ClaseService.createClase(req.body);
    res.status(201).json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const data = await ClaseService.updateClase(req.params.id, req.body);
    res.json({ ok: true, data });
  } catch (error) {
    res.status(404).json({ ok: false, message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    await ClaseService.deleteClase(req.params.id);
    res.json({ ok: true, message: 'Clase eliminada correctamente' });
  } catch (error) {
    res.status(404).json({ ok: false, message: error.message });
  }
};