import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ChartBar, DashboardService, FacStat, RolStat, TopCarrera } from '../../../core/services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [CommonModule],
})
export class DashboardComponent implements OnInit {
  today = new Date();
  totalCarreras = 0;
  totalUsuarios = 0;
  totalVisitas = 0;
  totalPois = 0;
  totalExamenes = 0;
  totalFacultades = 0;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.dashboardService.getStats().subscribe((stats) => {
      this.totalCarreras = stats.carreras_activas;
      this.totalUsuarios = stats.usuarios_registrados;
      this.totalVisitas = stats.visitas_carreras;
      this.totalPois = stats.pois_campus;
      this.totalExamenes = stats.examenes_realizados;
      this.totalFacultades = stats.facultades;
    });

    this.dashboardService.getChartBars().subscribe((bars) => {
      this.chartBars = bars; // { day, val, pct }
    });

    this.dashboardService.getTopCarreras().subscribe((data) => {
      this.topCarreras = data;
    });

    this.dashboardService.getFacStats().subscribe((data) => {
      this.facStats = data;
    });

    this.dashboardService.getRolesStats().subscribe((data) => {
      this.rolesStats = data;
    });
  }

  chartBars: ChartBar[] = [];
  topCarreras: TopCarrera[] = [];
  facStats: FacStat[] = [];
  rolesStats: RolStat[] = [];

  actividad = [
    {
      id: 1,
      texto: 'Juan Sánchez exploró Ing. en Sistemas',
      tiempo: 'Hace 5 min',
      tipo: 'Visita',
      icon: 'fa-solid fa-eye',
      color: '#1b6dff',
      pale: '#e3edff',
    },
    {
      id: 2,
      texto: 'María López completó el test vocacional',
      tiempo: 'Hace 12 min',
      tipo: 'Test',
      icon: 'fa-solid fa-brain',
      color: '#1D9E75',
      pale: '#E1F5EE',
    },
    {
      id: 3,
      texto: 'Carlos Ramírez rindió examen de Derecho',
      tiempo: 'Hace 28 min',
      tipo: 'Examen',
      icon: 'fa-solid fa-pen-to-square',
      color: '#E07B2A',
      pale: '#FEF3E2',
    },
    {
      id: 4,
      texto: 'Ana Torres se registró en la plataforma',
      tiempo: 'Hace 45 min',
      tipo: 'Registro',
      icon: 'fa-solid fa-user-plus',
      color: '#7C3AED',
      pale: '#F3E8FF',
    },
    {
      id: 5,
      texto: 'Pedro Mora exploró Administración de Empresas',
      tiempo: 'Hace 1h',
      tipo: 'Visita',
      icon: 'fa-solid fa-eye',
      color: '#1b6dff',
      pale: '#e3edff',
    },
    {
      id: 6,
      texto: 'Se agregó el POI Bienestar Universitario',
      tiempo: 'Hace 2h',
      tipo: 'Admin',
      icon: 'fa-solid fa-map-location-dot',
      color: '#DC2626',
      pale: '#FEE2E2',
    },
  ];

  tabsStats = [
    {
      nombre: 'Descripción',
      pct: 92,
      color: '#1b6dff',
      icon: 'fa-solid fa-align-left',
    },
    { nombre: 'Pensum', pct: 74, color: '#1D9E75', icon: 'fa-solid fa-list' },
    {
      nombre: 'Mini Clase',
      pct: 51,
      color: '#E07B2A',
      icon: 'fa-solid fa-chalkboard-teacher',
    },
    {
      nombre: 'Examen',
      pct: 38,
      color: '#7C3AED',
      icon: 'fa-solid fa-pen-to-square',
    },
  ];
}
