import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Clase {
  id: number;
  titulo: string;
  contenido: string;
  orden: number;
}

interface OpcionPregunta {
  id: string;
  texto: string;
  esCorrecta: boolean;
}

interface PreguntaExamen {
  id: string;
  enunciado: string;
  /** título de la clase de la que salió (null si se agregó a mano) */
  claseOrigenTitulo?: string | null;
  opciones: OpcionPregunta[];
}

@Component({
  selector: 'app-crear-examenes',
  imports: [CommonModule, FormsModule],
  templateUrl: './crear-examenes.component.html',
  styleUrls: ['./crear-examenes.component.scss'],
})
export class CrearExamenesComponent {
  /** Emite cuando se pide volver — conéctalo a tu propia navegación */
  @Output() volver = new EventEmitter<void>();
  /** Emite cuando se pide ir a gestionar clases (caso "sin clases") */
  @Output() irAClases = new EventEmitter<void>();
  /** Emite el examen final cuando se da "Guardar" — conéctalo a tu persistencia */
  @Output() guardado = new EventEmitter<PreguntaExamen[]>();

  // ── Datos de ejemplo (reemplaza por los reales cuando los tengas a mano) ──
  carrera = { id: 1, nombre: 'Administración de Empresas' };

  clases: Clase[] = [
    { id: 1, titulo: 'Prueba', contenido: 'A ver q', orden: 1 },
    { id: 2, titulo: 'A ver aver 2', contenido: 'asdasd', orden: 2 },
  ];

  selectedClaseIds = new Set<number>(this.clases.map((c) => c.id));
  preguntas: PreguntaExamen[] = [];

  isGenerating = false;
  isSaving = false;
  saveSuccess = false;
  errorMessage = '';

  get clasesSeleccionadas(): Clase[] {
    return this.clases.filter((c) => this.selectedClaseIds.has(c.id));
  }

  isClaseSelected(clase: Clase): boolean {
    return this.selectedClaseIds.has(clase.id);
  }

  toggleClase(clase: Clase): void {
    if (this.selectedClaseIds.has(clase.id)) this.selectedClaseIds.delete(clase.id);
    else this.selectedClaseIds.add(clase.id);
  }

  goBack(): void {
    this.volver.emit();
  }

  goToClases(): void {
    this.irAClases.emit();
  }

  /**
   * Simula a la IA generando preguntas a partir de las clases seleccionadas.
   * Reemplaza el `setTimeout` + `crearPreguntaMock` por tu llamada real
   * cuando la tengas; el resto del componente no necesita cambios.
   */
  generarConIA(): void {
    if (this.clasesSeleccionadas.length === 0 || this.isGenerating) return;

    this.isGenerating = true;
    this.errorMessage = '';
    this.saveSuccess = false;

    setTimeout(() => {
      const nuevas = this.clasesSeleccionadas.map((clase, i) => this.crearPreguntaMock(clase, i));
      this.preguntas = [...this.preguntas, ...nuevas];
      this.isGenerating = false;
    }, 1600);
  }

  private crearPreguntaMock(clase: Clase, index: number): PreguntaExamen {
    const contenido = (clase.contenido || '').trim();
    const resumen = contenido
      ? contenido.length > 60
        ? `${contenido.slice(0, 60)}...`
        : contenido
      : 'el tema principal de la clase';

    return {
      id: `ai-${clase.id}-${Date.now()}-${index}`,
      enunciado: `Según la clase "${clase.titulo}", ¿cuál de las siguientes opciones describe mejor el concepto principal abordado?`,
      claseOrigenTitulo: clase.titulo,
      opciones: [
        { id: this.uid(), texto: `Lo explicado en "${clase.titulo}": ${resumen}`, esCorrecta: true },
        { id: this.uid(), texto: 'Un concepto no relacionado con el contenido visto en clase', esCorrecta: false },
        { id: this.uid(), texto: 'Una definición parcialmente correcta pero incompleta', esCorrecta: false },
        { id: this.uid(), texto: 'Lo contrario a lo explicado en la clase', esCorrecta: false },
      ],
    };
  }

  agregarPreguntaManual(): void {
    this.preguntas = [
      ...this.preguntas,
      {
        id: this.uid(),
        enunciado: '',
        claseOrigenTitulo: null,
        opciones: [
          { id: this.uid(), texto: '', esCorrecta: true },
          { id: this.uid(), texto: '', esCorrecta: false },
          { id: this.uid(), texto: '', esCorrecta: false },
          { id: this.uid(), texto: '', esCorrecta: false },
        ],
      },
    ];
  }

  eliminarPregunta(pregunta: PreguntaExamen): void {
    this.preguntas = this.preguntas.filter((p) => p.id !== pregunta.id);
  }

  moverPregunta(pregunta: PreguntaExamen, direccion: -1 | 1): void {
    const index = this.preguntas.indexOf(pregunta);
    const nuevoIndex = index + direccion;
    if (nuevoIndex < 0 || nuevoIndex >= this.preguntas.length) return;

    const copia = [...this.preguntas];
    [copia[index], copia[nuevoIndex]] = [copia[nuevoIndex], copia[index]];
    this.preguntas = copia;
  }

  esPrimera(pregunta: PreguntaExamen): boolean {
    return this.preguntas.indexOf(pregunta) === 0;
  }

  esUltima(pregunta: PreguntaExamen): boolean {
    return this.preguntas.indexOf(pregunta) === this.preguntas.length - 1;
  }

  marcarCorrecta(pregunta: PreguntaExamen, opcion: OpcionPregunta): void {
    pregunta.opciones.forEach((o) => (o.esCorrecta = o.id === opcion.id));
  }

  agregarOpcion(pregunta: PreguntaExamen): void {
    if (pregunta.opciones.length >= 6) return;
    pregunta.opciones.push({ id: this.uid(), texto: '', esCorrecta: false });
  }

  eliminarOpcion(pregunta: PreguntaExamen, opcion: OpcionPregunta): void {
    if (pregunta.opciones.length <= 2) return;
    pregunta.opciones = pregunta.opciones.filter((o) => o.id !== opcion.id);
    if (!pregunta.opciones.some((o) => o.esCorrecta)) pregunta.opciones[0].esCorrecta = true;
  }

  guardar(): void {
    if (this.preguntas.length === 0 || this.isSaving) return;

    this.isSaving = true;
    this.saveSuccess = false;

    setTimeout(() => {
      this.isSaving = false;
      this.saveSuccess = true;
      this.guardado.emit(this.preguntas);
    }, 700);
  }

  private uid(): string {
    return Math.random().toString(36).slice(2, 10);
  }
}