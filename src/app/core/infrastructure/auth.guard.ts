import { inject } from '@angular/core';
import { CanActivateFn, UrlTree, Router } from '@angular/router';
import { SessionService } from './session.service';

type AllowedUserType =
  | 'CUSTOMER'
  | 'ADMIN';

export const authGuard =
  (...allowedUserTypes: AllowedUserType[]): CanActivateFn =>
  (_route, state): boolean | UrlTree => {
    const sessionService = inject(SessionService);
    const router = inject(Router);

    if (!sessionService.isAuthenticated()) {

      return router.createUrlTree(['/auth/login'], {
        queryParams: { returnUrl: state.url },
      });
    }

    const userType = sessionService.getUserType();
    if (!userType) {

      sessionService.clearSession();
      return router.createUrlTree(['/auth/login'], {
        queryParams: { returnUrl: state.url },
      });
    }

    if (
      !allowedUserTypes.length ||
      allowedUserTypes.includes(userType as AllowedUserType)
    ) {
      return true;
    }

    return router.createUrlTree([
      sessionService.getDefaultRouteByUserType(userType),
    ]);
  };
