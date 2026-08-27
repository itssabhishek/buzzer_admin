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
import { ButtonComponent, DialogComponent } from '../../../../common/components/ui';
import { GoverningBody, GoverningBodyPayload, Sport, SportPayload } from '../../models/sport.model';
import { SportsService } from '../../services/sports.service';

@Component({
  selector: 'app-sport-detail',
  standalone: true,
  imports: [ButtonComponent, DialogComponent, HierarchyDetailComponent, HierarchyAddDialogComponent, ReactiveFormsModule],
  templateUrl: './sport-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SportDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
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
  readonly sportEditDialogOpen = signal(false);
  readonly isSavingSport = signal(false);
  readonly sportEditErrorMessage = signal<string | null>(null);
  readonly governingBodyEditDialogOpen = signal(false);
  readonly editingGoverningBody = signal<GoverningBody | null>(null);
  readonly isSavingGoverningBody = signal(false);
  readonly governingBodyEditErrorMessage = signal<string | null>(null);
  readonly deletingSport = signal(false);
  readonly deletingGoverningBody = signal<GoverningBody | null>(null);
  readonly isDeleting = signal(false);
  readonly deleteErrorMessage = signal<string | null>(null);
  readonly governingBodyForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    country: ['', [Validators.maxLength(100)]],
  });
  readonly sportEditForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(500)]],
    iconUrl: ['', [Validators.pattern(/^https?:\/\/.+/i)]],
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
    return [{ label: 'Sport', route: '/sports' }, { label: this.sport()?.name ?? 'Sport' }];
  }

  stats(): HierarchyStat[] {
    const governingBodies = this.governingBodies();
    return [
      { label: 'Main entities', value: governingBodies.length, icon: 'governing-bodies' },
      { label: 'Competitions', value: governingBodies.reduce((total, body) => total + body.organizationCount, 0), icon: 'organisations' },
      { label: 'Participants', value: governingBodies.reduce((total, body) => total + body.participantCount, 0), icon: 'participants' },
    ];
  }

  metadata(): HierarchyDetailMetadata[] {
    const sport = this.sport();

    if (!sport) {
      return [];
    }

    return [
      { label: 'Created', value: this.formatDate(sport.createdAt) },
      { label: 'Updated', value: this.formatDate(sport.updatedAt) },
      { label: 'Onboarded', value: this.formatDate(sport.onboardedAt) },
    ];
  }

  childRows(): HierarchyChildTableRow[] {
    const sportId = this.sport()?.id;
    return this.governingBodies().map((body) => ({
      id: body.id,
      title: body.name,
      subtitle: body.country,
      values: { competitions: body.organizationCount, participants: body.participantCount },
      route: sportId ? `/sports/${sportId}/governing-bodies/${body.id}` : undefined,
    }));
  }

  openAddDialog(): void {
    this.governingBodyForm.reset({ name: '', country: '' });
    this.addErrorMessage.set(null);
    this.addDialogOpen.set(true);
  }

  openSportEdit(): void {
    const sport = this.sport();

    if (!sport) {
      return;
    }

    this.sportEditForm.reset({ name: sport.name, description: sport.description ?? '', iconUrl: sport.iconUrl ?? '' });
    this.sportEditErrorMessage.set(null);
    this.sportEditDialogOpen.set(true);
  }

  closeSportEdit(): void {
    if (!this.isSavingSport()) {
      this.sportEditDialogOpen.set(false);
    }
  }

  saveSportEdit(): void {
    const sport = this.sport();

    if (!sport || this.sportEditForm.invalid || this.isSavingSport()) {
      this.sportEditForm.markAllAsTouched();
      return;
    }

    const { name, description, iconUrl } = this.sportEditForm.getRawValue();
    const payload: SportPayload = {
      name: name.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(iconUrl.trim() ? { iconUrl: iconUrl.trim() } : {}),
    };

    this.isSavingSport.set(true);
    this.sportEditErrorMessage.set(null);
    this.sportsService.update(sport.id, payload).pipe(finalize(() => this.isSavingSport.set(false))).subscribe({
      next: (updatedSport) => {
        this.sport.set(updatedSport);
        this.sportEditDialogOpen.set(false);
      },
      error: (error: HttpErrorResponse) => this.sportEditErrorMessage.set(error.error?.error?.message ?? 'Unable to update this sport. Please try again.'),
    });
  }

  requestSportDelete(): void {
    this.deleteErrorMessage.set(null);
    this.deletingSport.set(true);
  }

  openGoverningBodyEdit(row: HierarchyChildTableRow): void {
    const body = this.governingBodies().find((currentBody) => currentBody.id === row.id);

    if (!body) {
      return;
    }

    this.editingGoverningBody.set(body);
    this.governingBodyForm.reset({ name: body.name, country: body.country ?? '' });
    this.governingBodyEditErrorMessage.set(null);
    this.governingBodyEditDialogOpen.set(true);
  }

  closeGoverningBodyEdit(): void {
    if (!this.isSavingGoverningBody()) {
      this.governingBodyEditDialogOpen.set(false);
      this.editingGoverningBody.set(null);
    }
  }

  saveGoverningBodyEdit(): void {
    const governingBody = this.editingGoverningBody();

    if (!governingBody || this.governingBodyForm.invalid || this.isSavingGoverningBody()) {
      this.governingBodyForm.markAllAsTouched();
      return;
    }

    const { name, country } = this.governingBodyForm.getRawValue();
    const payload: GoverningBodyPayload = {
      name: name.trim(),
      ...(country.trim() ? { country: country.trim() } : {}),
      sportId: governingBody.sportId,
    };

    this.isSavingGoverningBody.set(true);
    this.governingBodyEditErrorMessage.set(null);
    this.sportsService.updateGoverningBody(governingBody.id, payload).pipe(finalize(() => this.isSavingGoverningBody.set(false))).subscribe({
      next: (updatedBody) => {
        this.governingBodies.update((bodies) => bodies.map((body) => body.id === updatedBody.id ? { ...body, ...updatedBody } : body));
        this.governingBodyEditDialogOpen.set(false);
        this.editingGoverningBody.set(null);
      },
      error: (error: HttpErrorResponse) => this.governingBodyEditErrorMessage.set(error.error?.error?.message ?? 'Unable to update this governing body. Please try again.'),
    });
  }

  requestGoverningBodyDelete(row: HierarchyChildTableRow): void {
    const body = this.governingBodies().find((currentBody) => currentBody.id === row.id);

    if (body) {
      this.deleteErrorMessage.set(null);
      this.deletingGoverningBody.set(body);
    }
  }

  cancelDelete(): void {
    if (!this.isDeleting()) {
      this.deletingSport.set(false);
      this.deletingGoverningBody.set(null);
      this.deleteErrorMessage.set(null);
    }
  }

  deleteSelected(): void {
    const sport = this.sport();
    const governingBody = this.deletingGoverningBody();

    if (this.isDeleting() || (!sport && !governingBody)) {
      return;
    }

    this.isDeleting.set(true);
    this.deleteErrorMessage.set(null);
    const request = governingBody ? this.sportsService.softDeleteGoverningBody(governingBody.id) : this.sportsService.softDelete(sport!.id);
    request.pipe(finalize(() => this.isDeleting.set(false))).subscribe({
      next: () => {
        if (governingBody) {
          this.governingBodies.update((bodies) => bodies.filter((body) => body.id !== governingBody.id));
          this.deletingGoverningBody.set(null);
        } else {
          this.deletingSport.set(false);
          void this.router.navigate(['/sports']);
        }
      },
      error: (error: HttpErrorResponse) => this.deleteErrorMessage.set(error.error?.error?.message ?? 'Unable to delete this record. Please try again.'),
    });
  }

  deleteTargetName(): string {
    return this.deletingGoverningBody()?.name ?? this.sport()?.name ?? 'this record';
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
    { key: 'competitions', label: 'Competitions' },
    { key: 'participants', label: 'Participants' },
  ];
  readonly addFields: HierarchyAddDialogField[] = [
    { controlName: 'name', label: 'Name', placeholder: 'e.g. National Football Association' },
    { controlName: 'country', label: 'Country', placeholder: 'e.g. India' },
  ];
  readonly sportEditFields: HierarchyAddDialogField[] = [
    { controlName: 'name', label: 'Name', placeholder: 'e.g. Football' },
    { controlName: 'description', label: 'Description', placeholder: 'A short description (optional)' },
    { controlName: 'iconUrl', label: 'Icon URL', placeholder: 'https://example.com/sport-icon.svg' },
  ];

  private formatDate(date: string | null | undefined): string {
    return date ? new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date)) : 'Not available';
  }
}
