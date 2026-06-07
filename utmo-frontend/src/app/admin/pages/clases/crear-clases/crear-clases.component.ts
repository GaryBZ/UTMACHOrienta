import { Component, OnInit } from '@angular/core';
import { Carrera } from '../../../../core/models/carrera.model';
import { ActivatedRoute, Router } from '@angular/router';
import { CarreraService } from '../../../../core/services/carrera.service';
import { ClaseService } from '../../../../core/services/clase.service';
import { catchError, forkJoin, of } from 'rxjs';
import { Clases } from '../../../../core/models/clases.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ClaseItem extends Partial<Clases> {
  _dirty?: boolean;
  _saving?: boolean;
  _tempId?: string;
}

@Component({
  selector: 'app-crear-clases',
  templateUrl: './crear-clases.component.html',
  styleUrls: ['./crear-clases.component.scss'],
  imports: [CommonModule, FormsModule],
})
export class CrearClasesComponent  implements OnInit {
carrera: Carrera | null = null;
  clases: ClaseItem[] = [];
  isLoading = true;
  isDeleting = false;
  saveSuccess = false;
  errorMessage = '';
  claseToDelete: ClaseItem | null = null;
  private claseToDeleteIndex: number = -1;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private carreraService: CarreraService,
    private claseService: ClaseService
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    forkJoin({
      carrera: this.carreraService.getById(id).pipe(catchError(() => of(null))),
      clases:  this.claseService.getByCarrera(id).pipe(catchError(() => of([])))
    }).subscribe(({ carrera, clases }) => {
      this.carrera = carrera;
      this.clases = clases.map(c => ({ ...c, _dirty: false, _saving: false }));
      this.isLoading = false;
    });
  }

  agregarClase() {
    const orden = this.clases.length + 1;
    this.clases.push({
      id_carrera: this.carrera?.id,
      titulo: '',
      contenido: '',
      orden,
      _dirty: true,
      _saving: false,
      _tempId: `temp_${Date.now()}`
    });
  }

  moverArriba(i: number) {
    if (i === 0) return;
    [this.clases[i - 1], this.clases[i]] = [this.clases[i], this.clases[i - 1]];
    this.recalcularOrden();
  }

  moverAbajo(i: number) {
    if (i === this.clases.length - 1) return;
    [this.clases[i + 1], this.clases[i]] = [this.clases[i], this.clases[i + 1]];
    this.recalcularOrden();
  }

  guardarClase(clase: ClaseItem, i: number) {
    if (!clase.titulo?.trim() || !clase.contenido?.trim()) {
      this.errorMessage = 'El título y contenido son requeridos';
      setTimeout(() => this.errorMessage = '', 3000);
      return;
    }

    clase._saving = true;
    this.errorMessage = '';

    const payload = {
      id_carrera: this.carrera!.id,
      titulo: clase.titulo.trim(),
      contenido: clase.contenido.trim(),
      orden: clase.orden ?? i + 1
    };

    if (clase.id) {
      // Actualizar
      this.claseService.update(clase.id, payload).pipe(
        catchError(err => {
          this.errorMessage = err?.error?.message || 'Error al actualizar';
          clase._saving = false;
          return of(null);
        })
      ).subscribe(result => {
        if (!result) return;
        clase._dirty = false;
        clase._saving = false;
        this.showSuccess();
      });
    } else {
      // Crear
      this.claseService.create(payload).pipe(
        catchError(err => {
          this.errorMessage = err?.error?.message || 'Error al crear';
          clase._saving = false;
          return of(null);
        })
      ).subscribe(result => {
        if (!result) return;
        clase.id = result.id;
        clase._tempId = undefined;
        clase._dirty = false;
        clase._saving = false;
        this.showSuccess();
      });
    }
  }

  confirmarEliminar(clase: ClaseItem, i: number) {
    this.claseToDelete = clase;
    this.claseToDeleteIndex = i;
  }

  cancelarEliminar() {
    this.claseToDelete = null;
    this.claseToDeleteIndex = -1;
  }

  eliminarClase() {
    if (!this.claseToDelete) return;

    // Si es nueva (sin id), solo quitar del array
    if (!this.claseToDelete.id) {
      this.clases.splice(this.claseToDeleteIndex, 1);
      this.recalcularOrden();
      this.cancelarEliminar();
      return;
    }

    this.isDeleting = true;
    this.claseService.remove(this.claseToDelete.id).pipe(
      catchError(err => {
        this.errorMessage = err?.error?.message || 'Error al eliminar';
        this.isDeleting = false;
        return of(null);
      })
    ).subscribe(result => {
      if (this.errorMessage) return;
      this.clases.splice(this.claseToDeleteIndex, 1);
      this.recalcularOrden();
      this.isDeleting = false;
      this.cancelarEliminar();
    });
  }

  goBack() {
    this.router.navigate(['/admin/clases']);
  }

  private recalcularOrden() {
    this.clases.forEach((c, i) => {
      c.orden = i + 1;
      c._dirty = true;
    });
  }

  private showSuccess() {
    this.saveSuccess = true;
    setTimeout(() => this.saveSuccess = false, 3000);
  }
}