import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Carrera } from '../../../core/models/carrera.model';
import { Facultad } from '../../../core/models/facultad.model';

@Component({
  selector: 'app-detail-careers',
  templateUrl: './detail-careers.component.html',
  styleUrls: ['./detail-careers.component.scss'],
  imports: [CommonModule]
})
export class DetailCareersComponent {
  private _carrera: Carrera | null = null;
  @Input() facultadesById = new Map<number, Facultad>();

  @Input() set carrera(value: Carrera | null) {
    this._carrera = value;
    this.resetDetailState();
  }
  get carrera(): Carrera | null {
    return this._carrera;
  }

  @Output() closed = new EventEmitter<void>();

  closeDetail() {
    this.closed.emit();
  }

  getFacultadCode(carrera: Carrera): string {
    return this.facultadesById.get(carrera.id_facultad)?.codigo || 'GEN';
  }

  getFacultadNombre(carrera: Carrera): string {
    return this.facultadesById.get(carrera.id_facultad)?.nombre_completo || 'Facultad';
  }

  getFacultadIcon(carrera: Carrera): string {
    return this.facultadesById.get(carrera.id_facultad)?.icono || 'fa-solid fa-graduation-cap';
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
}
