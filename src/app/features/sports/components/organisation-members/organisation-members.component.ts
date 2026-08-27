import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';

import { SquadMember, StaffGroup } from '../../models/sport.model';
import { SportsService } from '../../services/sports.service';
import { HierarchyAddDialogComponent, HierarchyAddDialogField } from '../hierarchy-add-dialog/hierarchy-add-dialog.component';
import { ButtonComponent } from '../../../../common/components/ui';

@Component({
  selector: 'app-organisation-members',
  standalone: true,
  imports: [ButtonComponent, HierarchyAddDialogComponent, ReactiveFormsModule],
  templateUrl: './organisation-members.component.html',
  styleUrl: './organisation-members.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganisationMembersComponent {
  private readonly sportsService = inject(SportsService);
  private readonly formBuilder = inject(FormBuilder);

  readonly organizationId = input.required<string>();
  readonly squad = signal<SquadMember[]>([]);
  readonly staffGroups = signal<StaffGroup[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly squadDialogOpen = signal(false);
  readonly staffDialogOpen = signal(false);
  readonly isSaving = signal(false);
  readonly dialogErrorMessage = signal<string | null>(null);
  readonly squadForm = this.formBuilder.nonNullable.group({
    userId: ['', Validators.required],
    position: ['', Validators.required],
    agreementEnd: [''],
  });
  readonly staffForm = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    roleTitle: ['', Validators.required],
    category: ['club_president' as StaffGroup['category'], Validators.required],
    nationality: [''],
    photoUrl: [''],
  });

  constructor() {
    effect(() => this.loadMembers(this.organizationId()));
  }

  openSquadDialog(): void {
    this.squadForm.reset({ userId: '', position: '', agreementEnd: '' });
    this.dialogErrorMessage.set(null);
    this.squadDialogOpen.set(true);
  }

  openStaffDialog(): void {
    this.staffForm.reset({ name: '', roleTitle: '', category: 'club_president', nationality: '', photoUrl: '' });
    this.dialogErrorMessage.set(null);
    this.staffDialogOpen.set(true);
  }

  closeDialogs(): void {
    if (!this.isSaving()) {
      this.squadDialogOpen.set(false);
      this.staffDialogOpen.set(false);
    }
  }

  addSquadMember(): void {
    if (this.squadForm.invalid || this.isSaving()) {
      this.squadForm.markAllAsTouched();
      return;
    }

    const { userId, position, agreementEnd } = this.squadForm.getRawValue();
    this.isSaving.set(true);
    this.dialogErrorMessage.set(null);
    this.sportsService
      .createSquadMember(this.organizationId(), {
        userId: userId.trim(),
        position: position.trim(),
        ...(agreementEnd ? { agreementEnd: new Date(agreementEnd).toISOString() } : {}),
      })
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.squadDialogOpen.set(false);
          this.loadMembers(this.organizationId());
        },
        error: (error: HttpErrorResponse) => this.dialogErrorMessage.set(error.error?.error?.message ?? 'Unable to add this squad member. Please try again.'),
      });
  }

  addStaffMember(): void {
    if (this.staffForm.invalid || this.isSaving()) {
      this.staffForm.markAllAsTouched();
      return;
    }

    const { name, roleTitle, category, nationality, photoUrl } = this.staffForm.getRawValue();
    this.isSaving.set(true);
    this.dialogErrorMessage.set(null);
    this.sportsService
      .createStaffMember(this.organizationId(), {
        name: name.trim(),
        roleTitle: roleTitle.trim(),
        category,
        ...(nationality.trim() ? { nationality: nationality.trim() } : {}),
        ...(photoUrl.trim() ? { photoUrl: photoUrl.trim() } : {}),
      })
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.staffDialogOpen.set(false);
          this.loadMembers(this.organizationId());
        },
        error: (error: HttpErrorResponse) => this.dialogErrorMessage.set(error.error?.error?.message ?? 'Unable to add this staff member. Please try again.'),
      });
  }

  categoryLabel(category: StaffGroup['category']): string {
    return category.replaceAll('_', ' ');
  }

  staffCount(): number {
    return this.staffGroups().reduce((total, group) => total + group.members.length, 0);
  }

  initials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  }

  readonly squadFields: HierarchyAddDialogField[] = [
    { controlName: 'userId', label: 'User ID', placeholder: 'User UUID' },
    { controlName: 'position', label: 'Position', placeholder: 'e.g. Forward' },
    { controlName: 'agreementEnd', label: 'Agreement end', type: 'date' },
  ];
  readonly staffFields: HierarchyAddDialogField[] = [
    { controlName: 'name', label: 'Name', placeholder: 'e.g. Alex Morgan' },
    { controlName: 'roleTitle', label: 'Role title', placeholder: 'e.g. Club President' },
    {
      controlName: 'category',
      label: 'Category',
      type: 'select',
      options: [
        { label: 'Club President', value: 'club_president' },
        { label: 'Executive Management', value: 'executive_management' },
        { label: 'Operations & Administration', value: 'operations_administration' },
      ],
    },
    { controlName: 'nationality', label: 'Nationality', placeholder: 'e.g. India' },
    { controlName: 'photoUrl', label: 'Photo URL', placeholder: 'https://…' },
  ];

  private loadMembers(organizationId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    forkJoin({ squad: this.sportsService.getSquad(organizationId), staff: this.sportsService.getStaff(organizationId) })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: ({ squad, staff }) => {
          this.squad.set(squad);
          this.staffGroups.set(staff.groups);
        },
        error: () => this.errorMessage.set('Unable to load organisation members. Please try again.'),
      });
  }
}
