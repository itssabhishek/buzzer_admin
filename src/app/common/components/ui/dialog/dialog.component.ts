import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-dialog',
  standalone: true,
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogComponent {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  readonly statusIcon = input<string | null>('assets/svg/Icons=ic_verified_badge.svg');
  readonly size = input<'wide' | 'compact'>('wide');
  readonly closeOnBackdrop = input(true);
  readonly closeOnEscape = input(true);
  readonly closed = output<void>();

  onBackdropClick(): void {
    if (this.closeOnBackdrop()) {
      this.closed.emit();
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.closeOnEscape()) {
      this.closed.emit();
    }
  }

  close(): void {
    this.closed.emit();
  }
}
