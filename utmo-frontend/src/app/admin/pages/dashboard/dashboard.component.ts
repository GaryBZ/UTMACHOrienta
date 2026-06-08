import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [CommonModule],
})
export class DashboardComponent implements OnInit {
  today = new Date();
  constructor() {}

  ngOnInit() {}
  
  chartBars = [
    { day: '9/5', val: 42, pct: 42 },
    { day: '10/5', val: 58, pct: 58 },
    { day: '11/5', val: 35, pct: 35 },
    { day: '12/5', val: 71, pct: 71 },
    { day: '13/5', val: 90, pct: 90 },
    { day: '14/5', val: 65, pct: 65 },
    { day: '15/5', val: 48, pct: 48 },
    { day: '16/5', val: 82, pct: 82 },
    { day: '17/5', val: 55, pct: 55 },
    { day: '18/5', val: 38, pct: 38 },
    { day: '19/5', val: 95, pct: 95 },
    { day: '20/5', val: 78, pct: 78 },
    { day: '21/5', val: 62, pct: 62 },
    { day: '22/5', val: 44, pct: 44 },
    { day: '23/5', val: 88, pct: 88 },
    { day: '24/5', val: 100, pct: 100 },
    { day: '25/5', val: 73, pct: 73 },
    { day: '26/5', val: 51, pct: 51 },
    { day: '27/5', val: 67, pct: 67 },
    { day: '28/5', val: 83, pct: 83 },
  ];

  topCarreras = [
    {
      nombre: 'Ing. en Sistemas y Computación',
      visitas: 284,
      pct: 100,
      color: '#1b6dff',
    },
    {
      nombre: 'Administración de Empresas',
      visitas: 231,
      pct: 81,
      color: '#1D9E75',
    },
    { nombre: 'Medicina', visitas: 198, pct: 70, color: '#E07B2A' },
    { nombre: 'Derecho', visitas: 165, pct: 58, color: '#7C3AED' },
    {
      nombre: 'Contabilidad y Auditoría',
      visitas: 142,
      pct: 50,
      color: '#DC2626',
    },
    { nombre: 'Ingeniería Civil', visitas: 118, pct: 42, color: '#1b6dff' },
  ];

  facStats = [
    {
      codigo: 'FIC',
      nombre: 'Ing. Civil y Computación',
      visitas: 512,
      pct: 100,
      color: '#1b6dff',
      pale: '#e3edff',
    },
    {
      codigo: 'FCA',
      nombre: 'Ciencias Administrativas',
      visitas: 389,
      pct: 76,
      color: '#1D9E75',
      pale: '#E1F5EE',
    },
    {
      codigo: 'FCQS',
      nombre: 'Cs. Químicas y de la Salud',
      visitas: 298,
      pct: 58,
      color: '#E07B2A',
      pale: '#FEF3E2',
    },
    {
      codigo: 'FCS',
      nombre: 'Ciencias Sociales',
      visitas: 187,
      pct: 37,
      color: '#7C3AED',
      pale: '#F3E8FF',
    },
    {
      codigo: 'FCE',
      nombre: 'Ciencias Empresariales',
      visitas: 142,
      pct: 28,
      color: '#DC2626',
      pale: '#FEE2E2',
    },
  ];

  rolesStats = [
    {
      nombre: 'Aspirante',
      cantidad: 98,
      pct: 100,
      color: '#1b6dff',
      pale: '#e3edff',
      icon: 'fa-solid fa-user-graduate',
    },
    {
      nombre: 'Estudiante',
      cantidad: 31,
      pct: 32,
      color: '#1D9E75',
      pale: '#E1F5EE',
      icon: 'fa-solid fa-book',
    },
    {
      nombre: 'Administrador',
      cantidad: 8,
      pct: 8,
      color: '#7C3AED',
      pale: '#F3E8FF',
      icon: 'fa-solid fa-shield-halved',
    },
    {
      nombre: 'Invitado',
      cantidad: 5,
      pct: 5,
      color: '#E07B2A',
      pale: '#FEF3E2',
      icon: 'fa-solid fa-user',
    },
  ];

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
