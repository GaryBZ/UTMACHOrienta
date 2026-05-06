import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

interface ApiResponse<T> {
  ok: boolean;
  data: T;
}

export interface PoiCampusApi {
  id: number;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  latitud: number;
  longitud: number;
  icono: string | null;
  color_hex: string | null;
  tags: string[] | null;
  id_facultad: number | null;
  activo: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PoiCampusService {
  private readonly baseUrl = `${environment.apiUrl}/poi-campus`;

  constructor(private http: HttpClient) {}

  getAll(params?: { categoria?: string; id_facultad?: number; activo?: boolean | 'all' }) {
    let httpParams = new HttpParams();
    if (params?.categoria) httpParams = httpParams.set('categoria', params.categoria);
    if (params?.id_facultad !== undefined) httpParams = httpParams.set('id_facultad', params.id_facultad.toString());
    if (params?.activo !== undefined) httpParams = httpParams.set('activo', String(params.activo));

    return this.http.get<ApiResponse<PoiCampusApi[]>>(this.baseUrl, { params: httpParams }).pipe(
      map((response) => response.data || [])
    );
  }
}
