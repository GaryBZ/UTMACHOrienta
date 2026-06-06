import { Clases } from './../../../core/models/clases.model';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Carrera } from '../../../core/models/carrera.model';
import { Facultad } from '../../../core/models/facultad.model';
import { FormsModule } from '@angular/forms';
import { Pensum } from '../../../core/models/pensum.model';

@Component({
  selector: 'app-detail-careers',
  templateUrl: './detail-careers.component.html',
  styleUrls: ['./detail-careers.component.scss'],
  imports: [CommonModule, FormsModule ],
})
export class DetailCareersComponent {
  activeTab = 'descripcion';
  respuestas: Record<string, string> = {};
  checked = false;
  resultado = { pass: false, correctas: 0, total: 0, pct: 0 };

  private _carrera: Carrera | null = null;
  @Input() facultadesById = new Map<number, Facultad>();
  @Input() pensums: Pensum[] = [];
  @Input() clases: Clases[] = [];

  @Input() set carrera(value: Carrera | null) {
    this._carrera = value;
    this.resetDetailState();
  }
  get carrera(): Carrera | null {
    return this._carrera;
  }

  @Output() closed = new EventEmitter<void>();

  setTab(tab: string) {
    this.activeTab = tab;
  }

  seleccionar(id: string, opt: string) {
    if (!this.checked) this.respuestas[id] = opt;
  }

  resetExamen() {
    this.respuestas = {};
    this.checked = false;
  }
  closeDetail() {
    this.closed.emit();
  }

  getFacultadCode(carrera: Carrera): string {
    return this.facultadesById.get(carrera.id_facultad)?.codigo || 'GEN';
  }

  getFacultadNombre(carrera: Carrera): string {
    return (
      this.facultadesById.get(carrera.id_facultad)?.nombre_completo ||
      'Facultad'
    );
  }

  getFacultadIcon(carrera: Carrera): string {
    return (
      this.facultadesById.get(carrera.id_facultad)?.icono ||
      'fa-solid fa-graduation-cap'
    );
  }

  // Método que filtra por carrera
  getPensum(carrera: Carrera): Pensum[] {
    return this.pensums
      .filter(p => p.id_carrera === carrera.id)
      .sort((a, b) => a.semestre - b.semestre);
  }
  
  getDuracionText(carrera: Carrera): string {
    return carrera.duracion_anios ? `${carrera.duracion_anios} años` : '';
  }

  getSemestres(carrera: Carrera): number {
    return carrera.duracion_anios ? carrera.duracion_anios * 2 : 0;
  }

  getModalidad(carrera: Carrera): string {
    return carrera.modalidad || '';
  }

  getPuntaje(carrera: Carrera): number {
    return carrera.puntaje_minimo || 0;
  }

  getEtiquetas(carrera: Carrera): string[] {
    return Array.isArray(carrera.etiquetas) ? carrera.etiquetas : [];
  }

  private resetDetailState() {}

  getClases(carrera: Carrera): Clases[] {
    return this.clases
      .filter(c => c.id_carrera === carrera.id)
      .sort((a, b) => a.orden - b.orden);
  }

  descargarMalla(carrera: Carrera): void {
  if (!carrera.link_malla) return;

  const link = document.createElement('a');
  link.href = carrera.link_malla;
  link.target = '_blank';
  link.download = `malla-${carrera.nombre.toLowerCase().replace(/\s+/g, '-')}.pdf`;
  link.click();
}
}
