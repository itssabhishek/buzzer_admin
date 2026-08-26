import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api-base-url.token';
import {
  ApiResponse,
  CatalogueStat,
  PaginatedResponse,
  Sport,
  SportPayload,
} from '../models/sport.model';

@Injectable({ providedIn: 'root' })
export class SportsService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly sportsUrl = `${this.apiBaseUrl}/api/organizations/sports`;

  list(page: number, limit: number, search = ''): Observable<PaginatedResponse<Sport>> {
    let params = new HttpParams().set('page', page).set('limit', limit).set('sortBy', 'name').set('sortOrder', 'asc');

    if (search.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http.get<PaginatedResponse<Sport>>(this.sportsUrl, { params });
  }

  getStats(): Observable<CatalogueStat[]> {
    return forkJoin({
      sports: this.getTotal('/api/organizations/sports'),
      governingBodies: this.getTotal('/api/organizations/governing-bodies'),
      organisations: this.getTotal('/api/organizations/organizations'),
      participants: this.getTotal('/api/organizations/players'),
    }).pipe(
      map(({ sports, governingBodies, organisations, participants }) => [
        { label: 'Sports', value: sports, icon: 'sports' },
        { label: 'Governing bodies', value: governingBodies, icon: 'governing-bodies' },
        { label: 'Organisations', value: organisations, icon: 'organisations' },
        { label: 'Participants', value: participants, icon: 'participants' },
      ]),
    );
  }

  create(payload: SportPayload): Observable<Sport> {
    return this.http.post<ApiResponse<Sport>>(this.sportsUrl, payload).pipe(map((response) => response.data));
  }

  update(id: string, payload: SportPayload): Observable<Sport> {
    return this.http.patch<ApiResponse<Sport>>(`${this.sportsUrl}/${id}`, payload).pipe(map((response) => response.data));
  }

  softDelete(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.sportsUrl}/${id}`).pipe(map(() => undefined));
  }

  private getTotal(path: string): Observable<number> {
    const params = new HttpParams().set('page', 1).set('limit', 1);

    return this.http
      .get<PaginatedResponse<unknown>>(`${this.apiBaseUrl}${path}`, { params })
      .pipe(map((response) => response.meta.total));
  }
}
