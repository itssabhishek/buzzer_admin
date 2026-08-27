import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type TagTone = 'neutral' | 'primary' | 'success' | 'danger';

@Component({
  selector: 'app-tag',
  standalone: true,
  templateUrl: './tag.component.html',
  styleUrl: './tag.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagComponent {
  readonly tone = input<TagTone>('neutral');
  readonly active = input(false);
  readonly size = input<'default' | 'small'>('default');
}
