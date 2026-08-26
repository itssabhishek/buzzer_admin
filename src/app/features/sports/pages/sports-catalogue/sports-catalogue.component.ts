import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, finalize, Subject } from 'rxjs';

import { CatalogueStat, PaginationMeta, Sport, SportPayload } from '../../models/sport.model';
import { SportsService } from '../../services/sports.service';

const PAGE_SIZE = 10;
const EMPTY_META: PaginationMeta = { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 };

@Component({
  selector: 'app-sports-catalogue',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule],
  templateUrl: './sports-catalogue.component.html',
  styleUrl: './sports-catalogue.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SportsCatalogueComponent {
  private readonly sportsService = inject(SportsService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchInput = new Subject<string>();

  readonly sports = signal<Sport[]>([]);
  readonly stats = signal<CatalogueStat[]>([]);
  readonly meta = signal<PaginationMeta>(EMPTY_META);
  readonly search = signal('');
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly isDeleting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly dialogOpen = signal(false);
  readonly deletingSport = signal<Sport | null>(null);
  readonly editingSport = signal<Sport | null>(null);
  readonly sportForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(500)]],
    iconUrl: ['', [Validators.pattern(/^https?:\/\/.+/i)]],
  });

  constructor() {
    this.searchInput
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((search) => {
        this.search.set(search);
        this.loadSports(1);
      });

    this.loadSports();
    this.loadStats();
  }

  updateSearch(value: string): void {
    this.searchInput.next(value);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.meta().totalPages && page !== this.meta().page) {
      this.loadSports(page);
    }
  }

  openCreateDialog(): void {
    this.editingSport.set(null);
    this.sportForm.reset({ name: '', description: '', iconUrl: '' });
    this.errorMessage.set(null);
    this.dialogOpen.set(true);
  }

  openEditDialog(sport: Sport): void {
    this.editingSport.set(sport);
    this.sportForm.reset({
      name: sport.name,
      description: sport.description ?? '',
      iconUrl: sport.iconUrl ?? '',
    });
    this.errorMessage.set(null);
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    if (!this.isSaving()) {
      this.dialogOpen.set(false);
    }
  }

  saveSport(): void {
    if (this.sportForm.invalid || this.isSaving()) {
      this.sportForm.markAllAsTouched();
      return;
    }

    const payload = this.toPayload();
    const currentSport = this.editingSport();
    const request = currentSport
      ? this.sportsService.update(currentSport.id, payload)
      : this.sportsService.create(payload);

    this.isSaving.set(true);
    this.errorMessage.set(null);
    request.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: () => {
        this.dialogOpen.set(false);
        this.loadSports(this.meta().page);
        this.loadStats();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(error.error?.error?.message ?? 'Unable to save this sport. Please try again.');
      },
    });
  }

  requestDelete(sport: Sport): void {
    this.deletingSport.set(sport);
    this.errorMessage.set(null);
  }

  cancelDelete(): void {
    if (!this.isDeleting()) {
      this.deletingSport.set(null);
    }
  }

  deleteSport(): void {
    const sport = this.deletingSport();

    if (!sport || this.isDeleting()) {
      return;
    }

    this.isDeleting.set(true);
    this.errorMessage.set(null);
    this.sportsService.softDelete(sport.id).pipe(finalize(() => this.isDeleting.set(false))).subscribe({
      next: () => {
        this.deletingSport.set(null);
        this.loadSports(this.meta().page);
        this.loadStats();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(error.error?.error?.message ?? 'Unable to remove this sport. Please try again.');
      },
    });
  }

  pageNumbers(): number[] {
    const { page, totalPages } = this.meta();
    const firstPage = Math.max(1, page - 2);
    const lastPage = Math.min(totalPages, firstPage + 4);
    return Array.from({ length: lastPage - firstPage + 1 }, (_, index) => firstPage + index);
  }

  private loadSports(page = this.meta().page): void {
    this.isLoading.set(true);
    this.sportsService
      .list(page, PAGE_SIZE, this.search())
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          if (response.data.length === 0 && response.meta.total > 0 && page > 1) {
            this.loadSports(page - 1);
            return;
          }

          this.sports.set(response.data);
          this.meta.set(response.meta);
        },
        error: () => {
          this.sports.set([]);
          this.meta.set(EMPTY_META);
          this.errorMessage.set('Unable to load sports. Please refresh and try again.');
        },
      });
  }

  private loadStats(): void {
    this.sportsService.getStats().subscribe({
      next: (stats) => this.stats.set(stats),
      error: () => this.stats.set([]),
    });
  }

  private toPayload(): SportPayload {
    const { name, description, iconUrl } = this.sportForm.getRawValue();
    return {
      name: name.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(iconUrl.trim() ? { iconUrl: iconUrl.trim() } : {}),
    };
  }
}
