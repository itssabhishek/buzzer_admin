import { Routes } from '@angular/router';

import { authGuard } from './core/auth/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Login | Buzzer Admin Console',
    loadComponent: () =>
      import('./features/auth/pages/login/login.component').then((c) => c.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./core/layouts/app-shell/app-shell.component').then((c) => c.AppShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        data: { pageTitle: 'Dashboard' },
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard/dashboard').then((c) => c.Dashboard),
      },
      {
        path: 'sports',
        data: { pageTitle: 'Sport Management' },
        loadComponent: () =>
          import('./features/sports/pages/sports-catalogue/sports-catalogue.component').then(
            (c) => c.SportsCatalogueComponent,
          ),
      },
      {
        path: 'match-management',
        data: { pageTitle: 'Match Management' },
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard/dashboard').then((c) => c.Dashboard),
      },
      {
        path: 'publishing',
        data: { pageTitle: 'Publishing' },
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard/dashboard').then((c) => c.Dashboard),
      },
      {
        path: 'finance',
        data: { pageTitle: 'Finance' },
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard/dashboard').then((c) => c.Dashboard),
      },
      {
        path: 'system',
        data: { pageTitle: 'System' },
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard/dashboard').then((c) => c.Dashboard),
      },
    ],
  },

  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
