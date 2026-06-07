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
    path: 'perfil',
    loadComponent: () => import('./pages/perfil/perfil.component').then((m) => m.PerfilComponent),
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
    path: 'admin',
    loadComponent: () => import('./admin/layout/admin-layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./admin/pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'carreras',
        loadComponent: () => import('./admin/pages/carreras/listar-carreras/listar-carreras.component').then((m) => m.ListarCarrerasComponent),
      },
      {
        path: 'crear-carrera',
        loadComponent: () => import('./admin/pages/carreras/crear-carreras/crear-carreras.component').then((m) => m.CrearCarrerasComponent),
      },
      {
        path: 'clases',
        loadComponent: () => import('./admin/pages/clases/listar-clases/listar-clases.component').then((m) => m.ListarClasesComponent),
      },
      {
        path: 'crear-clases',
        loadComponent: () => import('./admin/pages/clases/crear-clases/crear-clases.component').then((m) => m.CrearClasesComponent),
      },
      {
        path: 'pensum',
        loadComponent: () => import('./admin/pages/pensum/listar-pensum/listar-pensum.component').then((m) => m.ListarPensumComponent),
      },
      {
        path: 'pensum/:id',
        loadComponent: () => import('./admin/pages/pensum/crear-pensum/crear-pensum.component').then((m) => m.CrearPensumComponent),
      },
      {
        path: 'crear-pensum',
        loadComponent: () => import('./admin/pages/pensum/crear-pensum/crear-pensum.component').then((m) => m.CrearPensumComponent),
      },
      {
        path: 'examenes',
        loadComponent: () => import('./admin/pages/examenes/listar-examenes/listar-examenes.component').then((m) => m.ListarExamenesComponent),
      },
      {
        path: 'campus',
        loadComponent: () => import('./admin/pages/campus/listar-campus/listar-campus.component').then((m) => m.ListarCampusComponent),
      },
      {
        path: 'usuarios',
        loadComponent: () => import('./admin/pages/usuarios/usuarios.component').then((m) => m.UsuariosComponent),
      },
    ],
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
