import { isPlatformServer } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth';
import { catchError, map, of } from 'rxjs';

export const authGuard: CanActivateFn = (_route, state) => {
  const platformId = inject(PLATFORM_ID);
  const authService = inject(AuthService);
  const router = inject(Router);

  if (isPlatformServer(platformId)) {
    return false;
  }

  const accessToken = localStorage.getItem('access_token');
  if (!accessToken) {
    sessionStorage.setItem('auth_return_url', state.url);
    router.navigate(['']);
    return false;
  }

  return authService.sessionInfo().pipe(
    map(({ ok, mustChange }) => {
      if (!ok) {
        sessionStorage.setItem('auth_return_url', state.url);
        router.navigate(['']);
        return false;
      }
      const enCambioClave = state.url.startsWith('/cambiar-clave');
      // Tras un restablecimiento, primero debe crear una contraseña nueva
      if (mustChange && !enCambioClave) {
        router.navigate(['/cambiar-clave']);
        return false;
      }
      if (!mustChange && enCambioClave) {
        router.navigate(['/panel']);
        return false;
      }
      return true;
    }),
    catchError(() => {
      sessionStorage.setItem('auth_return_url', state.url);
      router.navigate(['']);
      return of(false);
    }),
  );
};
