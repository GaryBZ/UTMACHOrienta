import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { catchError, forkJoin, of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { DetailCareersComponent } from './detail-careers/detail-careers.component';
import { Carrera } from '../../core/models/carrera.model';
import { Facultad } from '../../core/models/facultad.model';
import { CarreraService } from '../../core/services/carrera.service';
import { FacultadService } from '../../core/services/facultad.service';

@Component({
  selector: 'app-careers',
  templateUrl: './careers.component.html',
  styleUrls: ['./careers.component.scss'],
  imports: [FormsModule, CommonModule, DetailCareersComponent]
})
export class CareersComponent implements OnInit {
  carreras: Carrera[] = [];
  filteredCarreras: Carrera[] = [];
  selectedCarrera: Carrera | null = null;
  activeFac = 'all';
  searchTerm = '';
  private routeCarreraId: number | null = null;

  facultadesById = new Map<number, Facultad>();
  private facultadesByCodigo = new Map<string, Facultad>();

  constructor(
    private carreraService: CarreraService,
    private facultadService: FacultadService,
    private router: Router,
    private activeRoute: ActivatedRoute
  ) {}

  ngOnInit() {
    this.activeRoute.paramMap.subscribe((params) => {
      const rawId = params.get('id');
      this.routeCarreraId = rawId ? Number(rawId) : null;
      this.syncSelectionFromRoute();
    });
    this.loadInitialData();
  }

  filterCarreras() {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredCarreras = this.carreras.filter((carrera) => {
      if (term.length === 0) {
        return true;
      }
      return (
        (carrera.nombre || '').toLowerCase().includes(term) ||
        (carrera.descripcion || '').toLowerCase().includes(term)
      );
    });
  }

  setFac(fac: string) {
    this.activeFac = fac;
    this.loadCarrerasByFacultad();
  }

  openDetail(id: number) {
    this.router.navigate(['/carreras', id]);
  }

  closeDetail() {
    this.router.navigate(['/carreras']);
  }

  private loadInitialData() {
    forkJoin({
      facultades: this.facultadService.getAll().pipe(catchError(() => of([]))),
      carreras: this.carreraService.getAll().pipe(catchError(() => of([])))
    }).subscribe(({ facultades, carreras }) => {
      this.setFacultadMaps(facultades);
      this.carreras = carreras;
      this.filterCarreras();
      this.syncSelectionFromRoute();
    });
  }

  private loadCarrerasByFacultad() {
    if (this.activeFac === 'all') {
      this.loadCarreras();
      return;
    }

    const facultad = this.facultadesByCodigo.get(this.activeFac);
    if (!facultad) {
      this.carreras = [];
      this.filterCarreras();
      return;
    }

    this.carreraService.getByFacultad(facultad.id).subscribe((carreras) => {
      this.carreras = carreras;
      this.filterCarreras();
    });
  }

  private loadCarreras() {
    this.carreraService.getAll().subscribe((carreras) => {
      this.carreras = carreras;
      this.filterCarreras();
    });
  }

  private setFacultadMaps(facultades: Facultad[]) {
    this.facultadesById.clear();
    this.facultadesByCodigo.clear();
    facultades.forEach((facultad) => {
      this.facultadesById.set(facultad.id, facultad);
      this.facultadesByCodigo.set(facultad.codigo, facultad);
    });
  }

  private syncSelectionFromRoute() {
    if (!this.routeCarreraId) {
      this.selectedCarrera = null;
      this.scrollTop();
      return;
    }

    const found = this.carreras.find((carrera) => carrera.id === this.routeCarreraId) || null;
    if (found) {
      this.selectedCarrera = found;
      this.scrollTop();
      return;
    }

    this.carreraService.getById(this.routeCarreraId).subscribe((carrera) => {
      this.selectedCarrera = carrera || null;
      this.scrollTop();
    });
  }

  private scrollTop() {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
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
}