import type { ApiClient } from '@gymsheet/api-client';
import {
  routineProgressExportFileSchema,
  type RoutineProgressExportFile,
} from '@gymsheet/schemas';

export interface RoutineProgressExportFilters {
  format: 'excel' | 'csv' | 'pdf';
  routineId?: string;
  datePreset?: 'ALL' | 'LAST_30' | 'LAST_90' | 'LAST_YEAR';
  dateFrom?: string;
  dateTo?: string;
  includeHistory?: boolean;
  includeTargets?: boolean;
  includePrograms?: boolean;
}

// A full history export is built server-side and can take well over the
// client's default 15 s budget.
const EXPORT_TIMEOUT_MS = 60_000;

/**
 * Asks the backend for the file as JSON (the shared client always sends
 * `Accept: application/json`), so every format comes back the same way: the
 * `{ ok, data }` envelope with the file in base64. The client unwraps the
 * envelope, renews an expired session once and validates `data` against the
 * shared schema, so a malformed answer fails here instead of being saved.
 */
export function requestRoutineProgressFile(
  client: Pick<ApiClient, 'request'>,
  filters: RoutineProgressExportFilters,
): Promise<RoutineProgressExportFile> {
  return client.request('/export/routine-progress', routineProgressExportFileSchema, {
    method: 'POST',
    body: filters,
    timeoutMs: EXPORT_TIMEOUT_MS,
  });
}
