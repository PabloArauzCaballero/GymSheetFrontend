import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { queryKeys } from '@gymsheet/hooks';
import { accountExportStatusSchema, latestAccountExportResponseSchema, type AccountExportStatus } from '@gymsheet/schemas';
import { apiClient } from '@/api/client';
import { notify } from '@/notifications';
import { shareAccountExport } from './export-file';
import { exportPollInterval, exportRateLimitSeconds, exportView } from './export-logic';

const exportService = {
  request: () => apiClient.request('/me/export', accountExportStatusSchema, { method: 'POST' }),
  latest: async (): Promise<AccountExportStatus | null> =>
    (await apiClient.request('/me/export/latest', latestAccountExportResponseSchema, { method: 'GET' })).export,
};

/**
 * «Descargar mis datos»: request (202), poll while the worker builds the
 * archive, then download and share it. The server's latest request is the
 * source of truth, so a copy asked for yesterday, or on another device, resumes.
 */
export function useAccountExport() {
  const queryClient = useQueryClient();
  const [rateLimitedFor, setRateLimitedFor] = useState<number | null>(null);

  const latest = useQuery({
    queryKey: queryKeys.accountExportLatest,
    queryFn: exportService.latest,
    refetchInterval: (query) => exportPollInterval(query.state.data ?? undefined),
  });

  const request = useMutation({
    mutationFn: exportService.request,
    onSuccess: (created) => {
      setRateLimitedFor(null);
      queryClient.setQueryData(queryKeys.accountExportLatest, created);
    },
    onError: (error) => {
      const seconds = exportRateLimitSeconds(error);
      if (seconds === null) notify.error(error);
      else {
        setRateLimitedFor(seconds);
        // Asked elsewhere meanwhile: show that copy instead of only the wait.
        void latest.refetch();
      }
    },
  });

  const share = useMutation({
    mutationFn: ({ id, downloadPath }: { id: string; downloadPath: string }) => shareAccountExport(id, downloadPath),
    onSuccess: (shared) => {
      if (!shared) notify.warning('Este dispositivo no permite compartir archivos. Descarga tu copia desde la web.');
    },
    onError: (error) => notify.error(error),
  });

  const current = latest.data ?? null;
  const view = exportView(current, rateLimitedFor);
  return {
    view,
    loading: latest.isPending,
    error: latest.isError ? latest.error : null,
    retry: () => void latest.refetch(),
    busy: request.isPending || share.isPending,
    act: () => {
      if (view.kind === 'ready' && current) share.mutate({ id: current.id, downloadPath: view.downloadPath });
      else request.mutate();
    },
  };
}
