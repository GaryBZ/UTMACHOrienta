import { Component, OnInit } from '@angular/core';
import { AuthUser } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss'],
  imports: [CommonModule, FormsModule, RouterLink]
})
export class PerfilComponent  implements OnInit {
usuario!: AuthUser;
  editing = false;
  isSaving = false;
  saveSuccess = false;
  saveError = '';

  form = { nombre: '', apellido: '', ciudad: '', colegio: '' };
  stats = { carreras: 0, examenes: 0 };
  historial: any[] = [];

  ngOnInit() {
    const raw = localStorage.getItem('utmo_user');
    if (raw) this.usuario = JSON.parse(raw);
    this.form = {
      nombre:   this.usuario.nombre,
      apellido: this.usuario.apellido,
      ciudad:   this.usuario.ciudad   ?? '',
      colegio:  this.usuario.colegio  ?? ''
    };
  }

  getInitials(): string {
    return `${this.usuario.nombre[0]}${this.usuario.apellido[0]}`.toUpperCase();
  }

  startEdit()  { this.editing = true; this.saveSuccess = false; this.saveError = ''; }
  cancelEdit() { this.editing = false; this.form = { nombre: this.usuario.nombre, apellido: this.usuario.apellido, ciudad: this.usuario.ciudad ?? '', colegio: this.usuario.colegio ?? '' }; }

  saveChanges() {
    // aquí llamarás a tu UsuarioService.update() cuando lo tengas
    this.usuario = { ...this.usuario, ...this.form };
    localStorage.setItem('utmo_user', JSON.stringify(this.usuario));
    this.editing = false;
    this.saveSuccess = true;
    setTimeout(() => this.saveSuccess = false, 3000);
  }
}