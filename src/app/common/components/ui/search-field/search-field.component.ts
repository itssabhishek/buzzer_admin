import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-search-field',
  standalone: true,
  templateUrl: './search-field.component.html',
  styleUrl: './search-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchFieldComponent {
  readonly value = input('');
  readonly placeholder = input('Search');
  readonly ariaLabel = input('Search');
  readonly iconSrc = input('assets/svg/Icons=ic_search.svg');
  readonly disabled = input(false);
  readonly valueChange = output<string>();

  updateValue(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}
