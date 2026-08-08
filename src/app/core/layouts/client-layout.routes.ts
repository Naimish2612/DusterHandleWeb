import { Routes } from '@angular/router';
import { authGuard } from '../infrastructure/auth.guard';

export const customerLayoutRoutes: Routes = [
  {
    path: 'customer',
    canActivate: [authGuard('CUSTOMER')],
    loadComponent: () =>
      import('./customer/customer-layout/customer-layout').then((m) => m.CustomerLayout),
    children: [
      {
        path: '',
        loadChildren: () =>
          import('../../features/customer/customer.routes').then((m) => m.customerRoutes),
      },
    ],
  },
];
