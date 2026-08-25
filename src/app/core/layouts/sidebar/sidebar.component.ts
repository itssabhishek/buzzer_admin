import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { SIDEBAR_SECTIONS } from './data/sidebar-items';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  readonly collapsed = input(false);
  readonly collapseToggle = output<void>();
  readonly navigate = output<void>();
  readonly sections = SIDEBAR_SECTIONS;

  toggle(): void {
    this.collapseToggle.emit();
  }

  onNavigate(): void {
    this.navigate.emit();
  }
}
