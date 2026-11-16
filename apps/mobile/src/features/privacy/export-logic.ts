import { ApiError } from '@gymsheet/api-client';
import { accountExportCopy, exportRetryAfterSeconds, isAccountExportDownloadable, waitLabel } from '@gymsheet/domain';
import { ACCOUNT_EXPORT_RATE_LIMITED, type AccountExportStatus } from '@gymsheet/schemas';

/** Mobile view of «Descargar mis datos» on top of the shared rules (runs under `node --test`). */

export { accountExportPollInterval as exportPollInterval } from '@gymsheet/domain';

export type ExportView =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'ready'; downloadPath: string; expiresAt: string | null }
  | { kind: 'failed' }
  | { kind: 'expired' }
  | { kind: 'rate-limited'; retryAfterSeconds: number };

/** What the export card shows, from the last known job and a 429, if any. */
export function exportView(job: AccountExportStatus | null | undefined, rateLimitedFor: number | null): ExportView {
  if (job?.status === 'PENDING') return { kind: 'pending' };
  if (job && isAccountExportDownloadable(job) && job.downloadPath) {
    return { kind: 'ready', downloadPath: job.downloadPath, expiresAt: job.expiresAt };
  }
  if (rateLimitedFor !== null) return { kind: 'rate-limited', retryAfterSeconds: rateLimitedFor };
  // READY without a path: its 7 days are over and the server no longer serves it.
  if (job?.status === 'READY') return { kind: 'expired' };
  if (job?.status === 'FAILED') return { kind: 'failed' };
  return { kind: 'idle' };
}

/** Seconds of a 429 ACCOUNT_EXPORT_RATE_LIMITED (at least 1); `null` for any other error. */
export function exportRateLimitSeconds(error: unknown): number | null {
  if (!(error instanceof ApiError) || error.code !== ACCOUNT_EXPORT_RATE_LIMITED) return null;
  return exportRetryAfterSeconds(error.details) ?? 1;
}

const DATE = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long' });

/** Copy per state: a title, one sentence and the action's label (none while there is nothing to do). */
export function exportCopy(view: ExportView): { title: string; message: string; action: string | null } {
  switch (view.kind) {
    case 'pending':
      return { title: accountExportCopy.title, message: accountExportCopy.pending, action: null };
    case 'ready':
      return {
        title: accountExportCopy.ready,
        message: view.expiresAt ? accountExportCopy.expires(DATE.format(new Date(view.expiresAt))) : accountExportCopy.description,
        action: accountExportCopy.download,
      };
    case 'failed':
      return { title: accountExportCopy.title, message: accountExportCopy.failed, action: accountExportCopy.request };
    case 'expired':
      return { title: accountExportCopy.title, message: 'Tu última copia caducó. Prepara una nueva.', action: accountExportCopy.request };
    case 'rate-limited':
      return { title: accountExportCopy.title, message: accountExportCopy.rateLimited(waitLabel(view.retryAfterSeconds)), action: null };
    default:
      return { title: accountExportCopy.title, message: accountExportCopy.description, action: accountExportCopy.request };
  }
}
