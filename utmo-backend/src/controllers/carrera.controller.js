import * as CarreraService from '../services/carrera.service.js';

export const getAll = async (req, res) => {
  try {
    const data = await CarreraService.getAllCarreras();
    res.json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

export const getById = async (req, res) => {
  try {
    const data = await CarreraService.getCarreraById(req.params.id);
    res.json({ ok: true, data });
  } catch (error) {
    res.status(404).json({ ok: false, message: error.message });
  }
};

export const getByFacultad = async (req, res) => {
  try {
    const data = await CarreraService.getCarrerasByFacultad(req.params.id_facultad);
    res.json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const data = await CarreraService.createCarrera(req.body);
    res.status(201).json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const data = await CarreraService.updateCarrera(req.params.id, req.body);
    res.json({ ok: true, data });
  } catch (error) {
    res.status(404).json({ ok: false, message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    await CarreraService.deleteCarrera(req.params.id);
    res.json({ ok: true, message: 'Carrera eliminada correctamente' });
  } catch (error) {
    res.status(404).json({ ok: false, message: error.message });
  }
};