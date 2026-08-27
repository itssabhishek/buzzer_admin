import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';

import { SearchFieldComponent } from '../../../common/components/ui';
import { AppSearchService } from '../../search/app-search.service';

@Component({
  imports: [SearchFieldComponent],
  selector: 'app-header',
  styleUrl: './header.component.scss',
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  private readonly appSearch = inject(AppSearchService);

  readonly pageTitle = input('Dashboard');
  readonly menuToggle = output<void>();
  readonly searchChange = output<string>();
  readonly searchTerm = this.appSearch.searchTerm;

  toggleMenu(): void {
    this.menuToggle.emit();
  }

  updateSearch(value: string): void {
    this.appSearch.setSearchTerm(value);
    this.searchChange.emit(value);
  }
}
