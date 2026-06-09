import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface DashboardStats {
  carreras_activas: number;
  usuarios_registrados: number;
  visitas_carreras: number;
  pois_campus: number;
  examenes_realizados: number;
  facultades: number;
}

export interface ChartBar {
  day: string;
  val: number;
  pct: number;
}

export interface TopCarrera {
  nombre: string;
  visitas: number;
  pct: number;
  color: string;
}

export interface FacStat {
  codigo: string;
  nombre: string;
  visitas: number;
  pct: number;
  color: string;
  pale: string;
}

export interface RolStat {
  nombre: string;
  cantidad: number;
  pct: number;
  color: string;
  pale: string;
  icon: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly baseUrl = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  getStats() {
    return this.http.get<DashboardStats>(`${this.baseUrl}/stats`);
  }

  getTopCarreras() {
    return this.http.get<TopCarrera[]>(`${this.baseUrl}/top-carreras`);
  }

  getFacStats() {
    return this.http.get<FacStat[]>(`${this.baseUrl}/visitas-facultad`);
  }

  getRolesStats() {
    return this.http.get<RolStat[]>(`${this.baseUrl}/usuarios-roles`);
  }

  getChartBars(dias: number = 30) {
    return this.http.get<ChartBar[]>(`${this.baseUrl}/visitas-diarias?dias=${dias}`);
  }
}