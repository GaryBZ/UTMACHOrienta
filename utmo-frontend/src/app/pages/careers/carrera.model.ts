export interface Carrera {
  id: number;
  nombre: string;
  facultad: string;
  facultadNombre: string;
  icon: string;
  descripcion: string;
  duracion: string;
  semestres: number;
  modalidad: string;
  puntaje: number;
  campoLaboral: string;
  acreditacion: string;
  opciones: string[];
  pensum: { semestre: number; materias: number }[];
  temaClase: string;
  preguntas: { texto: string; opciones: string[]; respuesta: number }[];
}
