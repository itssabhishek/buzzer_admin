import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize, forkJoin, of, switchMap, tap } from 'rxjs';

import { HierarchyAddDialogComponent, HierarchyAddDialogField } from '../../components/hierarchy-add-dialog/hierarchy-add-dialog.component';
import { HierarchyBreadcrumb } from '../../components/hierarchy-breadcrumbs/hierarchy-breadcrumbs.component';
import { HierarchyChildTableColumn, HierarchyChildTableRow } from '../../components/hierarchy-child-table/hierarchy-child-table.component';
import { HierarchyDetailComponent } from '../../components/hierarchy-detail/hierarchy-detail.component';
import { HierarchyStat } from '../../components/hierarchy-stat-cards/hierarchy-stat-cards.component';
import { GoverningBody, Organisation, PaginationMeta, Participant, Sport, Team } from '../../models/sport.model';
import { SportsService } from '../../services/sports.service';
import { AuthService } from '../../../../core/auth/services/auth.service';

@Component({
  selector: 'app-participant-detail',
  standalone: true,
  imports: [HierarchyDetailComponent, HierarchyAddDialogComponent, ReactiveFormsModule],
  templateUrl: './participant-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParticipantDetailComponent {
  private readonly childPageSize = 10;
  private readonly route = inject(ActivatedRoute);
  private readonly sportsService = inject(SportsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly canManageHierarchy = this.authService.canManageOrganisationHierarchy;

  readonly sport = signal<Sport | null>(null);
  readonly governingBody = signal<GoverningBody | null>(null);
  readonly organisation = signal<Organisation | null>(null);
  readonly team = signal<Team | null>(null);
  readonly participant = signal<Participant | null>(null);
  readonly teammates = signal<Participant[]>([]);
  readonly teammateMeta = signal<PaginationMeta>({ page: 1, limit: this.childPageSize, total: 0, totalPages: 1 });
  readonly teammateSearch = signal('');
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly addDialogOpen = signal(false);
  readonly isAdding = signal(false);
  readonly addErrorMessage = signal<string | null>(null);
  readonly participantForm = this.formBuilder.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    jerseyNumber: [''],
    position: ['', [Validators.maxLength(100)]],
  });

  constructor() {
    this.route.paramMap
      .pipe(
        tap(() => {
          this.isLoading.set(true);
          this.errorMessage.set(null);
        }),
        switchMap((params) =>
          this.sportsService.getParticipant(params.get('participantId') ?? '').pipe(
            switchMap((participant) =>
              this.sportsService.getTeam(participant.teamId).pipe(
                switchMap((team) =>
                  this.sportsService.getOrganisation(team.organizationId).pipe(
                    switchMap((organisation) =>
                      this.sportsService.getGoverningBody(organisation.governingBodyId).pipe(
                        switchMap((governingBody) =>
                          forkJoin({
                            participant: of(participant),
                            team: of(team),
                            organisation: of(organisation),
                            governingBody: of(governingBody),
                            sport: this.sportsService.getSport(governingBody.sportId),
                            participants: this.sportsService.searchParticipants(team.id, 1, this.childPageSize),
                          }),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ participant, team, organisation, governingBody, sport, participants }) => {
          this.participant.set(participant);
          this.team.set(team);
          this.organisation.set(organisation);
          this.governingBody.set(governingBody);
          this.sport.set(sport);
          this.teammates.set(participants.data.filter((member) => member.id !== participant.id));
          this.teammateMeta.set(participants.meta);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.errorMessage.set('Unable to load this participant. Please try again.');
        },
      });
  }

  title(): string {
    const participant = this.participant();
    return participant ? `${participant.firstName} ${participant.lastName}` : 'Loading participant…';
  }

  breadcrumbs(): HierarchyBreadcrumb[] {
    const sport = this.sport();
    const body = this.governingBody();
    const organisation = this.organisation();
    return [
      { label: 'Sport', route: '/sports' },
      ...(sport ? [{ label: sport.name, route: `/sports/${sport.id}` }] : []),
      ...(sport && body ? [{ label: body.name, route: `/sports/${sport.id}/governing-bodies/${body.id}` }] : []),
      ...(sport && body && organisation ? [{ label: organisation.name, route: `/sports/${sport.id}/governing-bodies/${body.id}/organisations/${organisation.id}` }] : []),
      { label: this.title() },
    ];
  }

  stats(): HierarchyStat[] {
    const participant = this.participant();
    return [
      { label: 'Jersey number', value: participant?.jerseyNumber ?? '—', icon: 'jersey' },
      { label: 'Position', value: participant?.position ?? '—', icon: 'position' },
      { label: 'Team members', value: this.teammates().length + (participant ? 1 : 0), icon: 'participants' },
    ];
  }

  childRows(): HierarchyChildTableRow[] {
    const sportId = this.sport()?.id;
    const governingBodyId = this.governingBody()?.id;
    const organisationId = this.organisation()?.id;
    return this.teammates().map((member) => ({
      id: member.id,
      title: `${member.firstName} ${member.lastName}`,
      subtitle: member.position,
      values: { jersey: member.jerseyNumber ? `#${member.jerseyNumber}` : null, position: member.position },
      route: sportId && governingBodyId && organisationId ? `/sports/${sportId}/governing-bodies/${governingBodyId}/organisations/${organisationId}/participants/${member.id}` : undefined,
    }));
  }

  updateTeammateSearch(search: string): void {
    this.teammateSearch.set(search);
    this.loadTeammates(1);
  }

  changeTeammatePage(page: number): void {
    this.loadTeammates(page);
  }

  teamMemberTotal(): number {
    return Math.max(0, this.teammateMeta().total - 1);
  }

  openAddDialog(): void {
    this.participantForm.reset({ firstName: '', lastName: '', jerseyNumber: '', position: '' });
    this.addErrorMessage.set(null);
    this.addDialogOpen.set(true);
  }

  closeAddDialog(): void {
    if (!this.isAdding()) {
      this.addDialogOpen.set(false);
    }
  }

  addParticipant(): void {
    const team = this.team();
    if (!team || this.participantForm.invalid || this.isAdding()) {
      this.participantForm.markAllAsTouched();
      return;
    }

    const { firstName, lastName, jerseyNumber, position } = this.participantForm.getRawValue();
    this.isAdding.set(true);
    this.addErrorMessage.set(null);
    this.sportsService
      .createParticipant({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(jerseyNumber.trim() ? { jerseyNumber: Number(jerseyNumber) } : {}),
        ...(position.trim() ? { position: position.trim() } : {}),
        teamId: team.id,
      })
      .pipe(finalize(() => this.isAdding.set(false)))
      .subscribe({
        next: () => {
          this.loadTeammates(1);
          this.addDialogOpen.set(false);
        },
        error: (error: HttpErrorResponse) => this.addErrorMessage.set(error.error?.error?.message ?? 'Unable to add this participant. Please try again.'),
      });
  }

  readonly childColumns: HierarchyChildTableColumn[] = [
    { key: 'jersey', label: 'Jersey' },
    { key: 'position', label: 'Position' },
  ];
  readonly addFields: HierarchyAddDialogField[] = [
    { controlName: 'firstName', label: 'First name', placeholder: 'e.g. Alex' },
    { controlName: 'lastName', label: 'Last name', placeholder: 'e.g. Morgan' },
    { controlName: 'jerseyNumber', label: 'Jersey number', type: 'number', placeholder: 'e.g. 10' },
    { controlName: 'position', label: 'Position', placeholder: 'e.g. Forward' },
  ];

  private loadTeammates(page: number): void {
    const team = this.team();
    if (!team) return;
    this.isLoading.set(true);
    this.sportsService.searchParticipants(team.id, page, this.childPageSize, this.teammateSearch())
      .pipe(finalize(() => this.isLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const participantId = this.participant()?.id;
          this.teammates.set(response.data.filter((member) => member.id !== participantId));
          this.teammateMeta.set(response.meta);
        },
        error: () => this.errorMessage.set('Unable to load team members. Please try again.'),
      });
  }
}
