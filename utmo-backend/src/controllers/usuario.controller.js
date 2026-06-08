import UsuarioModel from '../models/usuario.model.js';

export const getAll = async (req, res) => {
  try {
    const data = await UsuarioModel.getAll();
    res.json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

export const toggleActivo = async (req, res) => {
  try {
    const { activo } = req.body;
    const data = await UsuarioModel.toggleActivo(req.params.id, activo);
    res.json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};