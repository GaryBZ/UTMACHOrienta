import { Component, OnInit } from '@angular/core';
import { Carrera } from '../../../../core/models/carrera.model';
import { ActivatedRoute, Router } from '@angular/router';
import { CarreraService } from '../../../../core/services/carrera.service';
import { ClaseService } from '../../../../core/services/clase.service';
import { catchError, forkJoin, of } from 'rxjs';
import { Clases } from '../../../../core/models/clases.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Facultad } from '../../../../core/models/facultad.model';
import { FacultadService } from '../../../../core/services/facultad.service';
@Component({
  selector: 'app-listar-clases',
  templateUrl: './listar-clases.component.html',
  styleUrls: ['./listar-clases.component.scss'],
    imports: [CommonModule, FormsModule],
})
export class ListarClasesComponent implements OnInit {
carreras: Carrera[] = [];
  filteredCarreras: Carrera[] = [];
  facultades: Facultad[] = [];
  searchTerm = '';
  filterFac: number | null = null;
  isLoading = true;

  private facultadesById = new Map<number, Facultad>();
  private claseCount = new Map<number, number>();

  constructor(
    private carreraService: CarreraService,
    private facultadService: FacultadService,
    private claseService: ClaseService,
    private router: Router
  ) {}

  ngOnInit() {
    forkJoin({
      carreras:   this.carreraService.getAll().pipe(catchError(() => of([]))),
      facultades: this.facultadService.getAll().pipe(catchError(() => of([]))),
      clases:     this.claseService.getAll().pipe(catchError(() => of([])))
    }).subscribe(({ carreras, facultades, clases }) => {
      this.facultades = facultades;
      facultades.forEach(f => this.facultadesById.set(f.id, f));

      clases.forEach(c => {
        this.claseCount.set(c.id_carrera, (this.claseCount.get(c.id_carrera) ?? 0) + 1);
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

  getClaseCount(id_carrera: number): number {
    return this.claseCount.get(id_carrera) ?? 0;
  }

  getClaseStatus(id_carrera: number): string {
    const count = this.getClaseCount(id_carrera);
    if (count === 0) return 'empty';
    if (count < 3)   return 'partial';
    return 'complete';
  }

  getClaseStatusLabel(id_carrera: number): string {
    const status = this.getClaseStatus(id_carrera);
    if (status === 'complete') return 'Completo';
    if (status === 'partial')  return 'Pocas clases';
    return 'Sin clases';
  }

  gestionar(id: number) {
    this.router.navigate(['/admin/clases', id]);
  }
}