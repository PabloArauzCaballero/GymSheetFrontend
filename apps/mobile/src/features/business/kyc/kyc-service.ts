import { createBusinessKycServices } from '@gymsheet/api-client';
import { queryKeys } from '@gymsheet/hooks';
import type { KycState } from '@gymsheet/schemas';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { apiClient } from '@/api/client';
import { appendLocalFile } from '@/api/local-file-part';
import type { KycLocalFile } from './kyc-photo';

/** The business's KYC (ADR-0021): the same shared services as the web, over the bearer client. */
export const kycService = createBusinessKycServices(apiClient.request, apiClient.upload);

/** The photo as the multipart `file` part (expo/fetch needs `bytes()`, see `local-file-part`). */
export async function photoForm(file: KycLocalFile): Promise<FormData> {
  const form = new FormData();
  await appendLocalFile(form, 'file', file);
  return form;
}

export function useKycState() {
  return useQuery({ queryKey: queryKeys.business.kyc, queryFn: kycService.state, staleTime: 15_000 });
}

/** Applies a write's answer to the cache at once (pure updaters of `@gymsheet/hooks`), then re-reads in the background. */
export function useKycCache() {
  const client = useQueryClient();
  return useCallback(
    (update: (state: KycState | undefined) => KycState | undefined) => {
      client.setQueryData<KycState>(queryKeys.business.kyc, update);
      void client.invalidateQueries({ queryKey: queryKeys.business.kyc });
    },
    [client],
  );
}
