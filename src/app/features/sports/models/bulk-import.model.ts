export type ImportEntityType = 'governing-bodies' | 'organisations' | 'participants' | 'sports' | 'teams';

export interface BulkImportEntityOption {
  value: ImportEntityType;
  label: string;
  requiredFields: string[];
  optionalFields: string[];
}

export interface BulkImportRow {
  rowNumber: number;
  values: Record<string, unknown>;
}

export interface BulkImportReport {
  rowNumber: number;
  label: string;
  message: string;
  status: 'added' | 'failed' | 'skipped';
}
