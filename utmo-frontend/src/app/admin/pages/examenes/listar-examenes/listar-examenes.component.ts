import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Carrera } from '../../../../core/models/carrera.model';
import { Router } from '@angular/router';
import { CarreraService } from '../../../../core/services/carrera.service';
import { catchError, forkJoin, of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { Facultad } from '../../../../core/models/facultad.model';
import { FacultadService } from '../../../../core/services/facultad.service';
import { ExamenService } from '../../../../core/services/examen.service';

@Component({
  selector: 'app-listar-examenes',
  templateUrl: './listar-examenes.component.html',
  styleUrls: ['./listar-examenes.component.scss'],
  imports: [CommonModule, FormsModule],
})
export class ListarExamenesComponent  implements OnInit {
carreras: Carrera[] = [];
  filteredCarreras: Carrera[] = [];
  facultades: Facultad[] = [];
  searchTerm = '';
  filterFac: number | null = null;
  isLoading = true;

  private facultadesById = new Map<number, Facultad>();
  private examenCount = new Map<number, number>();

  constructor(
    private carreraService: CarreraService,
    private facultadService: FacultadService,
    private examenService: ExamenService,
    private router: Router
  ) {}

  ngOnInit() {
    forkJoin({
      carreras:   this.carreraService.getAll().pipe(catchError(() => of([]))),
      facultades: this.facultadService.getAll().pipe(catchError(() => of([]))),
      examenes:   this.examenService.getAll().pipe(catchError(() => of([])))
    }).subscribe(({ carreras, facultades, examenes }) => {
      this.facultades = facultades;
      facultades.forEach(f => this.facultadesById.set(f.id, f));

      examenes.forEach(e => {
        this.examenCount.set(e.id_carrera, (this.examenCount.get(e.id_carrera) ?? 0) + 1);
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

  getExamenCount(id_carrera: number): number {
    return this.examenCount.get(id_carrera) ?? 0;
  }

  getExamenStatus(id_carrera: number): string {
    const count = this.getExamenCount(id_carrera);
    if (count === 0)  return 'empty';
    if (count < 5)    return 'partial';
    return 'complete';
  }

  getExamenStatusLabel(id_carrera: number): string {
    const status = this.getExamenStatus(id_carrera);
    if (status === 'complete') return 'Completo';
    if (status === 'partial')  return 'Pocas preguntas';
    return 'Sin examen';
  }

  gestionar(id: number) {
    this.router.navigate(['/admin/examenes', id]);
  }
}