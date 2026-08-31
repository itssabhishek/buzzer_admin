import {
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { API_BASE_URL } from '../../config/api-base-url.token';
import { AuthService } from '../services/auth.service';

const PUBLIC_AUTH_PATHS = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout'];
const RETRIED_AFTER_REFRESH = new HttpContextToken<boolean>(() => false);

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const apiBaseUrl = inject(API_BASE_URL);
  const router = inject(Router);
  const isBackendRequest = request.url.startsWith(apiBaseUrl);
  const isPublicAuthRequest = PUBLIC_AUTH_PATHS.some((path) => request.url.endsWith(path));
  const authenticatedRequest = addAuthorizationHeader(
    request,
    isBackendRequest && !isPublicAuthRequest ? authService.accessToken() : null,
  );

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || !isBackendRequest || isPublicAuthRequest) {
        return throwError(() => error);
      }

      if (error.status === 403) {
        authService.notifyAuthorizationError();
        return throwError(() => error);
      }

      if (error.status !== 401 || request.context.get(RETRIED_AFTER_REFRESH)) {
        return throwError(() => error);
      }

      return authService.refreshAccessToken().pipe(
        catchError((refreshError: unknown) => {
          authService.clearSession();
          void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
          return throwError(() => refreshError);
        }),
        switchMap(() =>
          next(
            addAuthorizationHeader(request, authService.accessToken()).clone({
              context: request.context.set(RETRIED_AFTER_REFRESH, true),
            }),
          ),
        ),
      );
    }),
  );
};

function addAuthorizationHeader(
  request: HttpRequest<unknown>,
  accessToken: string | null,
): HttpRequest<unknown> {
  return accessToken
    ? request.clone({
        setHeaders: { Authorization: `Bearer ${accessToken}` },
      })
    : request;
}
