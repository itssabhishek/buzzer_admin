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
        path: 'sports/import',
        data: { pageTitle: 'Bulk Import' },
        loadComponent: () =>
          import('./features/sports/pages/bulk-import/bulk-import.component').then((c) => c.BulkImportComponent),
      },
      {
        path: 'sports/:sportId/governing-bodies/:governingBodyId/organisations/:organisationId/participants/:participantId',
        data: { pageTitle: 'Participant Details' },
        loadComponent: () =>
          import('./features/sports/pages/participant-detail/participant-detail.component').then(
            (c) => c.ParticipantDetailComponent,
          ),
      },
      {
        path: 'sports/:sportId/governing-bodies/:governingBodyId/organisations/:organisationId',
        data: { pageTitle: 'Organisation Details' },
        loadComponent: () =>
          import('./features/sports/pages/organisation-detail/organisation-detail.component').then(
            (c) => c.OrganisationDetailComponent,
          ),
      },
      {
        path: 'sports/:sportId/governing-bodies/:governingBodyId',
        data: { pageTitle: 'Governing Body Details' },
        loadComponent: () =>
          import('./features/sports/pages/governing-body-detail/governing-body-detail.component').then(
            (c) => c.GoverningBodyDetailComponent,
          ),
      },
      {
        path: 'sports/:sportId',
        data: { pageTitle: 'Sport Details' },
        loadComponent: () =>
          import('./features/sports/pages/sport-detail/sport-detail.component').then((c) => c.SportDetailComponent),
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
