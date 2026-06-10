import * as ExamenService from '../services/examen.service.js';

export const getAll = async (req, res) => {
  try {
    const data = await ExamenService.getAllExamenes();
    res.json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};