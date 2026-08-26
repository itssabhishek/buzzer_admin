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
import { GoverningBody, Organisation, Sport } from '../../models/sport.model';
import { SportsService } from '../../services/sports.service';

@Component({
  selector: 'app-governing-body-detail',
  standalone: true,
  imports: [HierarchyDetailComponent, HierarchyAddDialogComponent, ReactiveFormsModule],
  templateUrl: './governing-body-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoverningBodyDetailComponent {
  private readonly route = inject(ActivatedRoute);
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
  readonly organisationForm = this.formBuilder.nonNullable.group({
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
      { label: 'Sports', route: '/sports' },
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
}
