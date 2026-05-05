import CarreraModel from '../models/carrera.model.js';

export const getAllCarreras = async () => {
  return await CarreraModel.getAll();
};

export const getCarreraById = async (id) => {
  const carrera = await CarreraModel.getById(id);
  if (!carrera) throw new Error('Carrera no encontrada');
  return carrera;
};

export const getCarrerasByFacultad = async (id_facultad) => {
  return await CarreraModel.getByFacultad(id_facultad);
};

export const createCarrera = async (data) => {
  return await CarreraModel.create(data);
};

export const updateCarrera = async (id, data) => {
  const carrera = await CarreraModel.update(id, data);
  if (!carrera) throw new Error('Carrera no encontrada');
  return carrera;
};

export const deleteCarrera = async (id) => {
  const carrera = await CarreraModel.remove(id);
  if (!carrera) throw new Error('Carrera no encontrada');
  return carrera;
};