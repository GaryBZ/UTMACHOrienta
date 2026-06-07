import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Carrera } from '../../../../core/models/carrera.model';
import { Facultad } from '../../../../core/models/facultad.model';
import { CarreraService } from '../../../../core/services/carrera.service';
import { FacultadService } from '../../../../core/services/facultad.service';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-listar-carreras',
  templateUrl: './listar-carreras.component.html',
  styleUrls: ['./listar-carreras.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class ListarCarrerasComponent  implements OnInit {
  carreras: Carrera[] = [];
  filteredCarreras: Carrera[] = [];
  searchTerm = '';
  filterActiva: boolean | null = null;
  isLoading = true;
  isDeleting = false;
  carreraToDelete: Carrera | null = null;

  private facultadesById = new Map<number, Facultad>();

  constructor(
    private carreraService: CarreraService,
    private facultadService: FacultadService,
    private router: Router
  ) {}

  ngOnInit() {
    this.facultadService.getAll().pipe(catchError(() => of([]))).subscribe(facs => {
      facs.forEach(f => this.facultadesById.set(f.id, f));
    });

    this.carreraService.getAll().pipe(catchError(() => of([]))).subscribe(data => {
      this.carreras = data;
      this.filteredCarreras = data;
      this.isLoading = false;
    });
  }

  filterCarreras() {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredCarreras = this.carreras.filter(c => {
      const matchSearch = !term ||
        c.nombre.toLowerCase().includes(term) ||
        (c.descripcion || '').toLowerCase().includes(term);
      const matchActiva = this.filterActiva === null || c.activa === this.filterActiva;
      return matchSearch && matchActiva;
    });
  }

  setFilter(value: boolean | null) {
    this.filterActiva = value;
    this.filterCarreras();
  }

  getFacultadCode(id_facultad: number): string {
    return this.facultadesById.get(id_facultad)?.codigo || 'GEN';
  }

  goToCreate() {
    this.router.navigate(['/admin/crear-carrera']);
  }

  goToEdit(id: number) {
    this.router.navigate(['/admin/carreras/editar', id]);
  }

  toggleActiva(carrera: Carrera) {
    const updated = { ...carrera, activa: !carrera.activa };
    this.carreraService.update(carrera.id, updated).subscribe(() => {
      carrera.activa = !carrera.activa;
    });
  }

  confirmDelete(carrera: Carrera) {
    this.carreraToDelete = carrera;
  }

  cancelDelete() {
    this.carreraToDelete = null;
  }

  deleteCarrera() {
    if (!this.carreraToDelete) return;
    this.isDeleting = true;
    this.carreraService.remove(this.carreraToDelete.id).subscribe(() => {
      this.carreras = this.carreras.filter(c => c.id !== this.carreraToDelete!.id);
      this.filterCarreras();
      this.carreraToDelete = null;
      this.isDeleting = false;
    });
  }
}