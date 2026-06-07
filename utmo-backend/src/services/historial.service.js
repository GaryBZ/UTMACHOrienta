import HistorialModel from '../models/historial.model.js';

export const registrarVisita = async (id_usuario, id_carrera) => {
  return await HistorialModel.registrarVisita(id_usuario, id_carrera);
};

export const getHistorialUsuario = async (id_usuario, limit = 5) => {
  return await HistorialModel.getByUsuario(id_usuario, limit);
};

export const countHistorialUsuario = async (id_usuario) => {
  return await HistorialModel.countByUsuario(id_usuario);
};

export const getMasVisitadas = async () => {
  return await HistorialModel.getMasVisitadas();
};

export const getVisitasPorCarrera = async (id_carrera) => {
  return await HistorialModel.getVisitasPorCarrera(id_carrera);
};

export const getTendencias = async () => {
  return await HistorialModel.getTendencias();
};

export const actualizarTabs = async (id_usuario, id_carrera, tabs_vistos) => {
  return await HistorialModel.actualizarTabs(id_usuario, id_carrera, tabs_vistos);
};