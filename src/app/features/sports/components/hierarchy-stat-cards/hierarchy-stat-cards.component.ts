import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface HierarchyStat {
  label: string;
  value: number | string;
  icon: 'governing-bodies' | 'organisations' | 'teams' | 'participants' | 'jersey' | 'position';
}

@Component({
  selector: 'app-hierarchy-stat-cards',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './hierarchy-stat-cards.component.html',
  styleUrl: './hierarchy-stat-cards.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HierarchyStatCardsComponent {
  readonly stats = input.required<HierarchyStat[]>();
  readonly isLoading = input(false);

  isNumeric(value: number | string): boolean {
    return typeof value === 'number';
  }
}
