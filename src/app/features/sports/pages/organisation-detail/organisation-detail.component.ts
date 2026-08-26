import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize, forkJoin, map, of, switchMap, tap } from 'rxjs';

import { HierarchyAddDialogComponent, HierarchyAddDialogField } from '../../components/hierarchy-add-dialog/hierarchy-add-dialog.component';
import { HierarchyBreadcrumb } from '../../components/hierarchy-breadcrumbs/hierarchy-breadcrumbs.component';
import { HierarchyChildTableColumn, HierarchyChildTableRow } from '../../components/hierarchy-child-table/hierarchy-child-table.component';
import { HierarchyDetailComponent } from '../../components/hierarchy-detail/hierarchy-detail.component';
import { OrganisationMembersComponent } from '../../components/organisation-members/organisation-members.component';
import { HierarchyStat } from '../../components/hierarchy-stat-cards/hierarchy-stat-cards.component';
import { GoverningBody, Organisation, Participant, Sport, Team } from '../../models/sport.model';
import { SportsService } from '../../services/sports.service';

@Component({
  selector: 'app-organisation-detail',
  standalone: true,
  imports: [HierarchyDetailComponent, HierarchyAddDialogComponent, OrganisationMembersComponent, ReactiveFormsModule],
  templateUrl: './organisation-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganisationDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly sportsService = inject(SportsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);

  readonly sport = signal<Sport | null>(null);
  readonly governingBody = signal<GoverningBody | null>(null);
  readonly organisation = signal<Organisation | null>(null);
  readonly teams = signal<Team[]>([]);
  readonly participants = signal<Participant[]>([]);
  readonly staffCount = signal(0);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly addTeamDialogOpen = signal(false);
  readonly isAddingTeam = signal(false);
  readonly addTeamErrorMessage = signal<string | null>(null);
  readonly addDialogOpen = signal(false);
  readonly isAdding = signal(false);
  readonly addErrorMessage = signal<string | null>(null);
  readonly participantForm = this.formBuilder.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    jerseyNumber: [''],
    position: ['', [Validators.maxLength(100)]],
    teamId: ['', Validators.required],
  });
  readonly teamForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    shortName: ['', [Validators.maxLength(20)]],
  });

  constructor() {
    this.route.paramMap
      .pipe(
        tap(() => {
          this.isLoading.set(true);
          this.errorMessage.set(null);
        }),
        switchMap((params) =>
          this.sportsService.getOrganisation(params.get('organisationId') ?? '').pipe(
            switchMap((organisation) =>
              this.sportsService.getGoverningBody(organisation.governingBodyId).pipe(
                switchMap((governingBody) =>
                  forkJoin({
                    organisation: of(organisation),
                    governingBody: of(governingBody),
                    sport: this.sportsService.getSport(governingBody.sportId),
                    teams: this.sportsService.listTeams(organisation.id),
                    organisationSummaries: this.sportsService.listOrganisations(governingBody.id),
                  }).pipe(
                    switchMap(({ organisation: currentOrganisation, governingBody: currentGoverningBody, sport, teams, organisationSummaries }) =>
                      (teams.length ? forkJoin(teams.map((team) => this.sportsService.listParticipants(team.id))) : of([])).pipe(
                        map((participantGroups) => ({
                          organisation: currentOrganisation,
                          governingBody: currentGoverningBody,
                          sport,
                          teams,
                          organisationSummaries,
                          participants: participantGroups.flat(),
                        })),
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
        next: ({ organisation, governingBody, sport, teams, organisationSummaries, participants }) => {
          this.organisation.set(organisation);
          this.governingBody.set(governingBody);
          this.sport.set(sport);
          this.teams.set(teams);
          this.participants.set(participants);
          this.staffCount.set(organisationSummaries.find((summary) => summary.id === organisation.id)?.staffCount ?? 0);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.errorMessage.set('Unable to load this organisation. Please try again.');
        },
      });
  }

  breadcrumbs(): HierarchyBreadcrumb[] {
    const sport = this.sport();
    const body = this.governingBody();
    return [
      { label: 'Sports', route: '/sports' },
      ...(sport ? [{ label: sport.name, route: `/sports/${sport.id}` }] : []),
      ...(sport && body ? [{ label: body.name, route: `/sports/${sport.id}/governing-bodies/${body.id}` }] : []),
      { label: this.organisation()?.name ?? 'Organisation' },
    ];
  }

  stats(): HierarchyStat[] {
    return [
      { label: 'Teams', value: this.teams().length, icon: 'teams' },
      { label: 'Participants', value: this.participants().length, icon: 'participants' },
      { label: 'Staff', value: this.staffCount(), icon: 'organisations' },
    ];
  }

  childRows(): HierarchyChildTableRow[] {
    const sportId = this.sport()?.id;
    const governingBodyId = this.governingBody()?.id;
    const organisationId = this.organisation()?.id;
    return this.participants().map((participant) => ({
      id: participant.id,
      title: `${participant.firstName} ${participant.lastName}`,
      subtitle: participant.team?.name ?? null,
      values: { team: participant.team?.name, jersey: participant.jerseyNumber ? `#${participant.jerseyNumber}` : null, position: participant.position },
      route: sportId && governingBodyId && organisationId ? `/sports/${sportId}/governing-bodies/${governingBodyId}/organisations/${organisationId}/participants/${participant.id}` : undefined,
    }));
  }

  openAddDialog(): void {
    if (!this.teams().length) {
      this.openAddTeamDialog();
      return;
    }

    const defaultTeamId = this.teams()[0]?.id ?? '';
    this.participantForm.reset({ firstName: '', lastName: '', jerseyNumber: '', position: '', teamId: defaultTeamId });
    this.addErrorMessage.set(this.teams().length ? null : 'Create a team for this organisation before adding a participant.');
    this.addDialogOpen.set(true);
  }

  openAddTeamDialog(): void {
    this.teamForm.reset({ name: '', shortName: '' });
    this.addTeamErrorMessage.set(null);
    this.addTeamDialogOpen.set(true);
  }

  closeAddTeamDialog(): void {
    if (!this.isAddingTeam()) {
      this.addTeamDialogOpen.set(false);
    }
  }

  addTeam(): void {
    const organisation = this.organisation();
    if (!organisation || this.teamForm.invalid || this.isAddingTeam()) {
      this.teamForm.markAllAsTouched();
      return;
    }

    const { name, shortName } = this.teamForm.getRawValue();
    this.isAddingTeam.set(true);
    this.addTeamErrorMessage.set(null);
    this.sportsService
      .createTeam({ name: name.trim(), ...(shortName.trim() ? { shortName: shortName.trim() } : {}), organizationId: organisation.id })
      .pipe(finalize(() => this.isAddingTeam.set(false)))
      .subscribe({
        next: (team) => {
          this.teams.update((teams) => [...teams, { ...team, participantCount: 0 }]);
          this.addTeamDialogOpen.set(false);
        },
        error: (error: HttpErrorResponse) => this.addTeamErrorMessage.set(error.error?.error?.message ?? 'Unable to add this team. Please try again.'),
      });
  }

  closeAddDialog(): void {
    if (!this.isAdding()) {
      this.addDialogOpen.set(false);
    }
  }

  addParticipant(): void {
    if (this.participantForm.invalid || this.isAdding()) {
      this.participantForm.markAllAsTouched();
      return;
    }

    const { firstName, lastName, jerseyNumber, position, teamId } = this.participantForm.getRawValue();
    const team = this.teams().find((currentTeam) => currentTeam.id === teamId);
    if (!team) {
      this.addErrorMessage.set('Select a team for this participant.');
      return;
    }

    const jerseyValue = Number(jerseyNumber);
    this.isAdding.set(true);
    this.addErrorMessage.set(null);
    this.sportsService
      .createParticipant({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(jerseyNumber.trim() ? { jerseyNumber: jerseyValue } : {}),
        ...(position.trim() ? { position: position.trim() } : {}),
        teamId,
      })
      .pipe(finalize(() => this.isAdding.set(false)))
      .subscribe({
        next: (participant) => {
          this.participants.update((participants) => [...participants, { ...participant, team }]);
          this.addDialogOpen.set(false);
        },
        error: (error: HttpErrorResponse) => this.addErrorMessage.set(error.error?.error?.message ?? 'Unable to add this participant. Please try again.'),
      });
  }

  readonly childColumns: HierarchyChildTableColumn[] = [
    { key: 'team', label: 'Team' },
    { key: 'jersey', label: 'Jersey' },
    { key: 'position', label: 'Position' },
  ];

  addFields(): HierarchyAddDialogField[] {
    return [
      { controlName: 'firstName', label: 'First name', placeholder: 'e.g. Alex' },
      { controlName: 'lastName', label: 'Last name', placeholder: 'e.g. Morgan' },
      { controlName: 'jerseyNumber', label: 'Jersey number', type: 'number', placeholder: 'e.g. 10' },
      { controlName: 'position', label: 'Position', placeholder: 'e.g. Forward' },
      { controlName: 'teamId', label: 'Team', type: 'select', options: this.teams().map((team) => ({ label: team.name, value: team.id })) },
    ];
  }

  readonly teamAddFields: HierarchyAddDialogField[] = [
    { controlName: 'name', label: 'Name', placeholder: 'e.g. Buzzer United' },
    { controlName: 'shortName', label: 'Short name', placeholder: 'e.g. BZU' },
  ];
}
