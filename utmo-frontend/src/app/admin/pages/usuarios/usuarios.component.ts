import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, map, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol_nombre: string;
  ciudad: string | null;
  colegio: string | null;
  activo: boolean;
  fecha_registro: string;
}

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class UsuariosComponent  implements OnInit {
usuarios: Usuario[] = [];
  filteredUsuarios: Usuario[] = [];
  roles: string[] = [];
  searchTerm = '';
  filterRol: string | null = null;
  filterActivo: boolean | null = null;
  isLoading = true;

  private readonly baseUrl = `${environment.apiUrl}/usuarios`;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<{ ok: boolean; data: Usuario[] }>(this.baseUrl).pipe(
      map(r => r.data),
      catchError(() => of([]))
    ).subscribe(data => {
      this.usuarios = data;
      this.filteredUsuarios = data;
      this.roles = [...new Set(data.map(u => u.rol_nombre.toLowerCase()))];
      this.isLoading = false;
    });
  }

  filterUsuarios() {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredUsuarios = this.usuarios.filter(u => {
      const matchSearch = !term ||
        u.nombre.toLowerCase().includes(term) ||
        u.apellido.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term);
      const matchRol    = !this.filterRol    || u.rol_nombre.toLowerCase() === this.filterRol;
      const matchActivo = this.filterActivo === null || u.activo === this.filterActivo;
      return matchSearch && matchRol && matchActivo;
    });
  }

  setRol(rol: string | null)       { this.filterRol = rol;    this.filterUsuarios(); }
  setActivo(val: boolean | null)   { this.filterActivo = val; this.filterUsuarios(); }

  getInitials(u: Usuario): string {
    return `${u.nombre[0]}${u.apellido[0]}`.toUpperCase();
  }

  toggleActivo(usuario: Usuario) {
    const nuevoEstado = !usuario.activo;
    this.http.patch<{ ok: boolean }>(`${this.baseUrl}/${usuario.id}/activo`, { activo: nuevoEstado }).pipe(
      catchError(() => of(null))
    ).subscribe(result => {
      if (!result) return;
      usuario.activo = nuevoEstado;
    });
  }
}