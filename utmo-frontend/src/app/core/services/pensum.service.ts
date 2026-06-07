import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Pensum } from '../models/pensum.model';

// Regresa objeto con formato ok si es exitosa, y la data que seria el objeto
type ApiResponse<T> = { ok: boolean; data: T } | T;

@Injectable({
  providedIn: 'root'
})
export class PensumService {
  private readonly baseUrl = `${environment.apiUrl}/pensum`;

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<ApiResponse<Pensum[]>>(this.baseUrl).pipe(
      map((response) => this.unwrapResponse(response) ?? [])
    );
  }

  getByCarrera(idCarrera: number) {
    return this.http.get<ApiResponse<Pensum[]>>(`${this.baseUrl}/carrera/${idCarrera}`).pipe(
      map((response) => this.unwrapResponse(response) ?? [])
    );
  }

  getById(id: number) {
    return this.http.get<ApiResponse<Pensum>>(`${this.baseUrl}/${id}`).pipe(
      map((response) => this.unwrapResponse(response))
    );
  }

  upsertByCarrera(idCarrera: number, materias: { semestre: number; nombre_materia: string }[]) {
  return this.http.post<ApiResponse<Pensum[]>>(
    `${this.baseUrl}/carrera/${idCarrera}/upsert`, 
    { materias }
  ).pipe(map((response) => this.unwrapResponse(response) ?? []));
}

  private unwrapResponse<T>(response: ApiResponse<T>): T | null {
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as { data?: T }).data ?? null;
    }
    return response ?? null;
  }
}
