import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HierarchyDetailComponent } from './hierarchy-detail.component';

describe('HierarchyDetailComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('debounces child table search input before emitting it', () => {
    vi.useFakeTimers();
    TestBed.overrideComponent(HierarchyDetailComponent, { set: { template: '' } });
    const component = TestBed.createComponent(HierarchyDetailComponent).componentInstance;
    const emittedSearches: string[] = [];
    component.childSearchChanged.subscribe((search) => emittedSearches.push(search));

    component.updateChildSearch('a');
    vi.advanceTimersByTime(150);
    component.updateChildSearch('alex');
    vi.advanceTimersByTime(299);

    expect(emittedSearches).toEqual([]);

    vi.advanceTimersByTime(1);

    expect(emittedSearches).toEqual(['alex']);
  });
});
