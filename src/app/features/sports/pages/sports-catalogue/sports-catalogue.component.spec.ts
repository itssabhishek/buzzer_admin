import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../../core/auth/services/auth.service';
import { AppSearchService } from '../../../../core/search/app-search.service';
import { SportsService } from '../../services/sports.service';
import { SportsCatalogueComponent } from './sports-catalogue.component';

describe('SportsCatalogueComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('marks the name field when the API rejects a duplicate sport', () => {
    const sportsService = {
      list: vi.fn(() =>
        of({ success: true, data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }),
      ),
      getStats: vi.fn(() => of([])),
      create: vi.fn(() => throwError(() => new HttpErrorResponse({ status: 409 }))),
    };
    const component = createComponent(sportsService);

    component.openCreateDialog();
    component.sportForm.setValue({ name: 'Football', description: '', iconUrl: '' });
    component.saveSport();

    expect(sportsService.create).toHaveBeenCalledWith({ name: 'Football' });
    expect(component.sportForm.controls.name.hasError('duplicate')).toBe(true);
    expect(component.sportForm.invalid).toBe(true);

    component.sportForm.controls.name.setValue('Basketball');

    expect(component.sportForm.controls.name.hasError('duplicate')).toBe(false);
  });

  function createComponent(
    sportsService: Pick<SportsService, 'list' | 'getStats' | 'create'>,
  ): SportsCatalogueComponent {
    TestBed.configureTestingModule({
      imports: [SportsCatalogueComponent],
      providers: [
        { provide: SportsService, useValue: sportsService },
        { provide: AppSearchService, useValue: { searchTerm: signal('') } },
        {
          provide: AuthService,
          useValue: {
            canManageSports: signal(true),
            canManageOrganisationHierarchy: signal(false),
          },
        },
        provideRouter([]),
      ],
    });

    return TestBed.createComponent(SportsCatalogueComponent).componentInstance;
  }
});
