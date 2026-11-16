import {
  myReportPageSchema,
  reportResultSchema,
  reportWithdrawalSchema,
  type ModerationTargetKind,
} from '@gymsheet/schemas';
import type { RequestFn } from './routine-services';

/**
 * The reporter's side of moderation, shared by web and mobile: filing a
 * report, «Tus denuncias», and taking a report back.
 */
export function createMyReportServices(request: RequestFn) {
  return {
    report: (input: { targetKind: ModerationTargetKind; targetId: string; reason: string; details?: string }) =>
      request('/me/reports', reportResultSchema, { method: 'POST', body: input }),
    list: (cursor?: string | null, limit = 20) => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (cursor) params.set('cursor', cursor);
      return request(`/me/reports?${params.toString()}`, myReportPageSchema, { method: 'GET' });
    },
    /** Idempotent: a double tap answers the first withdrawal again. */
    withdraw: (reportId: string) =>
      request(`/me/reports/${encodeURIComponent(reportId)}/withdraw`, reportWithdrawalSchema, { method: 'POST' }),
  };
}

export type MyReportServices = ReturnType<typeof createMyReportServices>;
