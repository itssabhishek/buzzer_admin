import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { BulkImportReport, BulkImportRow, ImportEntityType } from '../models/bulk-import.model';
import { SportsService } from './sports.service';

const REQUEST_INTERVAL_MS = 210;

@Injectable({ providedIn: 'root' })
export class BulkImportService {
  private readonly sportsService = inject(SportsService);

  async importRowsSequentially(
    entityType: ImportEntityType,
    rows: BulkImportRow[],
    onRowComplete: (report: BulkImportReport) => void,
  ): Promise<void> {
    for (const [index, row] of rows.entries()) {
      let report: BulkImportReport;

      try {
        await this.createRow(entityType, row.values);
        report = { rowNumber: row.rowNumber, label: this.rowLabel(entityType, row.values), message: 'Added', status: 'added' };
      } catch (error: unknown) {
        report = this.toReport(entityType, row, error);
      }

      onRowComplete(report);

      if (index < rows.length - 1) {
        await this.waitBetweenRequests();
      }
    }
  }

  private createRow(entityType: ImportEntityType, values: Record<string, unknown>): Promise<unknown> {
    switch (entityType) {
      case 'sports':
        return firstValueFrom(
          this.sportsService.create({
            name: this.required(values, 'name'),
            ...this.optional(values, 'description'),
            ...this.optional(values, 'iconUrl'),
          }),
        );
      case 'governing-bodies':
        return firstValueFrom(
          this.sportsService.createGoverningBody({
            name: this.required(values, 'name'),
            sportId: this.required(values, 'sportId'),
            ...this.optional(values, 'country'),
          }),
        );
      case 'organisations':
        return firstValueFrom(
          this.sportsService.createOrganisation({
            name: this.required(values, 'name'),
            governingBodyId: this.required(values, 'governingBodyId'),
            ...this.optional(values, 'city'),
          }),
        );
      case 'teams':
        return firstValueFrom(
          this.sportsService.createTeam({
            name: this.required(values, 'name'),
            organizationId: this.required(values, 'organizationId'),
            ...this.optional(values, 'shortName'),
          }),
        );
      case 'participants':
        return firstValueFrom(
          this.sportsService.createParticipant({
            firstName: this.required(values, 'firstName'),
            lastName: this.required(values, 'lastName'),
            teamId: this.required(values, 'teamId'),
            ...this.optional(values, 'position'),
            ...this.optionalNumber(values, 'jerseyNumber'),
          }),
        );
    }
  }

  private required(values: Record<string, unknown>, field: string): string {
    const value = this.value(values, field);
    if (!value) {
      throw new Error(`Missing required field: ${field}`);
    }

    return value;
  }

  private optional(values: Record<string, unknown>, field: string): Record<string, string> {
    const value = this.value(values, field);
    return value ? { [field]: value } : {};
  }

  private optionalNumber(values: Record<string, unknown>, field: string): Record<string, number> {
    const value = this.value(values, field);
    if (!value) {
      return {};
    }

    const numberValue = Number(value);
    if (!Number.isInteger(numberValue)) {
      throw new Error(`${field} must be a whole number`);
    }

    return { [field]: numberValue };
  }

  private value(values: Record<string, unknown>, field: string): string {
    const entry = Object.entries(values).find(([key]) => key.toLowerCase() === field.toLowerCase());
    return String(entry?.[1] ?? '').trim();
  }

  private toReport(entityType: ImportEntityType, row: BulkImportRow, error: unknown): BulkImportReport {
    if (error instanceof HttpErrorResponse && error.status === 409) {
      return { rowNumber: row.rowNumber, label: this.rowLabel(entityType, row.values), message: 'Duplicate record', status: 'skipped' };
    }

    const message = error instanceof HttpErrorResponse ? (error.error?.error?.message ?? 'Request failed') : error instanceof Error ? error.message : 'Request failed';
    return { rowNumber: row.rowNumber, label: this.rowLabel(entityType, row.values), message, status: 'failed' };
  }

  private rowLabel(entityType: ImportEntityType, values: Record<string, unknown>): string {
    if (entityType === 'participants') {
      return `${this.value(values, 'firstName')} ${this.value(values, 'lastName')}`.trim() || 'Participant';
    }

    return this.value(values, 'name') || 'Unnamed record';
  }

  private waitBetweenRequests(): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, REQUEST_INTERVAL_MS));
  }
}
