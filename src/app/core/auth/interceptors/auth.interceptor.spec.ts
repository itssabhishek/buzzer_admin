import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { API_BASE_URL } from '../../config/api-base-url.token';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

const API_URL = 'https://api.example.test';
const SESSION_STORAGE_KEY = 'buzzer.admin.session';

describe('authInterceptor', () => {
  let authService: AuthService;
  let http: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: new MemoryStorage(),
    });
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session()));

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([{ path: 'login', component: LoginStubComponent }]),
        { provide: API_BASE_URL, useValue: API_URL },
      ],
    });

    authService = TestBed.inject(AuthService);
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    TestBed.resetTestingModule();
  });

  it('rotates tokens and retries a 401 request once', () => {
    http.get(`${API_URL}/api/organizations/sports`).subscribe();

    const initialRequest = httpTesting.expectOne(`${API_URL}/api/organizations/sports`);
    expect(initialRequest.request.headers.get('Authorization')).toBe('Bearer access-token');
    initialRequest.flush({ success: false }, { status: 401, statusText: 'Unauthorized' });

    const refreshRequest = httpTesting.expectOne(`${API_URL}/api/auth/refresh`);
    expect(refreshRequest.request.body).toEqual({ refreshToken: 'refresh-token' });
    refreshRequest.flush({
      success: true,
      data: { accessToken: 'next-access', refreshToken: 'next-refresh' },
    });

    const retriedRequest = httpTesting.expectOne(`${API_URL}/api/organizations/sports`);
    expect(retriedRequest.request.headers.get('Authorization')).toBe('Bearer next-access');
    retriedRequest.flush({ success: true, data: [] });

    expect(authService.accessToken()).toBe('next-access');
    expect(JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) ?? '{}').refreshToken).toBe(
      'next-refresh',
    );
  });

  it('shares one refresh request when multiple requests receive a 401', () => {
    http.get(`${API_URL}/api/organizations/sports`).subscribe();
    http.get(`${API_URL}/api/organizations/teams`).subscribe();

    httpTesting
      .expectOne(`${API_URL}/api/organizations/sports`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    httpTesting
      .expectOne(`${API_URL}/api/organizations/teams`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    const refreshRequest = httpTesting.expectOne(`${API_URL}/api/auth/refresh`);
    refreshRequest.flush({
      success: true,
      data: { accessToken: 'next-access', refreshToken: 'next-refresh' },
    });

    const retriedSportsRequest = httpTesting.expectOne(`${API_URL}/api/organizations/sports`);
    const retriedTeamsRequest = httpTesting.expectOne(`${API_URL}/api/organizations/teams`);
    expect(retriedSportsRequest.request.headers.get('Authorization')).toBe('Bearer next-access');
    expect(retriedTeamsRequest.request.headers.get('Authorization')).toBe('Bearer next-access');
    retriedSportsRequest.flush({ success: true, data: [] });
    retriedTeamsRequest.flush({ success: true, data: [] });
  });

  it('clears the session when the refresh token is rejected', () => {
    http.get(`${API_URL}/api/organizations/sports`).subscribe({ error: () => undefined });

    httpTesting
      .expectOne(`${API_URL}/api/organizations/sports`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    httpTesting
      .expectOne(`${API_URL}/api/auth/refresh`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('shows a permission error without clearing the session for a 403 response', () => {
    http.get(`${API_URL}/api/organizations/sports`).subscribe({ error: () => undefined });

    const request = httpTesting.expectOne(`${API_URL}/api/organizations/sports`);
    request.flush({ success: false }, { status: 403, statusText: 'Forbidden' });

    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.authorizationError()).toBe(
      'You do not have permission to perform this action.',
    );
  });
});

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function session() {
  return {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    user: { id: 'user-id', email: 'user@buzzer.dev', role: 'VIEWER' },
  };
}

@Component({ template: '' })
class LoginStubComponent {}
