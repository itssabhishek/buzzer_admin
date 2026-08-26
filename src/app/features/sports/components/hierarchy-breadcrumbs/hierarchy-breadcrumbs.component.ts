import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface HierarchyBreadcrumb {
  label: string;
  route?: string;
}

@Component({
  selector: 'app-hierarchy-breadcrumbs',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './hierarchy-breadcrumbs.component.html',
  styleUrl: './hierarchy-breadcrumbs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HierarchyBreadcrumbsComponent {
  readonly items = input.required<HierarchyBreadcrumb[]>();
}
