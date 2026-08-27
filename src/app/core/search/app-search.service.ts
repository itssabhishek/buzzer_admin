import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AppSearchService {
  private readonly searchTermState = signal('');

  readonly searchTerm = this.searchTermState.asReadonly();

  setSearchTerm(searchTerm: string): void {
    this.searchTermState.set(searchTerm);
  }
}
