import { Routes } from '@angular/router';

export const publicLayoutRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./public/public-layout/public-layout').then((m) => m.PublicLayout),
    children: [
      {
        path: '',
        loadChildren: () =>
          import('../../features/public/public.routes').then((m) => m.publicRoutes),
      },
    ],
  },
];
