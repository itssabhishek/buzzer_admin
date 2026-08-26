import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { API_BASE_URL } from '../../config/api-base-url.token';
import { AuthService } from '../services/auth.service';

const PUBLIC_AUTH_PATHS = ['/api/auth/login', '/api/auth/refresh'];

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const apiBaseUrl = inject(API_BASE_URL);
  const router = inject(Router);
  const isBackendRequest = request.url.startsWith(apiBaseUrl);
  const isPublicAuthRequest = PUBLIC_AUTH_PATHS.some((path) => request.url.endsWith(path));
  const accessToken = authService.accessToken();
  const authenticatedRequest =
    isBackendRequest && !isPublicAuthRequest && accessToken
      ? request.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
      : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !isPublicAuthRequest) {
        authService.clearSession();
        void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      }

      return throwError(() => error);
    }),
  );
};
