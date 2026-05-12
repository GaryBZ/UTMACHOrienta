import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'inicio',
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'test',
    loadComponent: () => import('./pages/test/test.component').then((m) => m.TestComponent),
  },
  {
    path: 'carreras',
    loadComponent: () => import('./pages/careers/careers.component').then((m) => m.CareersComponent),
  },
  {
    path: 'carreras/:id',
    loadComponent: () => import('./pages/careers/careers.component').then((m) => m.CareersComponent),
  },
  {
    path: 'campus',
    loadComponent: () => import('./pages/campus/campus.component').then((m) => m.CampusComponent),
  },
  {
    path: 'terminos-y-condiciones',
    loadComponent: () => import('./pages/legal/terminos-condiciones/terminos-condiciones.component').then((m) => m.TerminosCondicionesComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    redirectTo: 'inicio',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'inicio',
  }
];
