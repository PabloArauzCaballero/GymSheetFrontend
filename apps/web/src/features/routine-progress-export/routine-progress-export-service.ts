import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';
import { base64ToBlob, saveBlob } from '@/shared/lib/data-transfer';

export type ExportFormat = 'excel' | 'csv' | 'pdf';
export type DatePreset = 'ALL' | 'LAST_30' | 'LAST_90' | 'LAST_YEAR';

/** Same body the mobile wizard sends (`apps/mobile/src/lib/export-progress.ts`). */
export type RoutineProgressFilters = {
  format: ExportFormat;
  routineId: string;
  datePreset: DatePreset;
  includeHistory: boolean;
  includeTargets: boolean;
  includePrograms: boolean;
};

export const ALL_DATA: Omit<RoutineProgressFilters, 'format'> = {
  routineId: 'ALL',
  datePreset: 'ALL',
  includeHistory: true,
  includeTargets: true,
  includePrograms: true,
};

const EXTENSION: Record<ExportFormat, string> = { excel: 'xlsx', csv: 'csv', pdf: 'pdf' };

export const exportRoutineSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  objetivo: z.string().nullable().optional(),
  duracionSemanas: z.number().nullable().optional(),
});
export type ExportRoutine = z.infer<typeof exportRoutineSchema>;

const filterOptionsSchema = z.object({ routines: z.array(exportRoutineSchema) });

/**
 * With `Accept: application/json` the backend answers every format the same
 * way: metadata plus the file in base64 inside the `{ ok, data }` envelope.
 * The binary branch is avoided on purpose: its CSV goes out wrapped in the
 * envelope (the response interceptor reads the Content-Type before the
 * handler sets it), so the JSON branch is the only one correct for all three.
 */
export const exportFileSchema = z.object({
  fileName: z.string(),
  mimeType: z.string().min(1),
  recordsCount: z.number().int().nonnegative(),
  base64: z.string().regex(/^[A-Za-z0-9+/]*={0,2}$/u),
});

/** Only a plain `name.ext` from the server becomes the saved filename. */
const SAFE_FILENAME = /^[\w.-]+\.(xlsx|csv|pdf)$/u;

export type SavedExport = { fileName: string; recordsCount: number };

export const routineProgressExportService = {
  filterOptions: () =>
    apiRequest('/export/routine-progress/filter-options', filterOptionsSchema).then(
      (data) => data.routines,
    ),
  async download(filters: RoutineProgressFilters): Promise<SavedExport> {
    const file = await apiRequest('/export/routine-progress', exportFileSchema, {
      method: 'POST',
      body: filters,
      timeoutMs: 60_000,
    });
    const fileName = SAFE_FILENAME.test(file.fileName)
      ? file.fileName
      : `repp-progreso-rutinas.${EXTENSION[filters.format]}`;
    saveBlob(base64ToBlob(file.base64, file.mimeType), fileName);
    return { fileName, recordsCount: file.recordsCount };
  },
};
