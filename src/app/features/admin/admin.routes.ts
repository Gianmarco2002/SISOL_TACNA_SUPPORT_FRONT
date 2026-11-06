import { Routes } from '@angular/router';
import { adminGuard } from '../../core/guards/admin-guard';

const ADMIN_ROUTES: Routes = [
  {
    path: 'verify',
    loadComponent: () => import('./pages/admin-verify/admin-verify'),
    title: 'Verificación admin',
  },
  {
    path: 'board',
    loadComponent: () => import('./pages/admin-board/admin-board'),
    canActivate: [adminGuard],
    title: 'Panel admin',
  },
  {
    path: 'usuarios',
    loadComponent: () => import('./pages/admin-users/admin-users'),
    canActivate: [adminGuard],
    title: 'Usuarios',
  },
  {
    path: 'ticket/:id',
    loadComponent: () => import('./pages/admin-ticket-detail/admin-ticket-detail'),
    canActivate: [adminGuard],
    title: 'Detalle de ticket',
  },
  {
    path: 'ticket/:id/chat',
    loadComponent: () => import('./pages/admin-ticket-chat/admin-ticket-chat'),
    canActivate: [adminGuard],
    title: 'Chat admin',
  },
  { path: '', redirectTo: 'board', pathMatch: 'full' },
  { path: '**', redirectTo: 'board' },
];

export default ADMIN_ROUTES;
