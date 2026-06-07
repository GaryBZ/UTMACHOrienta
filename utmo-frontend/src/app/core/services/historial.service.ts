import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

type ApiResponse<T> = { ok: boolean; data: T } | T;

@Injectable({ providedIn: 'root' })
export class HistorialService {
  private readonly baseUrl = `${environment.apiUrl}/historial`;

  constructor(private http: HttpClient) {}

  registrarVisita(id_carrera: number) {
    return this.http
      .post<ApiResponse<any>>(`${this.baseUrl}/visita`, { id_carrera })
      .pipe(map((r) => this.unwrap(r)));
  }

  getHistorialUsuario(limit: number = 5) {
    return this.http.get<any>(`${this.baseUrl}/usuario?limit=${limit}`).pipe(
      map((r) => {
        if (r && typeof r === 'object' && 'data' in r) {
          return { data: r.data, total: r.total };
        }
        return { data: r, total: 0 };
      }),
    );
  }

  getMasVisitadas() {
    return this.http
      .get<ApiResponse<any[]>>(`${this.baseUrl}/mas-visitadas`)
      .pipe(map((r) => this.unwrap(r) ?? []));
  }

  actualizarTabs(id_carrera: number, tabs_vistos: string[]) {
    return this.http
      .patch<
        ApiResponse<any>
      >(`${this.baseUrl}/tabs`, { id_carrera, tabs_vistos })
      .pipe(map((r) => this.unwrap(r)));
  }

  private unwrap<T>(response: ApiResponse<T>): T | null {
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as any).data ?? null;
    }
    return response as T;
  }
}
