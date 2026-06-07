import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

type ApiResponse<T> = { ok: boolean; data: T } | T;

export interface AuthUser {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  id_rol: number;
  rol_nombre: string;
  colegio: string | null;
  ciudad: string | null;
  activo: boolean;
  fecha_registro: string;
  token: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  colegio?: string;
  ciudad?: string;
  rol_nombre?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  login(payload: LoginPayload) {
    return this.http.post<ApiResponse<AuthUser>>(`${this.baseUrl}/login`, payload).pipe(
      map((response) => this.unwrapResponse(response))
    );
  }

  register(payload: RegisterPayload) {
    return this.http.post<ApiResponse<AuthUser>>(`${this.baseUrl}/register`, payload).pipe(
      map((response) => this.unwrapResponse(response))
    );
  }

  getToken(): string | null {
    const raw = localStorage.getItem('utmo_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw)?.token ?? null;
    } catch { return null; }
  }

  getCurrentUser(): AuthUser | null {
    const raw = localStorage.getItem('utmo_user');
    if (!raw) return null;
    try { return JSON.parse(raw); } 
    catch { return null; }
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  private unwrapResponse<T>(response: ApiResponse<T>): T {
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as { data?: T }).data as T;
    }
    return response as T;
  }
}