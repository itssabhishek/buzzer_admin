import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-message-field',
  standalone: true,
  templateUrl: './message-field.component.html',
  styleUrl: './message-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageFieldComponent {
  readonly value = input('');
  readonly placeholder = input('Type a message');
  readonly ariaLabel = input('Message');
  readonly maxLength = input<number | null>(null);
  readonly disabled = input(false);
  readonly valueChange = output<string>();

  updateValue(event: Event): void {
    this.valueChange.emit((event.target as HTMLTextAreaElement).value);
  }
}
