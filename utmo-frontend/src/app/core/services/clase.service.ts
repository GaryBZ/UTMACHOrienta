import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Clases } from '../models/clases.model';

type ApiResponse<T> = { ok: boolean; data: T } | T;

@Injectable({
  providedIn: 'root'
})
export class ClaseService {
  private readonly baseUrl = `${environment.apiUrl}/clases`;

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<ApiResponse<Clases[]>>(this.baseUrl).pipe(
      map((response) => this.unwrapResponse(response) ?? [])
    );
  }

  getByCarrera(idCarrera: number) {
    return this.http.get<ApiResponse<Clases[]>>(`${this.baseUrl}/carrera/${idCarrera}`).pipe(
      map((response) => this.unwrapResponse(response) ?? [])
    );
  }

  getById(id: number) {
    return this.http.get<ApiResponse<Clases>>(`${this.baseUrl}/${id}`).pipe(
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
