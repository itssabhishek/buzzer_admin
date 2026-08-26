import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { HierarchyBreadcrumb, HierarchyBreadcrumbsComponent } from '../hierarchy-breadcrumbs/hierarchy-breadcrumbs.component';
import { HierarchyChildTableComponent, HierarchyChildTableColumn, HierarchyChildTableRow } from '../hierarchy-child-table/hierarchy-child-table.component';
import { HierarchyStat, HierarchyStatCardsComponent } from '../hierarchy-stat-cards/hierarchy-stat-cards.component';

@Component({
  selector: 'app-hierarchy-detail',
  standalone: true,
  imports: [HierarchyBreadcrumbsComponent, HierarchyStatCardsComponent, HierarchyChildTableComponent],
  templateUrl: './hierarchy-detail.component.html',
  styleUrl: './hierarchy-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HierarchyDetailComponent {
  readonly breadcrumbs = input.required<HierarchyBreadcrumb[]>();
  readonly eyebrow = input.required<string>();
  readonly title = input.required<string>();
  readonly description = input<string | null>();
  readonly stats = input.required<HierarchyStat[]>();
  readonly childTableTitle = input.required<string>();
  readonly childTableTotal = input.required<number>();
  readonly childTableColumns = input.required<HierarchyChildTableColumn[]>();
  readonly childTableRows = input.required<HierarchyChildTableRow[]>();
  readonly isLoading = input(false);
  readonly errorMessage = input<string | null>(null);
  readonly emptyMessage = input('There are no child records yet.');
  readonly addLabel = input<string>();
  readonly secondaryAddLabel = input<string>();
  readonly addRequested = output<void>();
  readonly secondaryAddRequested = output<void>();
}
