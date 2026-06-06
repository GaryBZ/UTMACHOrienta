import * as PensumService from '../services/pensum.service.js';

export const getAll = async (req, res) => {
  try {
    const data = await PensumService.getAllPensums();
    res.json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

export const getById = async (req, res) => {
  try {
    const data = await PensumService.getPensumById(req.params.id);
    res.json({ ok: true, data });
  } catch (error) {
    res.status(404).json({ ok: false, message: error.message });
  }
};

export const getByCarrera = async (req, res) => {
  try {
    const data = await PensumService.getPensumsByCarrera(req.params.id_carrera);
    res.json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const data = await PensumService.createPensum(req.body);
    res.status(201).json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const data = await PensumService.updatePensum(req.params.id, req.body);
    res.json({ ok: true, data });
  } catch (error) {
    res.status(404).json({ ok: false, message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    await PensumService.deletePensum(req.params.id);
    res.json({ ok: true, message: 'Pensum eliminado correctamente' });
  } catch (error) {
    res.status(404).json({ ok: false, message: error.message });
  }
};