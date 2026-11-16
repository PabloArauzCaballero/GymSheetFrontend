import type { QueryClient } from '@tanstack/react-query';
import { reportCopy } from '@gymsheet/domain';
import { myReportsService } from '@/api/my-reports-service';
import { notify } from '@/notifications';
import { reportSentRequest } from './report-sent-request';

/**
 * Withdraws and refreshes. It changes what this person sees almost everywhere
 * (the content comes back to Explorar and the catalog), so every active query
 * refetches: a rare, deliberate action, and a key list would go stale.
 */
export async function withdrawReport(queryClient: QueryClient, reportId: string): Promise<boolean> {
  try {
    await myReportsService.withdraw(reportId);
  } catch (error) {
    notify.error(error);
    return false;
  }
  notify.success(reportCopy.withdrawn);
  await queryClient.invalidateQueries();
  return true;
}

/**
 * Shown right after filing. A plain function, not a hook: the toast outlives
 * the sheet or screen that filed the report.
 */
export function notifyReportSent(
  queryClient: QueryClient,
  result: { id: string; contentHidden: boolean },
  consequence: string,
) {
  notify.success(
    reportSentRequest({
      contentHidden: result.contentHidden,
      consequence,
      onWithdraw: () => void withdrawReport(queryClient, result.id),
    }),
  );
}
