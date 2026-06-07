import { Component, OnInit } from '@angular/core';
import { Carrera } from '../../../../core/models/carrera.model';
import { Router } from '@angular/router';
import { CarreraService } from '../../../../core/services/carrera.service';
import { PensumService } from '../../../../core/services/pensum.service';
import { catchError, forkJoin, of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FacultadService } from '../../../../core/services/facultad.service';
import { Facultad } from '../../../../core/models/facultad.model';
import { Pensum } from '../../../../core/models/pensum.model';

@Component({
  selector: 'app-listar-pensum',
  templateUrl: './listar-pensum.component.html',
  styleUrls: ['./listar-pensum.component.scss'],
  imports: [CommonModule, FormsModule]
})
export class ListarPensumComponent implements OnInit {
  carreras: Carrera[] = [];
  filteredCarreras: Carrera[] = [];
  facultades: Facultad[] = [];
  pensums: Pensum[] = [];
  searchTerm = '';
  filterFac: number | null = null;
  isLoading = true;

  private facultadesById = new Map<number, Facultad>();
  // Map de id_carrera -> cantidad de materias cargadas
  private pensumCount = new Map<number, number>();

  constructor(
    private carreraService: CarreraService,
    private facultadService: FacultadService,
    private pensumService: PensumService,
    private router: Router
  ) {}

  ngOnInit() {
    forkJoin({
      carreras:  this.carreraService.getAll().pipe(catchError(() => of([]))),
      facultades: this.facultadService.getAll().pipe(catchError(() => of([]))),
      pensums:   this.pensumService.getAll().pipe(catchError(() => of([])))
    }).subscribe(({ carreras, facultades, pensums }) => {
      this.facultades = facultades;
      facultades.forEach(f => this.facultadesById.set(f.id, f));

      // Contar materias por carrera
      pensums.forEach(p => {
        this.pensumCount.set(p.id_carrera, (this.pensumCount.get(p.id_carrera) ?? 0) + 1);
      });

      this.carreras = carreras;
      this.filteredCarreras = carreras;
      this.isLoading = false;
    });
  }

  filterCarreras() {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredCarreras = this.carreras.filter(c => {
      const matchSearch = !term || c.nombre.toLowerCase().includes(term);
      const matchFac = this.filterFac === null || c.id_facultad === this.filterFac;
      return matchSearch && matchFac;
    });
  }

  setFac(id: number | null) {
    this.filterFac = id;
    this.filterCarreras();
  }

  getFacultadCode(id: number): string {
    return this.facultadesById.get(id)?.codigo || 'GEN';
  }

  getPensumCount(id_carrera: number): number {
    return this.pensumCount.get(id_carrera) ?? 0;
  }

  getPensumStatus(carrera: Carrera): string {
    const total = carrera.duracion_anios ? carrera.duracion_anios * 2 : 0;
    const count = this.getPensumCount(carrera.id);
    if (count === 0)           return 'empty';
    if (count >= total)        return 'complete';
    return 'partial';
  }

  getPensumStatusLabel(carrera: Carrera): string {
    const status = this.getPensumStatus(carrera);
    if (status === 'complete') return 'Completo';
    if (status === 'partial')  return 'Incompleto';
    return 'Sin pensum';
  }

  gestionar(id: number) {
    this.router.navigate(['/admin/pensum', id]);
  }
}