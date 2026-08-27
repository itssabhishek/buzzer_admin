import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, forkJoin, of, switchMap, tap } from 'rxjs';

import { HierarchyAddDialogComponent, HierarchyAddDialogField } from '../../components/hierarchy-add-dialog/hierarchy-add-dialog.component';
import { HierarchyBreadcrumb } from '../../components/hierarchy-breadcrumbs/hierarchy-breadcrumbs.component';
import { HierarchyChildTableColumn, HierarchyChildTableRow } from '../../components/hierarchy-child-table/hierarchy-child-table.component';
import { HierarchyDetailComponent, HierarchyDetailMetadata } from '../../components/hierarchy-detail/hierarchy-detail.component';
import { HierarchyStat } from '../../components/hierarchy-stat-cards/hierarchy-stat-cards.component';
import { GoverningBody, GoverningBodyPayload, Organisation, OrganisationPayload, Sport } from '../../models/sport.model';
import { SportsService } from '../../services/sports.service';
import { ButtonComponent, DialogComponent } from '../../../../common/components/ui';

@Component({
  selector: 'app-governing-body-detail',
  standalone: true,
  imports: [ButtonComponent, DialogComponent, HierarchyDetailComponent, HierarchyAddDialogComponent, ReactiveFormsModule],
  templateUrl: './governing-body-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoverningBodyDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sportsService = inject(SportsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);

  readonly sport = signal<Sport | null>(null);
  readonly governingBody = signal<GoverningBody | null>(null);
  readonly organisations = signal<Organisation[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly addDialogOpen = signal(false);
  readonly isAdding = signal(false);
  readonly addErrorMessage = signal<string | null>(null);
  readonly governingBodyEditDialogOpen = signal(false);
  readonly organisationEditDialogOpen = signal(false);
  readonly isSavingEdit = signal(false);
  readonly editErrorMessage = signal<string | null>(null);
  readonly editingOrganisation = signal<Organisation | null>(null);
  readonly deletingGoverningBody = signal(false);
  readonly deletingOrganisation = signal<Organisation | null>(null);
  readonly isDeleting = signal(false);
  readonly deleteErrorMessage = signal<string | null>(null);
  readonly organisationForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    city: ['', [Validators.maxLength(100)]],
  });
  readonly governingBodyForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    country: ['', [Validators.maxLength(100)]],
  });

  constructor() {
    this.route.paramMap
      .pipe(
        tap(() => {
          this.isLoading.set(true);
          this.errorMessage.set(null);
        }),
        switchMap((params) =>
          this.sportsService.getGoverningBody(params.get('governingBodyId') ?? '').pipe(
            switchMap((governingBody) =>
              forkJoin({
                governingBody: of(governingBody),
                sport: this.sportsService.getSport(governingBody.sportId),
                organisations: this.sportsService.listOrganisations(governingBody.id),
              }),
            ),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ governingBody, sport, organisations }) => {
          this.governingBody.set(governingBody);
          this.sport.set(sport);
          this.organisations.set(organisations);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.errorMessage.set('Unable to load this governing body. Please try again.');
        },
      });
  }

  breadcrumbs(): HierarchyBreadcrumb[] {
    const sport = this.sport();
    return [
      { label: 'Sport', route: '/sports' },
      ...(sport ? [{ label: sport.name, route: `/sports/${sport.id}` }] : []),
      { label: this.governingBody()?.name ?? 'Governing body' },
    ];
  }

  stats(): HierarchyStat[] {
    const organisations = this.organisations();
    return [
      { label: 'Organisations', value: organisations.length, icon: 'organisations' },
      { label: 'Teams', value: organisations.reduce((total, organisation) => total + organisation.teamCount, 0), icon: 'teams' },
      { label: 'Participants', value: organisations.reduce((total, organisation) => total + organisation.participantCount, 0), icon: 'participants' },
    ];
  }

  metadata(): HierarchyDetailMetadata[] {
    const governingBody = this.governingBody();

    if (!governingBody) return [];

    return [
      { label: 'Created', value: this.formatDate(governingBody.createdAt) },
      { label: 'Updated', value: this.formatDate(governingBody.updatedAt) },
      { label: 'Onboarded', value: this.formatDate(governingBody.onboardedAt) },
    ];
  }

  childRows(): HierarchyChildTableRow[] {
    const sportId = this.sport()?.id;
    const governingBodyId = this.governingBody()?.id;
    return this.organisations().map((organisation) => ({
      id: organisation.id,
      title: organisation.name,
      subtitle: organisation.city,
      values: { city: organisation.city, teams: organisation.teamCount, participants: organisation.participantCount },
      route: sportId && governingBodyId ? `/sports/${sportId}/governing-bodies/${governingBodyId}/organisations/${organisation.id}` : undefined,
    }));
  }

  openAddDialog(): void {
    this.organisationForm.reset({ name: '', city: '' });
    this.addErrorMessage.set(null);
    this.addDialogOpen.set(true);
  }

  openGoverningBodyEdit(): void {
    const body = this.governingBody();
    if (!body) return;
    this.governingBodyForm.reset({ name: body.name, country: body.country ?? '' });
    this.editErrorMessage.set(null);
    this.governingBodyEditDialogOpen.set(true);
  }

  openOrganisationEdit(row: HierarchyChildTableRow): void {
    const organisation = this.organisations().find((item) => item.id === row.id);
    if (!organisation) return;
    this.editingOrganisation.set(organisation);
    this.organisationForm.reset({ name: organisation.name, city: organisation.city ?? '' });
    this.editErrorMessage.set(null);
    this.organisationEditDialogOpen.set(true);
  }

  closeEditDialogs(): void {
    if (!this.isSavingEdit()) {
      this.governingBodyEditDialogOpen.set(false);
      this.organisationEditDialogOpen.set(false);
      this.editingOrganisation.set(null);
    }
  }

  saveGoverningBodyEdit(): void {
    const body = this.governingBody();
    if (!body || this.governingBodyForm.invalid || this.isSavingEdit()) {
      this.governingBodyForm.markAllAsTouched();
      return;
    }
    const { name, country } = this.governingBodyForm.getRawValue();
    const payload: GoverningBodyPayload = { name: name.trim(), ...(country.trim() ? { country: country.trim() } : {}), sportId: body.sportId };
    this.isSavingEdit.set(true);
    this.editErrorMessage.set(null);
    this.sportsService.updateGoverningBody(body.id, payload).pipe(finalize(() => this.isSavingEdit.set(false))).subscribe({
      next: (updated) => { this.governingBody.set(updated); this.governingBodyEditDialogOpen.set(false); },
      error: (error: HttpErrorResponse) => this.editErrorMessage.set(error.error?.error?.message ?? 'Unable to update this governing body. Please try again.'),
    });
  }

  saveOrganisationEdit(): void {
    const organisation = this.editingOrganisation();
    if (!organisation || this.organisationForm.invalid || this.isSavingEdit()) {
      this.organisationForm.markAllAsTouched();
      return;
    }
    const { name, city } = this.organisationForm.getRawValue();
    const payload: OrganisationPayload = { name: name.trim(), ...(city.trim() ? { city: city.trim() } : {}), governingBodyId: organisation.governingBodyId };
    this.isSavingEdit.set(true);
    this.editErrorMessage.set(null);
    this.sportsService.updateOrganisation(organisation.id, payload).pipe(finalize(() => this.isSavingEdit.set(false))).subscribe({
      next: (updated) => { this.organisations.update((items) => items.map((item) => item.id === updated.id ? { ...item, ...updated } : item)); this.closeEditDialogs(); },
      error: (error: HttpErrorResponse) => this.editErrorMessage.set(error.error?.error?.message ?? 'Unable to update this organisation. Please try again.'),
    });
  }

  requestGoverningBodyDelete(): void { this.deleteErrorMessage.set(null); this.deletingGoverningBody.set(true); }

  requestOrganisationDelete(row: HierarchyChildTableRow): void {
    const organisation = this.organisations().find((item) => item.id === row.id);
    if (organisation) { this.deleteErrorMessage.set(null); this.deletingOrganisation.set(organisation); }
  }

  cancelDelete(): void {
    if (!this.isDeleting()) { this.deletingGoverningBody.set(false); this.deletingOrganisation.set(null); this.deleteErrorMessage.set(null); }
  }

  deleteSelected(): void {
    const body = this.governingBody();
    const organisation = this.deletingOrganisation();
    if (this.isDeleting() || (!body && !organisation)) return;
    this.isDeleting.set(true);
    const request = organisation ? this.sportsService.softDeleteOrganisation(organisation.id) : this.sportsService.softDeleteGoverningBody(body!.id);
    request.pipe(finalize(() => this.isDeleting.set(false))).subscribe({
      next: () => {
        if (organisation) { this.organisations.update((items) => items.filter((item) => item.id !== organisation.id)); this.deletingOrganisation.set(null); }
        else { this.deletingGoverningBody.set(false); void this.router.navigate(['/sports', body!.sportId]); }
      },
      error: (error: HttpErrorResponse) => this.deleteErrorMessage.set(error.error?.error?.message ?? 'Unable to delete this record. Please try again.'),
    });
  }

  deleteTargetName(): string { return this.deletingOrganisation()?.name ?? this.governingBody()?.name ?? 'this record'; }

  closeAddDialog(): void {
    if (!this.isAdding()) {
      this.addDialogOpen.set(false);
    }
  }

  addOrganisation(): void {
    const governingBody = this.governingBody();
    if (!governingBody || this.organisationForm.invalid || this.isAdding()) {
      this.organisationForm.markAllAsTouched();
      return;
    }

    const { name, city } = this.organisationForm.getRawValue();
    this.isAdding.set(true);
    this.addErrorMessage.set(null);
    this.sportsService
      .createOrganisation({ name: name.trim(), ...(city.trim() ? { city: city.trim() } : {}), governingBodyId: governingBody.id })
      .pipe(finalize(() => this.isAdding.set(false)))
      .subscribe({
        next: (organisation) => {
          this.organisations.update((organisations) => [...organisations, { ...organisation, teamCount: 0, participantCount: 0, squadCount: 0, staffCount: 0 }]);
          this.addDialogOpen.set(false);
        },
        error: (error: HttpErrorResponse) => this.addErrorMessage.set(error.error?.error?.message ?? 'Unable to add this organisation. Please try again.'),
      });
  }

  readonly childColumns: HierarchyChildTableColumn[] = [
    { key: 'city', label: 'City' },
    { key: 'teams', label: 'Teams' },
    { key: 'participants', label: 'Participants' },
  ];
  readonly addFields: HierarchyAddDialogField[] = [
    { controlName: 'name', label: 'Name', placeholder: 'e.g. Premier League' },
    { controlName: 'city', label: 'City', placeholder: 'e.g. London' },
  ];
  readonly governingBodyEditFields: HierarchyAddDialogField[] = [
    { controlName: 'name', label: 'Name', placeholder: 'e.g. UEFA' },
    { controlName: 'country', label: 'Country', placeholder: 'e.g. Switzerland' },
  ];

  private formatDate(date: string | null | undefined): string {
    return date ? new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date)) : 'Not available';
  }
}
