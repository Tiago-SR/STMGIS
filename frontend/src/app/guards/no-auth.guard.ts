import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const noAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  let ret = false;
  authService.isLoggedIn.subscribe({
    next: (response) => {
      ret = !response.isLogged
    }, 
    error: () => {
      ret =false
    }
  });
  return ret;
};
