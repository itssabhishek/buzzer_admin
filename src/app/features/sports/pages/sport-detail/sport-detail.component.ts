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
import { GoverningBody, Sport } from '../../models/sport.model';
import { SportsService } from '../../services/sports.service';

@Component({
  selector: 'app-sport-detail',
  standalone: true,
  imports: [HierarchyDetailComponent, HierarchyAddDialogComponent, ReactiveFormsModule],
  templateUrl: './sport-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SportDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly sportsService = inject(SportsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);

  readonly sport = signal<Sport | null>(null);
  readonly governingBodies = signal<GoverningBody[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly addDialogOpen = signal(false);
  readonly isAdding = signal(false);
  readonly addErrorMessage = signal<string | null>(null);
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
          this.sportsService.getSport(params.get('sportId') ?? '').pipe(
            switchMap((sport) =>
              forkJoin({ sport: of(sport), governingBodies: this.sportsService.listGoverningBodies(sport.id) }),
            ),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ sport, governingBodies }) => {
          this.sport.set(sport);
          this.governingBodies.set(governingBodies);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.errorMessage.set('Unable to load this sport. Please return to the catalogue and try again.');
        },
      });
  }

  breadcrumbs(): HierarchyBreadcrumb[] {
    return [{ label: 'Sports', route: '/sports' }, { label: this.sport()?.name ?? 'Sport' }];
  }

  stats(): HierarchyStat[] {
    const governingBodies = this.governingBodies();
    return [
      { label: 'Governing bodies', value: governingBodies.length, icon: 'governing-bodies' },
      { label: 'Organisations', value: governingBodies.reduce((total, body) => total + body.organizationCount, 0), icon: 'organisations' },
      { label: 'Participants', value: governingBodies.reduce((total, body) => total + body.participantCount, 0), icon: 'participants' },
    ];
  }

  childRows(): HierarchyChildTableRow[] {
    const sportId = this.sport()?.id;
    return this.governingBodies().map((body) => ({
      id: body.id,
      title: body.name,
      subtitle: body.country,
      values: { country: body.country, organisations: body.organizationCount, participants: body.participantCount },
      route: sportId ? `/sports/${sportId}/governing-bodies/${body.id}` : undefined,
    }));
  }

  openAddDialog(): void {
    this.governingBodyForm.reset({ name: '', country: '' });
    this.addErrorMessage.set(null);
    this.addDialogOpen.set(true);
  }

  closeAddDialog(): void {
    if (!this.isAdding()) {
      this.addDialogOpen.set(false);
    }
  }

  addGoverningBody(): void {
    const sport = this.sport();
    if (!sport || this.governingBodyForm.invalid || this.isAdding()) {
      this.governingBodyForm.markAllAsTouched();
      return;
    }

    const { name, country } = this.governingBodyForm.getRawValue();
    this.isAdding.set(true);
    this.addErrorMessage.set(null);
    this.sportsService
      .createGoverningBody({ name: name.trim(), ...(country.trim() ? { country: country.trim() } : {}), sportId: sport.id })
      .pipe(finalize(() => this.isAdding.set(false)))
      .subscribe({
        next: (body) => {
          this.governingBodies.update((bodies) => [...bodies, { ...body, organizationCount: 0, teamCount: 0, participantCount: 0 }]);
          this.addDialogOpen.set(false);
        },
        error: (error: HttpErrorResponse) => this.addErrorMessage.set(error.error?.error?.message ?? 'Unable to add this governing body. Please try again.'),
      });
  }

  readonly childColumns: HierarchyChildTableColumn[] = [
    { key: 'country', label: 'Country' },
    { key: 'organisations', label: 'Organisations' },
    { key: 'participants', label: 'Participants' },
  ];
  readonly addFields: HierarchyAddDialogField[] = [
    { controlName: 'name', label: 'Name', placeholder: 'e.g. National Football Association' },
    { controlName: 'country', label: 'Country', placeholder: 'e.g. India' },
  ];
}
