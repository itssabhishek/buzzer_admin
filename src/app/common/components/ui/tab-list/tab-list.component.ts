import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface TabItem {
  id: string;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-tab-list',
  standalone: true,
  templateUrl: './tab-list.component.html',
  styleUrl: './tab-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabListComponent {
  readonly items = input.required<readonly TabItem[]>();
  readonly activeId = input.required<string>();
  readonly variant = input<'default' | 'transparent'>('default');
  readonly activeIdChange = output<string>();

  select(item: TabItem): void {
    if (!item.disabled && item.id !== this.activeId()) {
      this.activeIdChange.emit(item.id);
    }
  }
}
