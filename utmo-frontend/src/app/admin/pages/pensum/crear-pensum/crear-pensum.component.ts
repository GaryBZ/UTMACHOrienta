import { Component, OnInit } from '@angular/core';
import { Carrera } from '../../../../core/models/carrera.model';
import { ActivatedRoute, Router } from '@angular/router';
import { CarreraService } from '../../../../core/services/carrera.service';
import { PensumService } from '../../../../core/services/pensum.service';
import { catchError, forkJoin, of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface SemestreItem {
  semestre: number;
  nombre_materia: string;
}


@Component({
  selector: 'app-crear-pensum',
  templateUrl: './crear-pensum.component.html',
  styleUrls: ['./crear-pensum.component.scss'],
  imports: [CommonModule, FormsModule]
})
export class CrearPensumComponent  implements OnInit {
  carrera: Carrera | null = null;
  semestres: SemestreItem[] = [];
  isLoading = true;
  isSaving = false;
  saveSuccess = false;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private carreraService: CarreraService,
    private pensumService: PensumService,
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    forkJoin({
      carrera: this.carreraService.getById(id).pipe(catchError(() => of(null))),
      pensum: this.pensumService
        .getByCarrera(id)
        .pipe(catchError(() => of([]))),
    }).subscribe(({ carrera, pensum }) => {
      this.carrera = carrera;
      this.isLoading = false;

      if (!carrera) return;

      const totalSemestres = this.getSemestres();

      // Generar array con todos los semestres
      this.semestres = Array.from({ length: totalSemestres }, (_, i) => {
        const semNum = i + 1;
        const existente = pensum.find((p) => p.semestre === semNum);
        return {
          semestre: semNum,
          nombre_materia: existente?.nombre_materia ?? '',
        };
      });
    });
  }

  getSemestres(): number {
    return this.carrera?.duracion_anios ? this.carrera.duracion_anios * 2 : 0;
  }

  guardar() {
    if (!this.carrera) return;
    this.isSaving = true;
    this.errorMessage = '';
    this.saveSuccess = false;

    const materias = this.semestres
      .filter((s) => s.nombre_materia.trim())
      .map((s) => ({
        semestre: s.semestre,
        nombre_materia: s.nombre_materia.trim(),
      }));

    this.pensumService
      .upsertByCarrera(this.carrera.id, materias)
      .pipe(
        catchError((err) => {
          this.errorMessage =
            err?.error?.message || 'No se pudo guardar el pensum';
          this.isSaving = false;
          return of([]);
        }),
      )
      .subscribe((result) => {
        if (this.errorMessage) return;
        this.isSaving = false;
        this.saveSuccess = true;
        setTimeout(() => (this.saveSuccess = false), 3000);
      });
  }

  goBack() {
    this.router.navigate(['/admin/pensum']);
  }
}
