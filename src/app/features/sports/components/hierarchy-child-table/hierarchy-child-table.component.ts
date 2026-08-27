import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ButtonComponent } from '../../../../common/components/ui';

export interface HierarchyChildTableColumn {
  key: string;
  label: string;
}

export interface HierarchyChildTableRow {
  id: string;
  title: string;
  subtitle?: string | null;
  values: Record<string, string | number | null | undefined>;
  route?: string;
}

@Component({
  selector: 'app-hierarchy-child-table',
  standalone: true,
  imports: [ButtonComponent, RouterLink],
  templateUrl: './hierarchy-child-table.component.html',
  styleUrl: './hierarchy-child-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HierarchyChildTableComponent {
  readonly title = input.required<string>();
  readonly firstColumnLabel = input<string | null>(null);
  readonly total = input.required<number>();
  readonly columns = input.required<HierarchyChildTableColumn[]>();
  readonly rows = input.required<HierarchyChildTableRow[]>();
  readonly isLoading = input(false);
  readonly emptyMessage = input('There are no child records yet.');
  readonly allowEdit = input(false);
  readonly allowDelete = input(false);
  readonly editRequested = output<HierarchyChildTableRow>();
  readonly deleteRequested = output<HierarchyChildTableRow>();

  displayFirstColumnLabel(): string {
    if (this.firstColumnLabel()) {
      return this.firstColumnLabel()!;
    }

    const title = this.title();
    return title.endsWith('ies') ? `${title.slice(0, -3)}y` : title.endsWith('s') ? title.slice(0, -1) : title;
  }
}
