import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { API_BASE_URL } from '../../config/api-base-url.token';
import { AuthService } from './auth.service';

const SESSION_STORAGE_KEY = 'buzzer.admin.session';

describe('AuthService role permissions', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: new MemoryStorage(),
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
  });

  it('allows sports writes for ADMIN and OPERATOR only', () => {
    const admin = createServiceForRole('ADMIN');
    expect(admin.canManageSports()).toBe(true);
    expect(admin.canManageOrganisationMembers()).toBe(true);

    TestBed.resetTestingModule();
    localStorage.clear();
    const operator = createServiceForRole('OPERATOR');
    expect(operator.canManageSports()).toBe(true);
    expect(operator.canManageOrganisationMembers()).toBe(false);

    TestBed.resetTestingModule();
    localStorage.clear();
    const viewer = createServiceForRole('VIEWER');
    expect(viewer.canManageSports()).toBe(false);
    expect(viewer.canManageOrganisationHierarchy()).toBe(false);
  });

  it('allows squad and staff writes for ORG accounts', () => {
    const organisation = createServiceForRole('ORG');

    expect(organisation.canManageSports()).toBe(false);
    expect(organisation.canManageOrganisationHierarchy()).toBe(true);
    expect(organisation.canManageOrganisationMembers()).toBe(true);
  });

  it('uses the current user response to update role permissions', () => {
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: 'user-id', email: 'user@buzzer.dev', role: 'VIEWER' },
      }),
    );
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.example.test' },
      ],
    });
    const service = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);

    service.validateSession().subscribe();
    http
      .expectOne('https://api.example.test/api/auth/me')
      .flush({
        success: true,
        data: { id: 'user-id', email: 'user@buzzer.dev', role: 'OPERATOR' },
      });

    expect(service.canManageSports()).toBe(true);
    http.verify();
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

function createServiceForRole(role: string): AuthService {
  localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'user-id', email: 'user@buzzer.dev', role },
    }),
  );

  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      { provide: API_BASE_URL, useValue: 'https://api.example.test' },
    ],
  });

  return TestBed.inject(AuthService);
}
