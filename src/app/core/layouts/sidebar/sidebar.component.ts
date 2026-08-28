import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../auth/services/auth.service';
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
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly collapsed = input(false);
  readonly collapseToggle = output<void>();
  readonly navigate = output<void>();
  readonly sections = SIDEBAR_SECTIONS;
  readonly user = this.authService.user;

  iconPath(icon: string): string {
    const iconNames: Record<string, string> = {
      dashboard: 'ic_grid',
      trophy: 'ic_statistics',
      sports: 'ic_sport',
      send: 'ic_send',
      wallet: 'ic_wallet',
      settings: 'ic_settings',
    };

    return `assets/svg/Icons=${iconNames[icon] ?? 'ic_grid'}.svg`;
  }

  toggle(): void {
    this.collapseToggle.emit();
  }

  onNavigate(): void {
    this.navigate.emit();
  }

  logout(): void {
    this.authService.clearSession();
    void this.router.navigate(['/login']);
  }
}
