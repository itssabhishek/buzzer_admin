import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin, map, of, switchMap } from 'rxjs';

import { SquadMember, StaffGroup, StaffMember } from '../../models/sport.model';
import { SportsService } from '../../services/sports.service';
import { HierarchyAddDialogComponent, HierarchyAddDialogField } from '../hierarchy-add-dialog/hierarchy-add-dialog.component';
import { ButtonComponent, DialogComponent } from '../../../../common/components/ui';
import { AuthService } from '../../../../core/auth/services/auth.service';

type MemberDeleteTarget =
  | { type: 'squad'; member: SquadMember }
  | { type: 'staff'; member: StaffMember };

@Component({
  selector: 'app-organisation-members',
  standalone: true,
  imports: [ButtonComponent, DialogComponent, HierarchyAddDialogComponent, ReactiveFormsModule],
  templateUrl: './organisation-members.component.html',
  styleUrl: './organisation-members.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganisationMembersComponent {
  private readonly sportsService = inject(SportsService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly organizationId = input.required<string>();
  readonly canManageMembers = this.authService.canManageOrganisationMembers;
  readonly squad = signal<SquadMember[]>([]);
  readonly staffGroups = signal<StaffGroup[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly squadDialogOpen = signal(false);
  readonly staffDialogOpen = signal(false);
  readonly isSaving = signal(false);
  readonly dialogErrorMessage = signal<string | null>(null);
  readonly editingSquadMember = signal<SquadMember | null>(null);
  readonly editingStaffMember = signal<StaffMember | null>(null);
  readonly deletingMember = signal<MemberDeleteTarget | null>(null);
  readonly isDeleting = signal(false);
  readonly deleteErrorMessage = signal<string | null>(null);
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
    if (!this.canManageMembers()) return;
    this.editingSquadMember.set(null);
    this.squadForm.reset({ userId: '', position: '', agreementEnd: '' });
    this.dialogErrorMessage.set(null);
    this.squadDialogOpen.set(true);
  }

  openStaffDialog(): void {
    if (!this.canManageMembers()) return;
    this.editingStaffMember.set(null);
    this.staffForm.reset({ name: '', roleTitle: '', category: 'club_president', nationality: '', photoUrl: '' });
    this.dialogErrorMessage.set(null);
    this.staffDialogOpen.set(true);
  }

  closeDialogs(): void {
    if (!this.isSaving()) {
      this.squadDialogOpen.set(false);
      this.staffDialogOpen.set(false);
      this.editingSquadMember.set(null);
      this.editingStaffMember.set(null);
    }
  }

  addSquadMember(): void {
    if (!this.canManageMembers() || this.squadForm.invalid || this.isSaving()) {
      this.squadForm.markAllAsTouched();
      return;
    }

    const { userId, position, agreementEnd } = this.squadForm.getRawValue();
    this.isSaving.set(true);
    this.dialogErrorMessage.set(null);
    const editingMember = this.editingSquadMember();
    const request = editingMember
      ? this.sportsService.updateSquadMember(editingMember.id, {
          position: position.trim(),
          ...(agreementEnd ? { agreementEnd: new Date(agreementEnd).toISOString() } : { agreementEnd: undefined }),
        })
      : this.sportsService.createSquadMember(this.organizationId(), {
        userId: userId.trim(),
        position: position.trim(),
        ...(agreementEnd ? { agreementEnd: new Date(agreementEnd).toISOString() } : {}),
      });
    request
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.squadDialogOpen.set(false);
          this.editingSquadMember.set(null);
          this.loadMembers(this.organizationId());
        },
        error: (error: HttpErrorResponse) => this.dialogErrorMessage.set(error.error?.error?.message ?? 'Unable to add this squad member. Please try again.'),
      });
  }

  addStaffMember(): void {
    if (!this.canManageMembers() || this.staffForm.invalid || this.isSaving()) {
      this.staffForm.markAllAsTouched();
      return;
    }

    const { name, roleTitle, category, nationality, photoUrl } = this.staffForm.getRawValue();
    this.isSaving.set(true);
    this.dialogErrorMessage.set(null);
    const editingMember = this.editingStaffMember();
    const payload = {
        name: name.trim(),
        roleTitle: roleTitle.trim(),
        category,
        ...(nationality.trim() ? { nationality: nationality.trim() } : {}),
        ...(photoUrl.trim() ? { photoUrl: photoUrl.trim() } : {}),
      };
    const request = editingMember
      ? this.sportsService.updateStaffMember(editingMember.id, payload)
      : this.sportsService.createStaffMember(this.organizationId(), payload);
    request
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.staffDialogOpen.set(false);
          this.editingStaffMember.set(null);
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

  openSquadEdit(member: SquadMember): void {
    if (!this.canManageMembers()) return;
    this.editingSquadMember.set(member);
    this.squadForm.reset({ userId: member.userId, position: member.position, agreementEnd: member.agreementEnd?.slice(0, 10) ?? '' });
    this.dialogErrorMessage.set(null);
    this.squadDialogOpen.set(true);
  }

  openStaffEdit(member: StaffMember): void {
    if (!this.canManageMembers()) return;
    this.editingStaffMember.set(member);
    this.staffForm.reset({ name: member.name, roleTitle: member.roleTitle, category: member.category, nationality: member.nationality ?? '', photoUrl: member.photoUrl ?? '' });
    this.dialogErrorMessage.set(null);
    this.staffDialogOpen.set(true);
  }

  requestDelete(type: MemberDeleteTarget['type'], member: SquadMember | StaffMember): void {
    if (!this.canManageMembers()) return;
    this.deleteErrorMessage.set(null);
    this.deletingMember.set(type === 'squad' ? { type, member: member as SquadMember } : { type, member: member as StaffMember });
  }

  cancelDelete(): void {
    if (!this.isDeleting()) {
      this.deletingMember.set(null);
      this.deleteErrorMessage.set(null);
    }
  }

  deleteMember(): void {
    const target = this.deletingMember();
    if (!target || !this.canManageMembers() || this.isDeleting()) return;
    this.isDeleting.set(true);
    const request = target.type === 'squad'
      ? this.sportsService.deleteSquadMember(target.member.id)
      : this.sportsService.deleteStaffMember(target.member.id);
    request.pipe(finalize(() => this.isDeleting.set(false))).subscribe({
      next: () => { this.deletingMember.set(null); this.loadMembers(this.organizationId()); },
      error: (error: HttpErrorResponse) => this.deleteErrorMessage.set(error.error?.error?.message ?? 'Unable to remove this member. Please try again.'),
    });
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
      .pipe(
        switchMap(({ squad, staff }) =>
          forkJoin({
            staff: of(staff),
            squad: squad.length
              ? forkJoin(squad.map((member) => this.sportsService.getAthleteProfile(member.userId).pipe(
                  map((profile) => ({ ...member, photoUrl: profile?.photoUrl ?? member.photoUrl, age: profile?.age ?? member.age })),
                )))
              : of([]),
          }),
        ),
      )
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
