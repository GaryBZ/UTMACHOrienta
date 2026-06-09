import * as DashboardModel from '../models/dashboard.model.js';

export const getStats = () => DashboardModel.getStats();
export const getTopCarreras = () => DashboardModel.getTopCarreras();
export const getVisitasFacultad = () => DashboardModel.getVisitasFacultad();
export const getUsuariosRoles = () => DashboardModel.getUsuariosRoles();
export const getVisitasDiarias = (dias) => DashboardModel.getVisitasDiarias(dias);