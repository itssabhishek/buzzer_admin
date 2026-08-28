import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { HierarchyBreadcrumb, HierarchyBreadcrumbsComponent } from '../hierarchy-breadcrumbs/hierarchy-breadcrumbs.component';
import { HierarchyChildTableComponent, HierarchyChildTableColumn, HierarchyChildTableRow } from '../hierarchy-child-table/hierarchy-child-table.component';
import { HierarchyStat, HierarchyStatCardsComponent } from '../hierarchy-stat-cards/hierarchy-stat-cards.component';
import { PaginationMeta } from '../../models/sport.model';
import { ButtonComponent } from '../../../../common/components/ui';

export interface HierarchyDetailMetadata {
  label: string;
  value: string;
}

@Component({
  selector: 'app-hierarchy-detail',
  standalone: true,
  imports: [ButtonComponent, HierarchyBreadcrumbsComponent, HierarchyStatCardsComponent, HierarchyChildTableComponent],
  templateUrl: './hierarchy-detail.component.html',
  styleUrl: './hierarchy-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HierarchyDetailComponent {
  readonly breadcrumbs = input.required<HierarchyBreadcrumb[]>();
  readonly eyebrow = input.required<string>();
  readonly title = input.required<string>();
  readonly description = input<string | null>();
  readonly recordIcon = input<string | null>(null);
  readonly metadata = input<HierarchyDetailMetadata[]>([]);
  readonly metadataLayout = input<'inline' | 'stacked'>('inline');
  readonly allowRecordEdit = input(false);
  readonly allowRecordDelete = input(false);
  readonly stats = input.required<HierarchyStat[]>();
  readonly childTableTitle = input.required<string>();
  readonly childTableFirstColumnLabel = input<string | null>(null);
  readonly childTableTotal = input.required<number>();
  readonly childTableColumns = input.required<HierarchyChildTableColumn[]>();
  readonly childTableRows = input.required<HierarchyChildTableRow[]>();
  readonly hasChildSearch = input(false);
  readonly childSearch = input('');
  readonly childPagination = input<PaginationMeta | null>(null);
  readonly isLoading = input(false);
  readonly errorMessage = input<string | null>(null);
  readonly emptyMessage = input('There are no child records yet.');
  readonly allowChildEdit = input(false);
  readonly allowChildDelete = input(false);
  readonly addLabel = input<string>();
  readonly secondaryAddLabel = input<string>();
  readonly addRequested = output<void>();
  readonly secondaryAddRequested = output<void>();
  readonly recordEditRequested = output<void>();
  readonly recordDeleteRequested = output<void>();
  readonly childEditRequested = output<HierarchyChildTableRow>();
  readonly childDeleteRequested = output<HierarchyChildTableRow>();
  readonly childSearchChanged = output<string>();
  readonly childPageChanged = output<number>();
}
