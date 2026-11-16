'use client';

import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { reportCopy } from '@gymsheet/domain';
import { notify } from '@/shared/notifications';
import { myReportsService } from '@/features/moderation/services/my-reports-service';

/**
 * Withdraws and refreshes. Withdrawing changes what this person sees almost
 * everywhere (the content comes back to their lists), so every active query
 * refetches: it is a rare, deliberate action, and a precise key list would go
 * stale as surfaces are added.
 *
 * Plain function, not only a hook: the undo toast outlives the dialog that
 * filed the report.
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

export function useWithdrawReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reportId: string) => withdrawReport(queryClient, reportId),
  });
}
