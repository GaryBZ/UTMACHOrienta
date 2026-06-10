import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Examen } from '../models/examen.model';

type ApiResponse<T> = { ok: boolean; data: T } | T;

@Injectable({ providedIn: 'root' })
export class ExamenService {
  private readonly baseUrl = `${environment.apiUrl}/examenes`;

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<ApiResponse<Examen[]>>(this.baseUrl).pipe(
      map(r => this.unwrap(r) ?? [])
    );
  }

  getByCarrera(id: number) {
    return this.http.get<ApiResponse<Examen>>(`${this.baseUrl}/carrera/${id}`).pipe(
      map(r => this.unwrap(r))
    );
  }

  private unwrap<T>(r: ApiResponse<T>): T | null {
    if (r && typeof r === 'object' && 'data' in r) return (r as any).data ?? null;
    return r as T;
  }
}