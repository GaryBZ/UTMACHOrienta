import { Component, OnInit } from '@angular/core';
import { Facultad } from '../../../../core/models/facultad.model';
import { Carrera } from '../../../../core/models/carrera.model';
import { CarreraService } from '../../../../core/services/carrera.service';
import { FacultadService } from '../../../../core/services/facultad.service';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-crear-carreras',
  templateUrl: './crear-carreras.component.html',
  styleUrls: ['./crear-carreras.component.scss'],
  imports: [CommonModule, FormsModule]
})
export class CrearCarrerasComponent  implements OnInit {
facultades: Facultad[] = [];
  isSubmitting = false;
  errorMessage = '';
  newTag = '';
  touched = new Set<string>();

  form: Omit<Carrera, 'id'> = {
    id_facultad: null as any,
    nombre: '',
    descripcion: '',
    duracion_anios: null,
    creditos: null,
    modalidad: null,
    puntaje_minimo: null,
    campo_laboral: null,
    etiquetas: [],
    activa: true,
    link_malla: null
  };

  errors: Record<string, string> = {};

  constructor(
    private carreraService: CarreraService,
    private facultadService: FacultadService,
    private router: Router
  ) {}

  ngOnInit() {
    this.facultadService.getAll().pipe(catchError(() => of([]))).subscribe(data => {
      this.facultades = data;
    });
  }

  touch(field: string) {
    this.touched.add(field);
    this.validate();
  }

  fieldState(field: string): string {
    if (!this.touched.has(field)) return '';
    return this.errors[field] ? 'error' : '';
  }

  getFacultadSeleccionada(): Facultad | undefined {
    return this.facultades.find(f => f.id === this.form.id_facultad);
  }

  addTag() {
    const tag = this.newTag.trim();
    if (!tag) return;
    if (!this.form.etiquetas) this.form.etiquetas = [];
    if (!this.form.etiquetas.includes(tag)) {
      this.form.etiquetas = [...this.form.etiquetas, tag];
    }
    this.newTag = '';
  }

  removeTag(tag: string) {
    this.form.etiquetas = (this.form.etiquetas || []).filter(t => t !== tag);
  }

  goBack() {
    this.router.navigate(['/admin/carreras']);
  }

  submitForm() {
    this.touched.add('nombre');
    this.touched.add('id_facultad');
    if (!this.validate()) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    this.carreraService.create(this.form as any).pipe(
      catchError(err => {
        this.errorMessage = err?.error?.message || 'No se pudo crear la carrera';
        this.isSubmitting = false;
        return of(null);
      })
    ).subscribe(result => {
      if (!result) return;
      this.router.navigate(['/admin/carreras']);
    });
  }

  private validate(): boolean {
    this.errors = {};
    if (!this.form.nombre.trim()) this.errors['nombre'] = 'El nombre es requerido';
    if (!this.form.id_facultad)   this.errors['id_facultad'] = 'Selecciona una facultad';
    return Object.keys(this.errors).length === 0;
  }
}