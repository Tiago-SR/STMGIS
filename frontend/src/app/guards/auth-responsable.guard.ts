import { CanActivateFn } from '@angular/router';
import { UserType } from '../enums/user-type';
import { AuthService } from '../services/auth.service';
import { inject } from '@angular/core';

export const authResponsableGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService)
  const userType = authService.getUserType()
  return userType === UserType.RESPONSABLE || userType === UserType.ADMIN
};
