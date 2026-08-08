import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { from, switchMap, throwError } from 'rxjs';
import { SessionService } from '../../core/infrastructure/session.service';
import { API_ENDPOINTS } from '../../core/global-api-endpoints/api-endpoints';

/**
 * Auth Interceptor
 * ----------------
 * Adds auth header using SessionService.peekAccessToken() (no navigation side effects).
 * Skips specific endpoints (login, refresh)
 * Performs silent refresh when a 401 Unauthorized occurs.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const ignored = [
    API_ENDPOINTS.AUTH.LOGIN,
    API_ENDPOINTS.AUTH.REFRESH_TOKEN,
    API_ENDPOINTS.USER.USER_CREATE,
    API_ENDPOINTS.USER.USER_MOBILE_OTP_VERIFICATION_BY_EMAIL,
    API_ENDPOINTS.USER.USER_PASSWORD_RESET_OTP_VERIFICATION,
    API_ENDPOINTS.USER.USER_CHANGE_PASSWORD,
  ];

  const urlLower = req.url.toLowerCase();
  const shouldSkip = ignored.some((endpoint) => urlLower.includes(endpoint.toLowerCase()));
  const token = shouldSkip ? null : session.peekAccessToken();

  // console.log(`[AuthInterceptor] Processing: ${req.url}`);
  // console.log(`[AuthInterceptor] Skip header? → ${shouldSkip}`);

  // Always send cookies (for HttpOnly refresh cookie)
  let clonedReq = req.clone({ withCredentials: true });

  // Add Authorization header for all non‑ignored routes
  if (!shouldSkip && token) {
    clonedReq = clonedReq.clone({
      setHeaders: { Authentication: `${token}` },
    });
    // console.log('[AuthInterceptor] Authorization header attached.');
  }

  return next(clonedReq).pipe(
    catchError((err) => {
      // console.error('[AuthInterceptor] Error response', err);
      // On 401 attempt silent refresh once
      if (
        err.status === 401 &&
        !req.url.toLowerCase().includes(API_ENDPOINTS.AUTH.REFRESH_TOKEN.toLowerCase())
      ) {
        console.warn('[AuthInterceptor] 401 → attempting silent refresh');
        return from(session.refreshToken()).pipe(
          switchMap((newToken) => {
            if (!newToken) {
              console.warn(
                '[AuthInterceptor] Silent refresh failed, redirect handled by SessionService.',
              );
              return throwError(() => err); // SessionService will redirect
            }

            console.log('[AuthInterceptor] Silent refresh success → retrying original request');
            const retryReq = req.clone({
              setHeaders: { Authentication: `${newToken}` },
              withCredentials: true,
            });
            return next(retryReq);
          }),
        );
      }

      return throwError(() => err);
    }),
  );
};
