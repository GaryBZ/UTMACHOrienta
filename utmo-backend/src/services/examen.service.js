import ExamenModel from '../models/examen.model.js';

export const getAllExamenes = async () => {
  return await ExamenModel.getAll();
};