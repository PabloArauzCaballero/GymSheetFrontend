'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { notify } from '@/shared/notifications';
import { impersonationClient } from './services/impersonation-client';

/**
 * Start or stop operating a gym. Every cached answer belongs to the previous
 * scope, so the cache is reset and the server tree re-rendered (the banner is
 * drawn by the portal layout from the HttpOnly cookie).
 */
export function useImpersonation() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const settle = async () => {
    await queryClient.resetQueries();
    router.refresh();
  };
  const start = useMutation({
    mutationFn: (tenantId: string) => impersonationClient.start(tenantId),
    onSuccess: async (gym) => {
      await settle();
      notify.success(`Ahora operas ${gym.nombre}.`);
    },
    onError: (error: Error) => notify.error(error),
  });
  const stop = useMutation({
    mutationFn: () => impersonationClient.stop(),
    onSuccess: settle,
    onError: (error: Error) => notify.error(error),
  });
  return { start, stop };
}
