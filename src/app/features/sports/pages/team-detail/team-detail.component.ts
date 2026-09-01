import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize, forkJoin, of, switchMap, tap } from 'rxjs';

import {
  HierarchyAddDialogComponent,
  HierarchyAddDialogField,
} from '../../components/hierarchy-add-dialog/hierarchy-add-dialog.component';
import { HierarchyBreadcrumb } from '../../components/hierarchy-breadcrumbs/hierarchy-breadcrumbs.component';
import {
  HierarchyChildTableColumn,
  HierarchyChildTableRow,
} from '../../components/hierarchy-child-table/hierarchy-child-table.component';
import { HierarchyDetailComponent } from '../../components/hierarchy-detail/hierarchy-detail.component';
import { HierarchyStat } from '../../components/hierarchy-stat-cards/hierarchy-stat-cards.component';
import {
  GoverningBody,
  Organisation,
  PaginationMeta,
  Participant,
  Sport,
  Team,
} from '../../models/sport.model';
import { SportsService } from '../../services/sports.service';
import { AuthService } from '../../../../core/auth/services/auth.service';

const CHILD_PAGE_SIZE = 10;
const EMPTY_META: PaginationMeta = { page: 1, limit: CHILD_PAGE_SIZE, total: 0, totalPages: 1 };

@Component({
  selector: 'app-team-detail',
  standalone: true,
  imports: [HierarchyDetailComponent, HierarchyAddDialogComponent, ReactiveFormsModule],
  templateUrl: './team-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamDetailComponent {
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
  readonly participants = signal<Participant[]>([]);
  readonly participantMeta = signal<PaginationMeta>(EMPTY_META);
  readonly participantSearch = signal('');
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
          this.sportsService.getTeam(params.get('teamId') ?? '').pipe(
            switchMap((team) =>
              this.sportsService.getOrganisation(team.organizationId).pipe(
                switchMap((organisation) =>
                  this.sportsService.getGoverningBody(organisation.governingBodyId).pipe(
                    switchMap((governingBody) =>
                      forkJoin({
                        team: of(team),
                        organisation: of(organisation),
                        governingBody: of(governingBody),
                        sport: this.sportsService.getSport(governingBody.sportId),
                        participants: this.sportsService.searchParticipants(
                          team.id,
                          1,
                          CHILD_PAGE_SIZE,
                        ),
                      }),
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
        next: ({ team, organisation, governingBody, sport, participants }) => {
          this.team.set(team);
          this.organisation.set(organisation);
          this.governingBody.set(governingBody);
          this.sport.set(sport);
          this.participants.set(participants.data);
          this.participantMeta.set(participants.meta);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.errorMessage.set('Unable to load this team. Please try again.');
        },
      });
  }

  breadcrumbs(): HierarchyBreadcrumb[] {
    const sport = this.sport();
    const governingBody = this.governingBody();
    const organisation = this.organisation();

    return [
      { label: 'Sport', route: '/sports' },
      ...(sport ? [{ label: sport.name, route: `/sports/${sport.id}` }] : []),
      ...(sport && governingBody
        ? [
            {
              label: governingBody.name,
              route: `/sports/${sport.id}/governing-bodies/${governingBody.id}`,
            },
          ]
        : []),
      ...(sport && governingBody && organisation
        ? [
            {
              label: organisation.name,
              route: `/sports/${sport.id}/governing-bodies/${governingBody.id}/organisations/${organisation.id}`,
            },
          ]
        : []),
      { label: this.team()?.name ?? 'Team' },
    ];
  }

  stats(): HierarchyStat[] {
    return [
      { label: 'Participants', value: this.participantMeta().total, icon: 'participants' },
      { label: 'Short name', value: this.team()?.shortName ?? '—', icon: 'position' },
      { label: 'Organisation', value: this.organisation()?.name ?? '—', icon: 'organisations' },
    ];
  }

  childRows(): HierarchyChildTableRow[] {
    const sportId = this.sport()?.id;
    const governingBodyId = this.governingBody()?.id;
    const organisationId = this.organisation()?.id;
    const teamId = this.team()?.id;

    return this.participants().map((participant) => ({
      id: participant.id,
      title: `${participant.firstName} ${participant.lastName}`,
      subtitle: participant.position,
      values: {
        jersey: participant.jerseyNumber ? `#${participant.jerseyNumber}` : null,
        position: participant.position,
      },
      route:
        sportId && governingBodyId && organisationId && teamId
          ? `/sports/${sportId}/governing-bodies/${governingBodyId}/organisations/${organisationId}/teams/${teamId}/participants/${participant.id}`
          : undefined,
    }));
  }

  updateParticipantSearch(search: string): void {
    this.participantSearch.set(search);
    this.loadParticipants(1);
  }

  changeParticipantPage(page: number): void {
    this.loadParticipants(page);
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
          this.addDialogOpen.set(false);
          this.loadParticipants(1);
        },
        error: (error: HttpErrorResponse) =>
          this.addErrorMessage.set(
            error.error?.error?.message ?? 'Unable to add this participant. Please try again.',
          ),
      });
  }

  readonly childColumns: HierarchyChildTableColumn[] = [
    { key: 'jersey', label: 'Jersey' },
    { key: 'position', label: 'Position' },
  ];
  readonly addFields: HierarchyAddDialogField[] = [
    { controlName: 'firstName', label: 'First name', placeholder: 'e.g. Alex' },
    { controlName: 'lastName', label: 'Last name', placeholder: 'e.g. Morgan' },
    {
      controlName: 'jerseyNumber',
      label: 'Jersey number',
      type: 'number',
      placeholder: 'e.g. 10',
    },
    { controlName: 'position', label: 'Position', placeholder: 'e.g. Forward' },
  ];

  private loadParticipants(page: number): void {
    const team = this.team();

    if (!team) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.sportsService
      .searchParticipants(team.id, page, CHILD_PAGE_SIZE, this.participantSearch())
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.participants.set(response.data);
          this.participantMeta.set(response.meta);
        },
        error: () => this.errorMessage.set('Unable to load participants. Please try again.'),
      });
  }
}
