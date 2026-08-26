import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';

import { API_BASE_URL } from '../../config/api-base-url.token';
import { ApiResponse, AuthSession, AuthUser, LoginCredentials } from '../models/auth.models';

const SESSION_STORAGE_KEY = 'buzzer.admin.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly sessionState = signal<AuthSession | null>(this.readStoredSession());

  readonly user = computed(() => this.sessionState()?.user ?? null);
  readonly isAuthenticated = computed(() => this.sessionState() !== null);

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
      catchError(() => {
        this.clearSession();
        return of(false);
      }),
    );
  }

  accessToken(): string | null {
    return this.sessionState()?.accessToken ?? null;
  }

  clearSession(): void {
    this.sessionState.set(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  private storeSession(session: AuthSession): void {
    this.sessionState.set(session);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  private updateUser(user: AuthUser): void {
    const session = this.sessionState();

    if (session) {
      this.storeSession({ ...session, user });
    }
  }

  private readStoredSession(): AuthSession | null {
    const rawSession = localStorage.getItem(SESSION_STORAGE_KEY);

    if (!rawSession) {
      return null;
    }

    try {
      const session = JSON.parse(rawSession) as AuthSession;
      return session.accessToken && session.refreshToken && session.user ? session : null;
    } catch {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
  }
}
