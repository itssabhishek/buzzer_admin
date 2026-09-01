import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
import {
  HierarchyDetailComponent,
  HierarchyDetailMetadata,
} from '../../components/hierarchy-detail/hierarchy-detail.component';
import { OrganisationMembersComponent } from '../../components/organisation-members/organisation-members.component';
import { HierarchyStat } from '../../components/hierarchy-stat-cards/hierarchy-stat-cards.component';
import {
  GoverningBody,
  Organisation,
  OrganisationPayload,
  PaginationMeta,
  Sport,
  Team,
} from '../../models/sport.model';
import { SportsService } from '../../services/sports.service';
import { ButtonComponent, DialogComponent } from '../../../../common/components/ui';
import { AuthService } from '../../../../core/auth/services/auth.service';

const CHILD_PAGE_SIZE = 10;
const EMPTY_META: PaginationMeta = { page: 1, limit: CHILD_PAGE_SIZE, total: 0, totalPages: 1 };

@Component({
  selector: 'app-organisation-detail',
  standalone: true,
  imports: [
    ButtonComponent,
    DialogComponent,
    HierarchyDetailComponent,
    HierarchyAddDialogComponent,
    OrganisationMembersComponent,
    ReactiveFormsModule,
  ],
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
  readonly teamMeta = signal<PaginationMeta>(EMPTY_META);
  readonly teamSearch = signal('');
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly addTeamDialogOpen = signal(false);
  readonly isAddingTeam = signal(false);
  readonly addTeamErrorMessage = signal<string | null>(null);
  readonly organisationEditDialogOpen = signal(false);
  readonly isSavingEdit = signal(false);
  readonly editErrorMessage = signal<string | null>(null);
  readonly deletingOrganisation = signal(false);
  readonly isDeleting = signal(false);
  readonly deleteErrorMessage = signal<string | null>(null);
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
                    teams: this.sportsService.searchTeams(organisation.id, 1, CHILD_PAGE_SIZE),
                  }),
                ),
              ),
            ),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ organisation, governingBody, sport, teams }) => {
          this.organisation.set(organisation);
          this.governingBody.set(governingBody);
          this.sport.set(sport);
          this.teams.set(teams.data);
          this.teamMeta.set(teams.meta);
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
    const governingBody = this.governingBody();

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
      { label: this.organisation()?.name ?? 'Organisation' },
    ];
  }

  stats(): HierarchyStat[] {
    const organisation = this.organisation();

    return [
      { label: 'Teams', value: this.teamMeta().total, icon: 'teams' },
      { label: 'Participants', value: organisation?.participantCount ?? 0, icon: 'participants' },
      { label: 'Staff', value: organisation?.staffCount ?? 0, icon: 'organisations' },
    ];
  }

  metadata(): HierarchyDetailMetadata[] {
    const organisation = this.organisation();

    if (!organisation) {
      return [];
    }

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

    return this.teams().map((team) => ({
      id: team.id,
      title: team.name,
      subtitle: team.shortName,
      values: { shortName: team.shortName, participants: team.participantCount },
      route:
        sportId && governingBodyId && organisationId
          ? `/sports/${sportId}/governing-bodies/${governingBodyId}/organisations/${organisationId}/teams/${team.id}`
          : undefined,
    }));
  }

  updateTeamSearch(search: string): void {
    this.teamSearch.set(search);
    this.loadTeams(1);
  }

  changeTeamPage(page: number): void {
    this.loadTeams(page);
  }

  openOrganisationEdit(): void {
    const organisation = this.organisation();

    if (!organisation) {
      return;
    }

    this.organisationEditForm.reset({ name: organisation.name, city: organisation.city ?? '' });
    this.editErrorMessage.set(null);
    this.organisationEditDialogOpen.set(true);
  }

  closeOrganisationEdit(): void {
    if (!this.isSavingEdit()) {
      this.organisationEditDialogOpen.set(false);
    }
  }

  saveOrganisationEdit(): void {
    const organisation = this.organisation();

    if (!organisation || this.organisationEditForm.invalid || this.isSavingEdit()) {
      this.organisationEditForm.markAllAsTouched();
      return;
    }

    const { name, city } = this.organisationEditForm.getRawValue();
    const payload: OrganisationPayload = {
      name: name.trim(),
      ...(city.trim() ? { city: city.trim() } : {}),
      governingBodyId: organisation.governingBodyId,
    };
    this.isSavingEdit.set(true);
    this.editErrorMessage.set(null);
    this.sportsService
      .updateOrganisation(organisation.id, payload)
      .pipe(finalize(() => this.isSavingEdit.set(false)))
      .subscribe({
        next: (updated) => {
          this.organisation.set(updated);
          this.organisationEditDialogOpen.set(false);
        },
        error: (error: HttpErrorResponse) =>
          this.editErrorMessage.set(
            error.error?.error?.message ?? 'Unable to update this organisation. Please try again.',
          ),
      });
  }

  requestOrganisationDelete(): void {
    this.deleteErrorMessage.set(null);
    this.deletingOrganisation.set(true);
  }

  cancelDelete(): void {
    if (!this.isDeleting()) {
      this.deletingOrganisation.set(false);
      this.deleteErrorMessage.set(null);
    }
  }

  deleteOrganisation(): void {
    const organisation = this.organisation();

    if (!organisation || this.isDeleting()) {
      return;
    }

    this.isDeleting.set(true);
    this.sportsService
      .softDeleteOrganisation(organisation.id)
      .pipe(finalize(() => this.isDeleting.set(false)))
      .subscribe({
        next: () => {
          this.deletingOrganisation.set(false);
          void this.router.navigate([
            '/sports',
            this.sport()?.id,
            'governing-bodies',
            this.governingBody()?.id,
          ]);
        },
        error: (error: HttpErrorResponse) =>
          this.deleteErrorMessage.set(
            error.error?.error?.message ?? 'Unable to delete this organisation. Please try again.',
          ),
      });
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
      .createTeam({
        name: name.trim(),
        ...(shortName.trim() ? { shortName: shortName.trim() } : {}),
        organizationId: organisation.id,
      })
      .pipe(finalize(() => this.isAddingTeam.set(false)))
      .subscribe({
        next: () => {
          this.addTeamDialogOpen.set(false);
          this.loadTeams(1);
        },
        error: (error: HttpErrorResponse) =>
          this.addTeamErrorMessage.set(
            error.error?.error?.message ?? 'Unable to add this team. Please try again.',
          ),
      });
  }

  readonly childColumns: HierarchyChildTableColumn[] = [
    { key: 'shortName', label: 'Short name' },
    { key: 'participants', label: 'Participants' },
  ];
  readonly teamAddFields: HierarchyAddDialogField[] = [
    { controlName: 'name', label: 'Name', placeholder: 'e.g. Buzzer United' },
    { controlName: 'shortName', label: 'Short name', placeholder: 'e.g. BZU' },
  ];
  readonly organisationEditFields: HierarchyAddDialogField[] = [
    { controlName: 'name', label: 'Name', placeholder: 'e.g. Premier League' },
    { controlName: 'city', label: 'City', placeholder: 'e.g. London' },
  ];

  private loadTeams(page: number): void {
    const organisation = this.organisation();

    if (!organisation) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.sportsService
      .searchTeams(organisation.id, page, CHILD_PAGE_SIZE, this.teamSearch())
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.teams.set(response.data);
          this.teamMeta.set(response.meta);
        },
        error: () => this.errorMessage.set('Unable to load teams. Please try again.'),
      });
  }

  private formatDate(date: string | null | undefined): string {
    return date
      ? new Intl.DateTimeFormat('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(date))
      : 'Not available';
  }
}
