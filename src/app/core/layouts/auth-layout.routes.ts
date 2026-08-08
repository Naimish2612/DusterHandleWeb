import { Routes } from '@angular/router';

export const authLayoutRoutes: Routes = [
  {
    path: 'auth',
    loadComponent: () => import('./auth/auth-layout/auth-layout').then((m) => m.AuthLayout),
    children: [
      {
        path: '',
        loadChildren: () => import('../../features/auth/auth.routes').then((m) => m.authRoutes),
      },
    ],
  },
];
