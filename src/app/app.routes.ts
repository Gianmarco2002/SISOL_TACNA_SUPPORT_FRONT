import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { loggedInGuard } from './core/guards/logged-in-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/auth/auth'),
    title: 'Iniciar sesión',
    canActivate: [loggedInGuard],
  },
  {
    path: 'panel',
    loadChildren: () => import('./features/panel/panel.routes'),
    canActivate: [authGuard],
  },
  {
    path: 'cambiar-clave',
    loadComponent: () => import('./features/auth/change-password/change-password'),
    canActivate: [authGuard],
    title: 'Crea tu nueva contraseña',
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes'),
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
