import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DetailCareersComponent } from './detail-careers/detail-careers.component';
import { Carrera } from './carrera.model';

@Component({
  selector: 'app-careers',
  templateUrl: './careers.component.html',
  styleUrls: ['./careers.component.scss'],
  standalone: true,
  imports: [FormsModule, CommonModule, DetailCareersComponent]
})
export class CareersComponent implements OnInit {
  carreras: Carrera[] = [
    {
      id: 1,
      nombre: 'Tecnologías de la Información',
      facultad: 'FIC',
      facultadNombre: 'Facultad de Ingeniería Civil',
      icon: 'fa-solid fa-laptop-code',
      descripcion: 'Forma profesionales capaces de diseñar, desarrollar e implementar soluciones tecnológicas innovadoras para resolver problemas del mundo real.',
      duracion: '4 años',
      semestres: 8,
      modalidad: 'Presencial',
      puntaje: 92,
      campoLaboral: 'Desarrollo de software, análisis de sistemas, consultoría tecnológica',
      acreditacion: 'CONESUP (2023)',
      opciones: ['Desarrollo Web', 'Ciberseguridad', 'Arquitectura de Sistemas', 'Emprendimiento'],
      pensum: [{ semestre: 1, materias: 6 }, { semestre: 2, materias: 6 }, { semestre: 3, materias: 6 }, { semestre: 4, materias: 6 }, { semestre: 5, materias: 6 }, { semestre: 6, materias: 6 }, { semestre: 7, materias: 5 }, { semestre: 8, materias: 4 }],
      temaClase: 'Fundamentos de Programación',
      preguntas: [
        { texto: '¿Qué es un algoritmo?', opciones: ['Un error', 'Pasos para resolver un problema', 'Una variable', 'Un tipo de dato'], respuesta: 1 },
        { texto: '¿Cuál es O(log n)?', opciones: ['O(n)', 'O(n²)', 'O(log n)', 'O(1)'], respuesta: 2 },
        { texto: '¿Mejor para pilas?', opciones: ['Array', 'Lista enlazada', 'Ambas', 'Árboles'], respuesta: 1 }
      ]
    },
    {
      id: 2,
      nombre: 'Agronomía',
      facultad: 'FCA',
      facultadNombre: 'Facultad de Ciencias Agropecuarias',
      icon: 'fa-solid fa-leaf',
      descripcion: 'Forma profesionales especializados en técnicas modernas de cultivo, manejo de suelos y producción agrícola sostenible.',
      duracion: '4 años',
      semestres: 8,
      modalidad: 'Presencial',
      puntaje: 85,
      campoLaboral: 'Producción agrícola, consultoría agronómica, investigación, extensión rural',
      acreditacion: 'CONESUP (2023)',
      opciones: ['Productor Agrícola', 'Consultor Ambiental', 'Investigador', 'Gestor de Proyectos'],
      pensum: [{ semestre: 1, materias: 6 }, { semestre: 2, materias: 6 }, { semestre: 3, materias: 6 }, { semestre: 4, materias: 6 }, { semestre: 5, materias: 6 }, { semestre: 6, materias: 6 }, { semestre: 7, materias: 5 }, { semestre: 8, materias: 4 }],
      temaClase: 'Fundamentos de Agronomía',
      preguntas: [
        { texto: '¿Qué es un cultivo?', opciones: ['Animal', 'Planta cultivada', 'Proceso', 'Herramienta'], respuesta: 1 },
        { texto: '¿Importancia del pH del suelo?', opciones: ['Color', 'Drenaje', 'Disponibilidad de nutrientes', 'Textura'], respuesta: 2 },
        { texto: '¿Rotación de cultivos?', opciones: ['Mover máquinas', 'Alternar plantas para conservar suelo', 'Riego', 'Fertilizante'], respuesta: 1 }
      ]
    },
    {
      id: 3,
      nombre: 'Administración de Empresas',
      facultad: 'FCE',
      facultadNombre: 'Facultad de Ciencias Empresariales',
      icon: 'fa-solid fa-chart-line',
      descripcion: 'Prepara profesionales con capacidad de gestión integral, toma de decisiones estratégicas y liderazgo empresarial.',
      duracion: '3 años',
      semestres: 6,
      modalidad: 'Presencial',
      puntaje: 88,
      campoLaboral: 'Administración, finanzas, recursos humanos, emprendimiento',
      acreditacion: 'CONESUP (2023)',
      opciones: ['Administrador', 'Emprendedor', 'Consultor', 'Gestor Público'],
      pensum: [{ semestre: 1, materias: 5 }, { semestre: 2, materias: 5 }, { semestre: 3, materias: 5 }, { semestre: 4, materias: 5 }, { semestre: 5, materias: 5 }, { semestre: 6, materias: 4 }],
      temaClase: 'Fundamentos de Administración',
      preguntas: [
        { texto: '¿Funciones administrativas?', opciones: ['Producir', 'Planificar, organizar, dirigir, controlar', 'Vender', 'Servicio'], respuesta: 1 },
        { texto: '¿FODA es?', opciones: ['Venta', 'Análisis estratégico', 'Plan', 'Auditoría'], respuesta: 1 },
        { texto: '¿Liderazgo efectivo?', opciones: ['Dinero', 'Influencia', 'Decisión-Ejecución-Evaluación', 'Autoridad'], respuesta: 2 }
      ]
    },
    {
      id: 4,
      nombre: 'Medicina',
      facultad: 'FCQS',
      facultadNombre: 'Facultad de Ciencias Químicas y de la Salud',
      icon: 'fa-solid fa-stethoscope',
      descripcion: 'Forma médicos preparados para diagnóstico, tratamiento, prevención de enfermedades y promoción de la salud.',
      duracion: '6 años',
      semestres: 12,
      modalidad: 'Presencial',
      puntaje: 90,
      campoLaboral: 'Hospitales, clínicas, medicina general, especialidades',
      acreditacion: 'CONESUP (2023)',
      opciones: ['Médico General', 'Cirujano', 'Especialista', 'Investigador'],
      pensum: [{ semestre: 1, materias: 6 }, { semestre: 2, materias: 6 }, { semestre: 3, materias: 6 }, { semestre: 4, materias: 6 }, { semestre: 5, materias: 6 }, { semestre: 6, materias: 6 }, { semestre: 7, materias: 6 }, { semestre: 8, materias: 6 }, { semestre: 9, materias: 5 }, { semestre: 10, materias: 5 }, { semestre: 11, materias: 5 }, { semestre: 12, materias: 4 }],
      temaClase: 'Anatomía Humana',
      preguntas: [
        { texto: '¿Huesos del cuerpo?', opciones: ['150', '206', '250', '300'], respuesta: 1 },
        { texto: '¿Función del corazón?', opciones: ['Emociones', 'Bombear sangre', 'Energía', 'Filtrar'], respuesta: 1 },
        { texto: '¿Presión arterial?', opciones: ['Peso', 'Fuerza de sangre en arterias', 'Ritmo', 'Oxígeno'], respuesta: 1 }
      ]
    },
    {
      id: 5,
      nombre: 'Derecho',
      facultad: 'FCS',
      facultadNombre: 'Facultad de Ciencias Sociales',
      icon: 'fa-solid fa-gavel',
      descripcion: 'Forma abogados especializados en defensa de derechos, justicia y asesoría legal profesional.',
      duracion: '5 años',
      semestres: 10,
      modalidad: 'Presencial',
      puntaje: 87,
      campoLaboral: 'Litigio, asesoría legal, justicia, notaría, política',
      acreditacion: 'CONESUP (2023)',
      opciones: ['Abogado Litigante', 'Asesor Legal', 'Juez', 'Notario'],
      pensum: [{ semestre: 1, materias: 5 }, { semestre: 2, materias: 5 }, { semestre: 3, materias: 5 }, { semestre: 4, materias: 5 }, { semestre: 5, materias: 5 }, { semestre: 6, materias: 5 }, { semestre: 7, materias: 5 }, { semestre: 8, materias: 5 }, { semestre: 9, materias: 4 }, { semestre: 10, materias: 4 }],
      temaClase: 'Introducción al Derecho',
      preguntas: [
        { texto: '¿Qué es el Derecho?', opciones: ['Dinero', 'Conjunto de normas', 'Poder', 'Política'], respuesta: 1 },
        { texto: '¿Ramas del Derecho?', opciones: ['Civil, Penal, Laboral', 'Solo Civil', 'Deportivo', 'Económico'], respuesta: 0 },
        { texto: '¿Justicia?', opciones: ['Castigo', 'Equidad y aplicación de ley', 'Dinero', 'Autoridad'], respuesta: 1 }
      ]
    },
    {
      id: 6,
      nombre: 'Ingeniería Civil',
      facultad: 'FIC',
      facultadNombre: 'Facultad de Ingeniería Civil',
      icon: 'fa-solid fa-building',
      descripcion: 'Prepara ingenieros para diseñar, construir y mantener infraestructuras de calidad y durabilidad.',
      duracion: '4 años',
      semestres: 8,
      modalidad: 'Presencial',
      puntaje: 89,
      campoLaboral: 'Construcción, proyectos, supervisión, diseño estructural',
      acreditacion: 'CONESUP (2023)',
      opciones: ['Proyectista', 'Supervisor', 'Estructuralista', 'Gestor'],
      pensum: [{ semestre: 1, materias: 6 }, { semestre: 2, materias: 6 }, { semestre: 3, materias: 6 }, { semestre: 4, materias: 6 }, { semestre: 5, materias: 6 }, { semestre: 6, materias: 6 }, { semestre: 7, materias: 5 }, { semestre: 8, materias: 4 }],
      temaClase: 'Estructuras y Materiales',
      preguntas: [
        { texto: '¿Qué es una viga?', opciones: ['Cimiento', 'Elemento horizontal', 'Drenaje', 'Columna'], respuesta: 1 },
        { texto: '¿Resistencia a compresión?', opciones: ['Flexión', 'Soportar fuerzas', 'Durabilidad', 'Flexibilidad'], respuesta: 1 },
        { texto: '¿Cimiento es?', opciones: ['Techo', 'Base de estructura', 'Paredes', 'Sistema eléctrico'], respuesta: 1 }
      ]
    },
    {
      id: 7,
      nombre: 'Medicina Veterinaria',
      facultad: 'FCA',
      facultadNombre: 'Facultad de Ciencias Agropecuarias',
      icon: 'fa-solid fa-paw',
      descripcion: 'Forma veterinarios especializados en salud animal, producción pecuaria y bienestar animal.',
      duracion: '5 años',
      semestres: 10,
      modalidad: 'Presencial',
      puntaje: 86,
      campoLaboral: 'Clínicas veterinarias, producción pecuaria, investigación, salud pública',
      acreditacion: 'CONESUP (2023)',
      opciones: ['Veterinario Clínico', 'Productor Pecuario', 'Investigador', 'Funcionario'],
      pensum: [{ semestre: 1, materias: 6 }, { semestre: 2, materias: 6 }, { semestre: 3, materias: 6 }, { semestre: 4, materias: 6 }, { semestre: 5, materias: 6 }, { semestre: 6, materias: 6 }, { semestre: 7, materias: 6 }, { semestre: 8, materias: 6 }, { semestre: 9, materias: 5 }, { semestre: 10, materias: 4 }],
      temaClase: 'Anatomía Veterinaria',
      preguntas: [
        { texto: '¿Especies domésticas?', opciones: ['Perro, gato, caballo', 'Solo perro', 'Salvajes', 'Insectos'], respuesta: 0 },
        { texto: '¿Función del veterinario?', opciones: ['Humanos', 'Plantas', 'Salud animal', 'Medicinas'], respuesta: 2 },
        { texto: '¿Importancia de vacunas?', opciones: ['Dinero', 'Prevención de enfermedad', 'Alimentación', 'Ejercicio'], respuesta: 1 }
      ]
    },
    {
      id: 8,
      nombre: 'Contabilidad y Auditoría',
      facultad: 'FCE',
      facultadNombre: 'Facultad de Ciencias Empresariales',
      icon: 'fa-solid fa-calculator',
      descripcion: 'Prepara contadores y auditores con habilidad en gestión financiera y control empresarial.',
      duracion: '3 años',
      semestres: 6,
      modalidad: 'Presencial',
      puntaje: 84,
      campoLaboral: 'Contabilidad, auditoría, asesoramiento fiscal, finanzas',
      acreditacion: 'CONESUP (2023)',
      opciones: ['Contador', 'Auditor', 'Asesor Fiscal', 'Analista Financiero'],
      pensum: [{ semestre: 1, materias: 5 }, { semestre: 2, materias: 5 }, { semestre: 3, materias: 5 }, { semestre: 4, materias: 5 }, { semestre: 5, materias: 5 }, { semestre: 6, materias: 4 }],
      temaClase: 'Principios de Contabilidad',
      preguntas: [
        { texto: '¿Ecuación contable?', opciones: ['Activos = Pasivos', 'Activos = Pasivos + Patrimonio', 'Ingresos = Gastos', 'Capital = Deuda'], respuesta: 1 },
        { texto: '¿Balance General?', opciones: ['Ingresos', 'Estado financiero', 'Flujo', 'Presupuesto'], respuesta: 1 },
        { texto: '¿Auditoría?', opciones: ['Conteo', 'Examen de registros', 'Inversión', 'Impuestos'], respuesta: 1 }
      ]
    },
    {
      id: 9,
      nombre: 'Enfermería',
      facultad: 'FCQS',
      facultadNombre: 'Facultad de Ciencias Químicas y de la Salud',
      icon: 'fa-solid fa-heart-pulse',
      descripcion: 'Forma enfermeros comprometidos con cuidado de pacientes y promoción de la salud integral.',
      duracion: '3 años',
      semestres: 6,
      modalidad: 'Presencial',
      puntaje: 82,
      campoLaboral: 'Hospitales, clínicas, centros de salud, cuidado comunitario',
      acreditacion: 'CONESUP (2023)',
      opciones: ['Enfermero Hospitalario', 'Enfermero Comunitario', 'Especialista', 'Docente'],
      pensum: [{ semestre: 1, materias: 5 }, { semestre: 2, materias: 5 }, { semestre: 3, materias: 5 }, { semestre: 4, materias: 5 }, { semestre: 5, materias: 5 }, { semestre: 6, materias: 4 }],
      temaClase: 'Fundamentos de Enfermería',
      preguntas: [
        { texto: '¿Rol enfermero?', opciones: ['Médico', 'Cuidado y prevención', 'Administrador', 'Investigador'], respuesta: 1 },
        { texto: '¿Vital importante?', opciones: ['Dinero', 'Presión arterial y frecuencia cardíaca', 'Humor', 'Energía'], respuesta: 1 },
        { texto: '¿Ética en enfermería?', opciones: ['Lucrativa', 'Respeto y confidencialidad', 'Rapidez', 'Lucro'], respuesta: 1 }
      ]
    },
    {
      id: 10,
      nombre: 'Comunicación Social',
      facultad: 'FCS',
      facultadNombre: 'Facultad de Ciencias Sociales',
      icon: 'fa-solid fa-microphone',
      descripcion: 'Forma comunicadores especializados en medios, periodismo y gestión de comunicación corporativa.',
      duracion: '4 años',
      semestres: 8,
      modalidad: 'Presencial',
      puntaje: 80,
      campoLaboral: 'Periodismo, medios, publicidad, comunicación corporativa, redes sociales',
      acreditacion: 'CONESUP (2023)',
      opciones: ['Periodista', 'Community Manager', 'Publicista', 'Productor'],
      pensum: [{ semestre: 1, materias: 5 }, { semestre: 2, materias: 5 }, { semestre: 3, materias: 5 }, { semestre: 4, materias: 5 }, { semestre: 5, materias: 5 }, { semestre: 6, materias: 5 }, { semestre: 7, materias: 4 }, { semestre: 8, materias: 4 }],
      temaClase: 'Teoría de la Comunicación',
      preguntas: [
        { texto: '¿Comunicación?', opciones: ['Hablar', 'Proceso de transferencia información', 'Escuchar', 'Radio'], respuesta: 1 },
        { texto: '¿Elementos comunicación?', opciones: ['Emisor, mensaje, receptor', 'Solo palabras', 'Dinero', 'Tecnología'], respuesta: 0 },
        { texto: '¿Redes sociales?', opciones: ['Amigos', 'Plataformas comunicación', 'Dinero', 'Empresa'], respuesta: 1 }
      ]
    },
    {
      id: 11,
      nombre: 'Acuicultura',
      facultad: 'FCA',
      facultadNombre: 'Facultad de Ciencias Agropecuarias',
      icon: 'fa-solid fa-fish',
      descripcion: 'Forma profesionales en crianza y cultivo de organismos acuáticos con sostenibilidad ambiental.',
      duracion: '4 años',
      semestres: 8,
      modalidad: 'Presencial',
      puntaje: 81,
      campoLaboral: 'Acuicultura, recursos pesqueros, investigación marina, gestión ambiental',
      acreditacion: 'CONESUP (2023)',
      opciones: ['Acuicultor', 'Especialista Marino', 'Investigador', 'Gestor Ambiental'],
      pensum: [{ semestre: 1, materias: 6 }, { semestre: 2, materias: 6 }, { semestre: 3, materias: 6 }, { semestre: 4, materias: 6 }, { semestre: 5, materias: 6 }, { semestre: 6, materias: 6 }, { semestre: 7, materias: 5 }, { semestre: 8, materias: 4 }],
      temaClase: 'Fundamentos de Acuicultura',
      preguntas: [
        { texto: '¿Acuicultura es?', opciones: ['Pesca', 'Cultivo de organismos acuáticos', 'Plantas', 'Animales terrestres'], respuesta: 1 },
        { texto: '¿Calidad del agua?', opciones: ['Precio', 'pH, oxígeno disuelto, temperatura', 'Limpieza', 'Dureza'], respuesta: 1 },
        { texto: '¿Impacto ambiental?', opciones: ['Ganancia', 'Sostenibilidad importante', 'Costo', 'Técnica'], respuesta: 1 }
      ]
    },
    {
      id: 12,
      nombre: 'Turismo',
      facultad: 'FCE',
      facultadNombre: 'Facultad de Ciencias Empresariales',
      icon: 'fa-solid fa-plane',
      descripcion: 'Prepara profesionales en gestión de empresas turísticas y promoción de destinos turísticos.',
      duracion: '3 años',
      semestres: 6,
      modalidad: 'Presencial',
      puntaje: 79,
      campoLaboral: 'Hotelería, agencias de viaje, guía turístico, gestión de destinos',
      acreditacion: 'CONESUP (2023)',
      opciones: ['Gerente Hotelero', 'Agente de Viajes', 'Guía Turístico', 'Promotor'],
      pensum: [{ semestre: 1, materias: 5 }, { semestre: 2, materias: 5 }, { semestre: 3, materias: 5 }, { semestre: 4, materias: 5 }, { semestre: 5, materias: 5 }, { semestre: 6, materias: 4 }],
      temaClase: 'Introducción al Turismo',
      preguntas: [
        { texto: '¿Turismo?', opciones: ['Viaje', 'Viaje temporal por ocio o negocio', 'Hotel', 'Transporte'], respuesta: 1 },
        { texto: '¿Tipos turismo?', opciones: ['Solo sol y playa', 'Cultural, aventura, negocios', 'Aventura', 'Extremo'], respuesta: 1 },
        { texto: '¿Importancia turismo?', opciones: ['Dinero', 'Economía e intercambio cultural', 'Placer', 'Viajes'], respuesta: 1 }
      ]
    }
  ];

  filteredCarreras: Carrera[] = [];
  selectedCarrera: Carrera | null = null;
  activeFac = 'all';
  searchTerm = '';

  constructor() {}

  ngOnInit() {
    this.filterCarreras();
  }

  filterCarreras() {
    this.filteredCarreras = this.carreras.filter(carrera => {
      const matchFac = this.activeFac === 'all' || carrera.facultad === this.activeFac;
      const matchSearch = carrera.nombre.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                         carrera.descripcion.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchFac && matchSearch;
    });
  }

  setFac(fac: string) {
    this.activeFac = fac;
    this.filterCarreras();
  }

  openDetail(id: number) {
    this.selectedCarrera = this.carreras.find(c => c.id === id) || null;
  }

  closeDetail() {
    this.selectedCarrera = null;
  }
}