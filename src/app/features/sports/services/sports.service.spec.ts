import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { API_BASE_URL } from '../../../core/config/api-base-url.token';
import { PaginatedResponse, Participant } from '../models/sport.model';
import { SportsService } from './sports.service';

const API_URL = 'https://api.example.test';

describe('SportsService', () => {
  let service: SportsService;
  let http: HttpTestingController;

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('uses backend search and pagination parameters for governing bodies', () => {
    setup();
    let result: PaginatedResponse<unknown> | undefined;

    service.searchGoverningBodies('sport-1', 3, 10, 'football').subscribe((response) => result = response);

    const request = http.expectOne((candidate) => candidate.url === `${API_URL}/api/organizations/governing-bodies`);
    expect(request.request.params.get('sportId')).toBe('sport-1');
    expect(request.request.params.get('page')).toBe('3');
    expect(request.request.params.get('limit')).toBe('10');
    expect(request.request.params.get('search')).toBe('football');
    expect(request.request.params.get('sortBy')).toBe('name');
    request.flush(page([]));

    expect(result?.meta.page).toBe(1);
  });

  it('uses meta totals for all four catalogue cards', () => {
    setup();
    let stats: unknown[] = [];
    service.getStats().subscribe((response) => stats = response);

    const endpoints = [
      ['/api/organizations/sports', 11],
      ['/api/organizations/governing-bodies', 12],
      ['/api/organizations/organizations', 13],
      ['/api/organizations/players', 14],
    ] as const;

    for (const [path, total] of endpoints) {
      const request = http.expectOne((candidate) => candidate.url === `${API_URL}${path}`);
      expect(request.request.params.get('limit')).toBe('1');
      request.flush(page([], total));
    }

    expect(stats).toEqual([
      { label: 'Sports', value: 11, icon: 'sports' },
      { label: 'Governing Bodies', value: 12, icon: 'governing-bodies' },
      { label: 'Organisations', value: 13, icon: 'organisations' },
      { label: 'Participants', value: 14, icon: 'participants' },
    ]);
  });

  it('loads every server page for a child collection', () => {
    setup();
    let participants: Participant[] = [];
    service.listParticipants('team-1').subscribe((response) => participants = response);

    const first = http.expectOne((candidate) => candidate.url === `${API_URL}/api/organizations/players` && candidate.params.get('page') === '1');
    first.flush(page([participant('one')], 101, 1, 100));

    const second = http.expectOne((candidate) => candidate.url === `${API_URL}/api/organizations/players` && candidate.params.get('page') === '2');
    second.flush(page([participant('two')], 101, 2, 100));

    expect(participants.map((item) => item.id)).toEqual(['one', 'two']);
  });

  it('uses a null athlete profile when the backend reports no profile', () => {
    setup();
    let profile: unknown = 'unresolved';
    service.getAthleteProfile('user-1').subscribe((response) => profile = response);

    const request = http.expectOne(`${API_URL}/api/athletes/user-1`);
    request.flush({ success: false }, { status: 404, statusText: 'Not Found' });

    expect(profile).toBeNull();
  });

  it('uses the specified squad and staff mutation endpoints', () => {
    setup();
    service.updateSquadMember('squad-1', { position: 'Forward' }).subscribe();
    service.deleteStaffMember('staff-1').subscribe();

    const squadRequest = http.expectOne(`${API_URL}/api/squad/squad-1`);
    expect(squadRequest.request.method).toBe('PATCH');
    expect(squadRequest.request.body).toEqual({ position: 'Forward' });
    squadRequest.flush({ success: true, data: { id: 'squad-1' } });

    const staffRequest = http.expectOne(`${API_URL}/api/staff/staff-1`);
    expect(staffRequest.request.method).toBe('DELETE');
    staffRequest.flush({ success: true, data: null });
  });

  function setup(): void {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: API_URL },
      ],
    });
    service = TestBed.inject(SportsService);
    http = TestBed.inject(HttpTestingController);
  }
});

function page<T>(data: T[], total = 0, pageNumber = 1, limit = 1): PaginatedResponse<T> {
  return { success: true, data, meta: { page: pageNumber, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

function participant(id: string): Participant {
  return { id, firstName: id, lastName: 'Player', jerseyNumber: null, position: null, teamId: 'team-1' };
}
