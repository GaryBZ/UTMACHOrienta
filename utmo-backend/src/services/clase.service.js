import ClaseModel from '../models/clase.model.js';

export const getAllClases = async () => {
  return await ClaseModel.getAll();
};

export const getClaseById = async (id) => {
  const clase = await ClaseModel.getById(id);
  if (!clase) throw new Error('Clase no encontrada');
  return clase;
};

export const getClasesByCarrera = async (id_carrera) => {
  return await ClaseModel.getByCarrera(id_carrera);
};

export const createClase = async (data) => {
  return await ClaseModel.create(data);
};

export const updateClase = async (id, data) => {
  const clase = await ClaseModel.update(id, data);
  if (!clase) throw new Error('Clase no encontrada');
  return clase;
};

export const deleteClase = async (id) => {
  const clase = await ClaseModel.remove(id);
  if (!clase) throw new Error('Clase no encontrada');
  return clase;
};