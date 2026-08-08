import { Routes } from '@angular/router';
import { authGuard } from '../infrastructure/auth.guard';

export const adminLayoutRoutes: Routes = [
  {
    path: 'admin',
    canActivate: [authGuard('ADMIN')],
    loadComponent: () =>
      import('./admin/admin-layout/admin-layout').then(
        (m) => m.AdminLayout,
      ),
    children: [
      {
        path: '',
        loadChildren: () =>
          import('../../features/admin/admin-module.routes').then(
            (m) => m.adminModuleRoutes,
          ),
      },
    ],
  },
];
