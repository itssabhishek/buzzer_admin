import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api-base-url.token';
import {
  ApiResponse,
  CatalogueStat,
  GoverningBody,
  GoverningBodyPayload,
  Organisation,
  OrganisationPayload,
  PaginatedResponse,
  Participant,
  ParticipantPayload,
  Sport,
  SportPayload,
  SquadMember,
  SquadMemberPayload,
  StaffMember,
  StaffMemberPayload,
  StaffResponse,
  Team,
  TeamPayload,
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

  getSport(id: string): Observable<Sport> {
    return this.getById<Sport>('sports', id);
  }

  getGoverningBody(id: string): Observable<GoverningBody> {
    return this.getById<GoverningBody>('governing-bodies', id);
  }

  getOrganisation(id: string): Observable<Organisation> {
    return this.getById<Organisation>('organizations', id);
  }

  getTeam(id: string): Observable<Team> {
    return this.getById<Team>('teams', id);
  }

  getParticipant(id: string): Observable<Participant> {
    return this.getById<Participant>('players', id);
  }

  listGoverningBodies(sportId: string): Observable<GoverningBody[]> {
    return this.listChildren<GoverningBody>('governing-bodies', 'name', 'sportId', sportId);
  }

  listOrganisations(governingBodyId: string): Observable<Organisation[]> {
    return this.listChildren<Organisation>('organizations', 'name', 'governingBodyId', governingBodyId);
  }

  listTeams(organizationId: string): Observable<Team[]> {
    return this.listChildren<Team>('teams', 'name', 'organizationId', organizationId);
  }

  listParticipants(teamId: string): Observable<Participant[]> {
    return this.listChildren<Participant>('players', 'lastName', 'teamId', teamId);
  }

  createGoverningBody(payload: GoverningBodyPayload): Observable<GoverningBody> {
    return this.createChild<GoverningBody, GoverningBodyPayload>('governing-bodies', payload);
  }

  createOrganisation(payload: OrganisationPayload): Observable<Organisation> {
    return this.createChild<Organisation, OrganisationPayload>('organizations', payload);
  }

  createParticipant(payload: ParticipantPayload): Observable<Participant> {
    return this.createChild<Participant, ParticipantPayload>('players', payload);
  }

  createTeam(payload: TeamPayload): Observable<Team> {
    return this.createChild<Team, TeamPayload>('teams', payload);
  }

  getSquad(organizationId: string): Observable<SquadMember[]> {
    return this.http
      .get<ApiResponse<SquadMember[]>>(`${this.organizationBaseUrl}/${organizationId}/squad`)
      .pipe(map((response) => response.data));
  }

  getStaff(organizationId: string): Observable<StaffResponse> {
    return this.http
      .get<ApiResponse<StaffResponse>>(`${this.organizationBaseUrl}/${organizationId}/staff`)
      .pipe(map((response) => response.data));
  }

  createSquadMember(organizationId: string, payload: SquadMemberPayload): Observable<SquadMember> {
    return this.http
      .post<ApiResponse<SquadMember>>(`${this.organizationBaseUrl}/${organizationId}/squad`, payload)
      .pipe(map((response) => response.data));
  }

  createStaffMember(organizationId: string, payload: StaffMemberPayload): Observable<StaffMember> {
    return this.http
      .post<ApiResponse<StaffMember>>(`${this.organizationBaseUrl}/${organizationId}/staff`, payload)
      .pipe(map((response) => response.data));
  }

  private getTotal(path: string): Observable<number> {
    const params = new HttpParams().set('page', 1).set('limit', 1);

    return this.http
      .get<PaginatedResponse<unknown>>(`${this.apiBaseUrl}${path}`, { params })
      .pipe(map((response) => response.meta.total));
  }

  private getById<T>(resource: string, id: string): Observable<T> {
    return this.http
      .get<ApiResponse<T>>(`${this.organizationBaseUrl}/${resource}/${id}`)
      .pipe(map((response) => response.data));
  }

  private listChildren<T>(resource: string, sortBy: string, parentKey: string, parentId: string): Observable<T[]> {
    const params = new HttpParams()
      .set('page', 1)
      .set('limit', 100)
      .set('sortBy', sortBy)
      .set('sortOrder', 'asc')
      .set(parentKey, parentId);

    return this.http
      .get<PaginatedResponse<T>>(`${this.sportsUrl.replace('/sports', '')}/${resource}`, { params })
      .pipe(map((response) => response.data));
  }

  private createChild<T, TPayload>(resource: string, payload: TPayload): Observable<T> {
    return this.http
      .post<ApiResponse<T>>(`${this.organizationBaseUrl}/${resource}`, payload)
      .pipe(map((response) => response.data));
  }

  private get organizationBaseUrl(): string {
    return this.sportsUrl.replace('/sports', '');
  }
}
