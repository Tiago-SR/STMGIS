import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserType } from '../enums/user-type';

export const authAdminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService)
  const userType = authService.getUserType()
  return userType === UserType.ADMIN
};
