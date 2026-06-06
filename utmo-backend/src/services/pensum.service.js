import PensumModel from '../models/pensum.model.js';

export const getAllPensums = async () => {
  return await PensumModel.getAll();
};

export const getPensumById = async (id) => {
  const pensum = await PensumModel.getById(id);
  if (!pensum) throw new Error('Pensum no encontrado');
  return pensum;
};

export const getPensumsByCarrera = async (id_carrera) => {
  return await PensumModel.getByCarrera(id_carrera);
};

export const createPensum = async (data) => {
  return await PensumModel.create(data);
};

export const updatePensum = async (id, data) => {
  const pensum = await PensumModel.update(id, data);
  if (!pensum) throw new Error('Pensum no encontrado');
  return pensum;
};

export const deletePensum = async (id) => {
  const pensum = await PensumModel.remove(id);
  if (!pensum) throw new Error('Pensum no encontrado');
  return pensum;
};