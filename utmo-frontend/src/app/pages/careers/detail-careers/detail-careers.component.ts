import { Clases } from './../../../core/models/clases.model';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Carrera } from '../../../core/models/carrera.model';
import { Facultad } from '../../../core/models/facultad.model';
import { FormsModule } from '@angular/forms';
import { Pensum } from '../../../core/models/pensum.model';
import { HistorialService } from '../../../core/services/historial.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-detail-careers',
  templateUrl: './detail-careers.component.html',
  styleUrls: ['./detail-careers.component.scss'],
  imports: [CommonModule, FormsModule],
})
export class DetailCareersComponent {
  activeTab = 'descripcion';
  respuestas: Record<string, string> = {};
  checked = false;
  resultado = { pass: false, correctas: 0, total: 0, pct: 0 };

  private _carrera: Carrera | null = null;
  private _tabsVistos = new Set<string>(['descripcion']);  @Input() facultadesById = new Map<number, Facultad>();
  @Input() pensums: Pensum[] = [];
  @Input() clases: Clases[] = [];

  @Input() set carrera(value: Carrera | null) {
    const anteriorId = this._carrera?.id;

    // Guardar tabs de la carrera anterior antes de cambiar
    if (this._carrera && anteriorId && this.authService.isLoggedIn() && this._tabsVistos.size > 0) {
      this.historialService
        .actualizarTabs(this._carrera.id, Array.from(this._tabsVistos))
        .subscribe();
    }

    this._carrera = value;
    this._tabsVistos = new Set<string>(['descripcion']);
    this.resetDetailState();

    if (value && value.id !== anteriorId && this.authService.isLoggedIn()) {
      this.historialService.registrarVisita(value.id).subscribe({
        next: (r) => console.log('Historial ok:', r),
        error: (e) => console.error('Historial error:', e),
      });
    }
  }

  get carrera(): Carrera | null {
    return this._carrera;
  }

  @Output() closed = new EventEmitter<void>();

  constructor(
    private historialService: HistorialService,
    private authService: AuthService,
  ) {}

  setTab(tab: string) {
    this.activeTab = tab;
    this._tabsVistos.add(tab);
  }

  seleccionar(id: string, opt: string) {
    if (!this.checked) this.respuestas[id] = opt;
  }

  resetExamen() {
    this.respuestas = {};
    this.checked = false;
  }

  closeDetail() {
    if (this._carrera && this.authService.isLoggedIn()) {
      this.historialService
        .actualizarTabs(this._carrera.id, Array.from(this._tabsVistos))
        .subscribe();
    }
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
      .filter((p) => p.id_carrera === carrera.id)
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
      .filter((c) => c.id_carrera === carrera.id)
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
