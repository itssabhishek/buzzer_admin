import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, map, Observable, of, shareReplay, tap, throwError } from 'rxjs';

import { API_BASE_URL } from '../../config/api-base-url.token';
import {
  ApiResponse,
  AuthSession,
  AuthTokenPair,
  AuthUser,
  LoginCredentials,
} from '../models/auth.models';

const SESSION_STORAGE_KEY = 'buzzer.admin.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly sessionState = signal<AuthSession | null>(this.readStoredSession());
  private refreshInFlight$: Observable<void> | null = null;

  readonly user = computed(() => this.sessionState()?.user ?? null);
  readonly isAuthenticated = computed(() => this.sessionState() !== null);
  readonly authorizationError = signal<string | null>(null);
  readonly canManageSports = computed(() => this.hasRole('ADMIN', 'OPERATOR'));
  readonly canManageOrganisationHierarchy = computed(() => this.hasRole('ADMIN', 'ORG'));
  readonly canManageOrganisationMembers = computed(() => this.hasRole('ADMIN', 'ORG'));

  login(credentials: LoginCredentials): Observable<void> {
    return this.http
      .post<ApiResponse<AuthSession>>(`${this.apiBaseUrl}/api/auth/login`, credentials)
      .pipe(
        tap((response) => this.storeSession(response.data)),
        map(() => undefined),
      );
  }

  validateSession(): Observable<boolean> {
    if (!this.accessToken()) {
      return of(false);
    }

    return this.http.get<ApiResponse<AuthUser>>(`${this.apiBaseUrl}/api/auth/me`).pipe(
      tap((response) => this.updateUser(response.data)),
      map(() => true),
      catchError(() => of(false)),
    );
  }

  refreshAccessToken(): Observable<void> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const refreshToken = this.refreshToken();

    if (!refreshToken) {
      return throwError(() => new Error('No refresh token is available.'));
    }

    const refreshRequest$ = this.http
      .post<ApiResponse<AuthTokenPair>>(`${this.apiBaseUrl}/api/auth/refresh`, { refreshToken })
      .pipe(
        tap((response) => this.rotateTokens(refreshToken, response.data)),
        map(() => undefined),
        finalize(() => (this.refreshInFlight$ = null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    this.refreshInFlight$ = refreshRequest$;
    return refreshRequest$;
  }

  accessToken(): string | null {
    return this.sessionState()?.accessToken ?? null;
  }

  notifyAuthorizationError(): void {
    this.authorizationError.set('You do not have permission to perform this action.');
  }

  clearAuthorizationError(): void {
    this.authorizationError.set(null);
  }

  clearSession(): void {
    this.sessionState.set(null);
    this.storage()?.removeItem(SESSION_STORAGE_KEY);
  }

  private storeSession(session: AuthSession): void {
    this.sessionState.set(session);
    this.storage()?.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  private updateUser(user: AuthUser): void {
    const session = this.sessionState();

    if (session) {
      this.storeSession({ ...session, user });
    }
  }

  private refreshToken(): string | null {
    return this.sessionState()?.refreshToken ?? null;
  }

  private rotateTokens(previousRefreshToken: string, tokens: AuthTokenPair): void {
    const session = this.sessionState();

    if (session?.refreshToken === previousRefreshToken) {
      this.storeSession({ ...session, ...tokens });
    }
  }

  private hasRole(...roles: string[]): boolean {
    const role = this.user()?.role.toUpperCase();
    return !!role && roles.includes(role);
  }

  private readStoredSession(): AuthSession | null {
    const storage = this.storage();
    const rawSession = storage?.getItem(SESSION_STORAGE_KEY);

    if (!rawSession) {
      return null;
    }

    try {
      const session = JSON.parse(rawSession) as AuthSession;
      return session.accessToken && session.refreshToken && session.user ? session : null;
    } catch {
      storage?.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
  }

  private storage(): Storage | null {
    try {
      return globalThis.localStorage;
    } catch {
      return null;
    }
  }
}
