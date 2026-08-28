import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, forkJoin, map, of, switchMap, tap } from 'rxjs';

import { HierarchyAddDialogComponent, HierarchyAddDialogField } from '../../components/hierarchy-add-dialog/hierarchy-add-dialog.component';
import { HierarchyBreadcrumb } from '../../components/hierarchy-breadcrumbs/hierarchy-breadcrumbs.component';
import { HierarchyChildTableColumn, HierarchyChildTableRow } from '../../components/hierarchy-child-table/hierarchy-child-table.component';
import { HierarchyDetailComponent, HierarchyDetailMetadata } from '../../components/hierarchy-detail/hierarchy-detail.component';
import { OrganisationMembersComponent } from '../../components/organisation-members/organisation-members.component';
import { HierarchyStat } from '../../components/hierarchy-stat-cards/hierarchy-stat-cards.component';
import { GoverningBody, Organisation, OrganisationPayload, Participant, ParticipantPayload, Sport, Team } from '../../models/sport.model';
import { SportsService } from '../../services/sports.service';
import { ButtonComponent, DialogComponent } from '../../../../common/components/ui';
import { AuthService } from '../../../../core/auth/services/auth.service';

@Component({
  selector: 'app-organisation-detail',
  standalone: true,
  imports: [ButtonComponent, DialogComponent, HierarchyDetailComponent, HierarchyAddDialogComponent, OrganisationMembersComponent, ReactiveFormsModule],
  templateUrl: './organisation-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganisationDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sportsService = inject(SportsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly canManageHierarchy = this.authService.canManageOrganisationHierarchy;

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
  readonly organisationEditDialogOpen = signal(false);
  readonly participantEditDialogOpen = signal(false);
  readonly isSavingEdit = signal(false);
  readonly editErrorMessage = signal<string | null>(null);
  readonly editingParticipant = signal<Participant | null>(null);
  readonly deletingOrganisation = signal(false);
  readonly deletingParticipant = signal<Participant | null>(null);
  readonly isDeleting = signal(false);
  readonly deleteErrorMessage = signal<string | null>(null);
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
  readonly organisationEditForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    city: ['', [Validators.maxLength(100)]],
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
      { label: 'Sport', route: '/sports' },
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

  metadata(): HierarchyDetailMetadata[] {
    const organisation = this.organisation();

    if (!organisation) return [];

    return [
      { label: 'Created', value: this.formatDate(organisation.createdAt) },
      { label: 'Updated', value: this.formatDate(organisation.updatedAt) },
      { label: 'Onboarded', value: this.formatDate(organisation.onboardedAt) },
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

  openOrganisationEdit(): void {
    const organisation = this.organisation();
    if (!organisation) return;
    this.organisationEditForm.reset({ name: organisation.name, city: organisation.city ?? '' });
    this.editErrorMessage.set(null);
    this.organisationEditDialogOpen.set(true);
  }

  openParticipantEdit(row: HierarchyChildTableRow): void {
    const participant = this.participants().find((item) => item.id === row.id);
    if (!participant) return;
    this.editingParticipant.set(participant);
    this.participantForm.reset({ firstName: participant.firstName, lastName: participant.lastName, jerseyNumber: participant.jerseyNumber?.toString() ?? '', position: participant.position ?? '', teamId: participant.teamId });
    this.editErrorMessage.set(null);
    this.participantEditDialogOpen.set(true);
  }

  closeEditDialogs(): void {
    if (!this.isSavingEdit()) {
      this.organisationEditDialogOpen.set(false);
      this.participantEditDialogOpen.set(false);
      this.editingParticipant.set(null);
    }
  }

  saveOrganisationEdit(): void {
    const organisation = this.organisation();
    if (!organisation || this.organisationEditForm.invalid || this.isSavingEdit()) { this.organisationEditForm.markAllAsTouched(); return; }
    const { name, city } = this.organisationEditForm.getRawValue();
    const payload: OrganisationPayload = { name: name.trim(), ...(city.trim() ? { city: city.trim() } : {}), governingBodyId: organisation.governingBodyId };
    this.isSavingEdit.set(true);
    this.editErrorMessage.set(null);
    this.sportsService.updateOrganisation(organisation.id, payload).pipe(finalize(() => this.isSavingEdit.set(false))).subscribe({
      next: (updated) => { this.organisation.set(updated); this.organisationEditDialogOpen.set(false); },
      error: (error: HttpErrorResponse) => this.editErrorMessage.set(error.error?.error?.message ?? 'Unable to update this organisation. Please try again.'),
    });
  }

  saveParticipantEdit(): void {
    const participant = this.editingParticipant();
    if (!participant || this.participantForm.invalid || this.isSavingEdit()) { this.participantForm.markAllAsTouched(); return; }
    const { firstName, lastName, jerseyNumber, position, teamId } = this.participantForm.getRawValue();
    const selectedTeam = this.teams().find((team) => team.id === teamId);
    if (!selectedTeam) { this.editErrorMessage.set('Select a team for this participant.'); return; }
    const payload: ParticipantPayload = { firstName: firstName.trim(), lastName: lastName.trim(), ...(jerseyNumber.trim() ? { jerseyNumber: Number(jerseyNumber) } : {}), ...(position.trim() ? { position: position.trim() } : {}), teamId };
    this.isSavingEdit.set(true);
    this.editErrorMessage.set(null);
    this.sportsService.updateParticipant(participant.id, payload).pipe(finalize(() => this.isSavingEdit.set(false))).subscribe({
      next: (updated) => { this.participants.update((items) => items.map((item) => item.id === updated.id ? { ...item, ...updated, team: selectedTeam } : item)); this.closeEditDialogs(); },
      error: (error: HttpErrorResponse) => this.editErrorMessage.set(error.error?.error?.message ?? 'Unable to update this participant. Please try again.'),
    });
  }

  requestOrganisationDelete(): void { this.deleteErrorMessage.set(null); this.deletingOrganisation.set(true); }

  requestParticipantDelete(row: HierarchyChildTableRow): void {
    const participant = this.participants().find((item) => item.id === row.id);
    if (participant) { this.deleteErrorMessage.set(null); this.deletingParticipant.set(participant); }
  }

  cancelDelete(): void {
    if (!this.isDeleting()) { this.deletingOrganisation.set(false); this.deletingParticipant.set(null); this.deleteErrorMessage.set(null); }
  }

  deleteSelected(): void {
    const organisation = this.organisation();
    const participant = this.deletingParticipant();
    if (this.isDeleting() || (!organisation && !participant)) return;
    this.isDeleting.set(true);
    const request = participant ? this.sportsService.softDeleteParticipant(participant.id) : this.sportsService.softDeleteOrganisation(organisation!.id);
    request.pipe(finalize(() => this.isDeleting.set(false))).subscribe({
      next: () => {
        if (participant) { this.participants.update((items) => items.filter((item) => item.id !== participant.id)); this.deletingParticipant.set(null); }
        else { this.deletingOrganisation.set(false); void this.router.navigate(['/sports', this.sport()?.id, 'governing-bodies', this.governingBody()?.id]); }
      },
      error: (error: HttpErrorResponse) => this.deleteErrorMessage.set(error.error?.error?.message ?? 'Unable to delete this record. Please try again.'),
    });
  }

  deleteTargetName(): string { return this.deletingParticipant() ? `${this.deletingParticipant()!.firstName} ${this.deletingParticipant()!.lastName}` : this.organisation()?.name ?? 'this record'; }

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
  readonly organisationEditFields: HierarchyAddDialogField[] = [
    { controlName: 'name', label: 'Name', placeholder: 'e.g. Premier League' },
    { controlName: 'city', label: 'City', placeholder: 'e.g. London' },
  ];

  private formatDate(date: string | null | undefined): string {
    return date ? new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date)) : 'Not available';
  }
}
