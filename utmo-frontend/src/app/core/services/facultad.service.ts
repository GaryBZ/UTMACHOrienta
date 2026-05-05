import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Facultad } from '../models/facultad.model';

interface ApiResponse<T> {
  ok: boolean;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class FacultadService {
  private readonly baseUrl = `${environment.apiUrl}/facultades`;

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<ApiResponse<Facultad[]>>(this.baseUrl).pipe(
      map((response) => response.data || [])
    );
  }
}
