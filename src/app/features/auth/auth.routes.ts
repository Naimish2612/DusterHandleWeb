import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login').then((m) => m.Login),
    data: { title: 'Login' },
  },
  {
    path: 'signup',
    loadComponent: () => import('./signup/signup').then((m) => m.Signup),
    data: { title: 'Signup' },
  },
  {
    path: 'forgot/password',
    loadComponent: () => import('./forgot-password/forgot-password').then((m) => m.ForgotPassword),
    data: { title: 'Forgot Password' },
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
];
