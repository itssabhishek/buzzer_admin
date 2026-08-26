import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

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
  imports: [RouterLink],
  templateUrl: './hierarchy-child-table.component.html',
  styleUrl: './hierarchy-child-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HierarchyChildTableComponent {
  readonly title = input.required<string>();
  readonly total = input.required<number>();
  readonly columns = input.required<HierarchyChildTableColumn[]>();
  readonly rows = input.required<HierarchyChildTableRow[]>();
  readonly isLoading = input(false);
  readonly emptyMessage = input('There are no child records yet.');
}
