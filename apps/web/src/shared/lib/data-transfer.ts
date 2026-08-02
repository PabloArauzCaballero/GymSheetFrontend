/**
 * Client-side data transfer helpers: download JSON/CSV and parse pasted/uploaded
 * CSV. No backend round-trip — the browser builds the file from data already in
 * memory. Kept dependency-free and framework-agnostic.
 */

function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadJson(data: unknown, filename: string): void {
  triggerDownload(JSON.stringify(data, null, 2), filename, 'application/json');
}

function escapeCsvValue(value: unknown): string {
  if (value == null) return '';
  const text = String(value);
  return /[",\n\r]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export type CsvColumn<T> = { key: string; header: string; value: (row: T) => unknown };

export function downloadCsv<T>(rows: T[], columns: CsvColumn<T>[], filename: string): void {
  const header = columns.map((column) => escapeCsvValue(column.header)).join(',');
  const body = rows
    .map((row) => columns.map((column) => escapeCsvValue(column.value(row))).join(','))
    .join('\r\n');
  // Prepend a BOM so Excel opens UTF-8 accents correctly.
  triggerDownload(`﻿${header}\r\n${body}`, filename, 'text/csv');
}

/** Parses CSV text into row objects keyed by the header row. Handles quoted fields. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;

  const pushField = () => {
    record.push(field);
    field = '';
  };
  const pushRecord = () => {
    pushField();
    rows.push(record);
    record = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      pushField();
    } else if (char === '\n') {
      pushRecord();
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field.length > 0 || record.length > 0) pushRecord();

  const nonEmpty = rows.filter((row) => row.some((cell) => cell.trim().length > 0));
  if (nonEmpty.length === 0) return [];

  const headers = (nonEmpty[0] ?? []).map((header) => header.trim());
  return nonEmpty.slice(1).map((row) => {
    const entry: Record<string, string> = {};
    headers.forEach((headerName, columnIndex) => {
      entry[headerName] = (row[columnIndex] ?? '').trim();
    });
    return entry;
  });
}
