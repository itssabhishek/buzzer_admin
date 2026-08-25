import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
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
