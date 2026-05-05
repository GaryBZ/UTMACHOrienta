import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Carrera } from '../models/carrera.model';

// Regresa objeto con formato ok si es exitosa, y la data que seria el objeto
type ApiResponse<T> = { ok: boolean; data: T } | T;

@Injectable({
  providedIn: 'root'
})
export class CarreraService {
  private readonly baseUrl = `${environment.apiUrl}/carreras`;

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<ApiResponse<Carrera[]>>(this.baseUrl).pipe(
      map((response) => this.unwrapResponse(response) ?? [])
    );
  }

  getByFacultad(idFacultad: number) {
    return this.http.get<ApiResponse<Carrera[]>>(`${this.baseUrl}/facultad/${idFacultad}`).pipe(
      map((response) => this.unwrapResponse(response) ?? [])
    );
  }

  getById(id: number) {
    return this.http.get<ApiResponse<Carrera>>(`${this.baseUrl}/${id}`).pipe(
      map((response) => this.unwrapResponse(response))
    );
  }

  private unwrapResponse<T>(response: ApiResponse<T>): T | null {
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as { data?: T }).data ?? null;
    }
    return response ?? null;
  }
}
