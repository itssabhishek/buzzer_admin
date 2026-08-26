import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

export interface HierarchyAddDialogOption {
  label: string;
  value: string;
}

export interface HierarchyAddDialogField {
  controlName: string;
  label: string;
  type?: 'number' | 'select' | 'text';
  placeholder?: string;
  options?: HierarchyAddDialogOption[];
}

@Component({
  selector: 'app-hierarchy-add-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './hierarchy-add-dialog.component.html',
  styleUrl: './hierarchy-add-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HierarchyAddDialogComponent {
  readonly isOpen = input(false);
  readonly title = input.required<string>();
  readonly entityLabel = input.required<string>();
  readonly form = input.required<FormGroup>();
  readonly fields = input.required<HierarchyAddDialogField[]>();
  readonly isSaving = input(false);
  readonly errorMessage = input<string | null>(null);
  readonly closed = output<void>();
  readonly submitted = output<void>();

  close(): void {
    if (!this.isSaving()) {
      this.closed.emit();
    }
  }

  submit(): void {
    this.submitted.emit();
  }
}
