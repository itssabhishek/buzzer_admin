import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface SegmentedControlItem {
  id: string;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-segmented-control',
  standalone: true,
  templateUrl: './segmented-control.component.html',
  styleUrl: './segmented-control.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SegmentedControlComponent {
  readonly items = input.required<readonly SegmentedControlItem[]>();
  readonly value = input.required<string>();
  readonly size = input<'default' | 'small'>('default');
  readonly valueChange = output<string>();

  select(item: SegmentedControlItem): void {
    if (!item.disabled && item.id !== this.value()) {
      this.valueChange.emit(item.id);
    }
  }
}
