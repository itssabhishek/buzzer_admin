import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BulkImportRow } from '../models/bulk-import.model';
import { SportsService } from './sports.service';
import { BulkImportService } from './bulk-import.service';

describe('BulkImportService', () => {
  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('waits for each row to complete before starting the next request', async () => {
    vi.useFakeTimers();
    const firstRequest = new Subject<unknown>();
    const sportsService = {
      create: vi.fn().mockReturnValueOnce(firstRequest).mockReturnValueOnce(of({})),
    };
    const service = setup(sportsService);
    const reports = vi.fn();

    const importing = service.importRowsSequentially('sports', rows('First', 'Second'), reports);

    expect(sportsService.create).toHaveBeenCalledTimes(1);

    firstRequest.next({});
    firstRequest.complete();
    await vi.advanceTimersByTimeAsync(210);

    expect(sportsService.create).toHaveBeenCalledTimes(2);
    await importing;
    expect(reports).toHaveBeenCalledTimes(2);
  });

  it('reports duplicate rows as skipped and continues the import', async () => {
    const sportsService = {
      create: vi.fn(() => throwError(() => new HttpErrorResponse({ status: 409 }))),
    };
    const service = setup(sportsService);
    const reports: unknown[] = [];

    await service.importRowsSequentially('sports', rows('Duplicate'), (report) =>
      reports.push(report),
    );

    expect(reports).toEqual([
      {
        rowNumber: 1,
        label: 'Duplicate',
        message: 'Duplicate record',
        status: 'skipped',
      },
    ]);
  });

  function setup(sportsService: { create: ReturnType<typeof vi.fn> }): BulkImportService {
    TestBed.configureTestingModule({
      providers: [BulkImportService, { provide: SportsService, useValue: sportsService }],
    });

    return TestBed.inject(BulkImportService);
  }

  function rows(...names: string[]): BulkImportRow[] {
    return names.map((name, index) => ({ rowNumber: index + 1, values: { name } }));
  }
});
