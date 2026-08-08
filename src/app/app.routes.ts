import { Routes } from '@angular/router';
import { publicLayoutRoutes } from './core/layouts/public-layout.routes';
import { authLayoutRoutes } from './core/layouts/auth-layout.routes';
import { customerLayoutRoutes } from './core/layouts/client-layout.routes';
import { adminLayoutRoutes } from './core/layouts/admin-layout.routes';

export const routes: Routes = [
    ...authLayoutRoutes,
    ...customerLayoutRoutes,
    ...adminLayoutRoutes,
    ...publicLayoutRoutes,
    { path: '**', redirectTo: '' }
];
