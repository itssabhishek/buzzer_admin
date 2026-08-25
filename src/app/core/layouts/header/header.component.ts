import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-header',
  styleUrl: './header.component.scss',
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  readonly pageTitle = input('Dashboard');
  readonly menuToggle = output<void>();
  readonly searchChange = output<string>();
  readonly searchTerm = signal('');

  toggleMenu(): void {
    this.menuToggle.emit();
  }

  updateSearch(value: string): void {
    this.searchTerm.set(value);
    this.searchChange.emit(value);
  }
}
