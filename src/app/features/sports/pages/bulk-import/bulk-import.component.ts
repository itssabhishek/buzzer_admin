import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ButtonComponent, FieldComponent } from '../../../../common/components/ui';
import { HierarchyBreadcrumbsComponent } from '../../components/hierarchy-breadcrumbs/hierarchy-breadcrumbs.component';
import {
  BulkImportEntityOption,
  BulkImportReport,
  BulkImportRow,
  ImportEntityType,
} from '../../models/bulk-import.model';
import { BulkImportService } from '../../services/bulk-import.service';
import { AuthService } from '../../../../core/auth/services/auth.service';

const ENTITY_OPTIONS: BulkImportEntityOption[] = [
  {
    value: 'sports',
    label: 'Sports',
    requiredFields: ['name'],
    optionalFields: ['description', 'iconUrl'],
  },
  {
    value: 'governing-bodies',
    label: 'Governing Bodies',
    requiredFields: ['name', 'sportId'],
    optionalFields: ['country'],
  },
  {
    value: 'organisations',
    label: 'Organisations',
    requiredFields: ['name', 'governingBodyId'],
    optionalFields: ['city'],
  },
  {
    value: 'teams',
    label: 'Teams',
    requiredFields: ['name', 'organizationId'],
    optionalFields: ['shortName'],
  },
  {
    value: 'participants',
    label: 'Participants',
    requiredFields: ['firstName', 'lastName', 'teamId'],
    optionalFields: ['jerseyNumber', 'position'],
  },
];

@Component({
  selector: 'app-bulk-import',
  standalone: true,
  imports: [ButtonComponent, FieldComponent, HierarchyBreadcrumbsComponent, RouterLink],
  templateUrl: './bulk-import.component.html',
  styleUrl: './bulk-import.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BulkImportComponent {
  private readonly bulkImportService = inject(BulkImportService);
  private readonly authService = inject(AuthService);

  readonly canImport = this.authService.canManageSports;
  readonly selectedEntityType = signal<ImportEntityType>('sports');
  readonly selectedFileName = signal<string | null>(null);
  readonly rows = signal<BulkImportRow[]>([]);
  readonly reports = signal<BulkImportReport[]>([]);
  readonly isImporting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly availableEntityOptions = computed(() => ENTITY_OPTIONS);
  readonly selectedEntity = computed(
    () =>
      this.availableEntityOptions().find((option) => option.value === this.selectedEntityType()) ??
      ENTITY_OPTIONS[0],
  );
  readonly addedCount = computed(
    () => this.reports().filter((report) => report.status === 'added').length,
  );
  readonly skippedCount = computed(
    () => this.reports().filter((report) => report.status === 'skipped').length,
  );
  readonly failedCount = computed(
    () => this.reports().filter((report) => report.status === 'failed').length,
  );

  selectEntityType(value: string): void {
    this.selectedEntityType.set(value as ImportEntityType);
    this.clearFile();
  }

  async selectFile(file: File | undefined): Promise<void> {
    if (!this.canImport()) return;
    this.clearFile();
    if (!file) {
      return;
    }

    try {
      const contents = await file.text();
      const rows = file.name.toLowerCase().endsWith('.json')
        ? this.parseJson(contents)
        : file.name.toLowerCase().endsWith('.csv')
          ? this.parseCsv(contents)
          : null;
      if (!rows) {
        throw new Error('Choose a .csv or .json file.');
      }
      if (!rows.length) {
        throw new Error('The file does not contain any import rows.');
      }

      this.rows.set(rows);
      this.selectedFileName.set(file.name);
    } catch (error: unknown) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Unable to read this file.');
    }
  }

  async importRows(): Promise<void> {
    if (!this.canImport() || !this.rows().length || this.isImporting()) {
      return;
    }

    this.isImporting.set(true);
    this.reports.set([]);
    this.errorMessage.set(null);
    try {
      await this.bulkImportService.importRowsSequentially(
        this.selectedEntityType(),
        this.rows(),
        (report) => {
          this.reports.update((reports) => [...reports, report]);
        },
      );
    } finally {
      this.isImporting.set(false);
    }
  }

  clearFile(): void {
    this.selectedFileName.set(null);
    this.rows.set([]);
    this.reports.set([]);
    this.errorMessage.set(null);
  }

  private parseJson(contents: string): BulkImportRow[] {
    const parsed: unknown = JSON.parse(contents);
    if (
      !Array.isArray(parsed) ||
      parsed.some((row) => !row || typeof row !== 'object' || Array.isArray(row))
    ) {
      throw new Error('JSON imports must contain an array of objects.');
    }

    return parsed.map((row, index) => ({
      rowNumber: index + 1,
      values: row as Record<string, unknown>,
    }));
  }

  private parseCsv(contents: string): BulkImportRow[] {
    const lines = contents
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .filter((line) => line.trim());
    if (lines.length < 2) {
      return [];
    }

    const headers = this.csvCells(lines[0]).map((header) => header.trim());
    if (headers.some((header) => !header)) {
      throw new Error('CSV headers cannot be blank.');
    }

    return lines.slice(1).map((line, index) => {
      const values = this.csvCells(line);
      return {
        rowNumber: index + 2,
        values: Object.fromEntries(
          headers.map((header, columnIndex) => [header, values[columnIndex] ?? '']),
        ),
      };
    });
  }

  private csvCells(line: string): string[] {
    const cells: string[] = [];
    let cell = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      const nextCharacter = line[index + 1];
      if (character === '"' && inQuotes && nextCharacter === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = !inQuotes;
      } else if (character === ',' && !inQuotes) {
        cells.push(cell);
        cell = '';
      } else {
        cell += character;
      }
    }

    if (inQuotes) {
      throw new Error('CSV contains an unclosed quoted value.');
    }

    cells.push(cell);
    return cells;
  }
}
