export interface Carrera {
  id: number;
  id_facultad: number;
  nombre: string;
  descripcion: string;
  duracion_anios: number | null;
  creditos: number | null;
  modalidad: string | null;
  puntaje_minimo: number | null;
  campo_laboral: string | null;
  etiquetas: string[] | null;
  activa: boolean | null;
}
