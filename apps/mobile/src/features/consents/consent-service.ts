import type { QueryClient } from '@tanstack/react-query';
import { consentInput, currentConsentVersion } from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import { consentSchema, consentsResponseSchema, type Consent, type ConsentKind } from '@gymsheet/schemas';
import { apiClient } from '@/api/client';

export const consentQueryKey = queryKeys.consents;

export const consentService = {
  list: async (): Promise<Consent[]> =>
    (await apiClient.request('/me/consents', consentsResponseSchema, { method: 'GET' })).consents,
  /** Granting names the version of the text shown; revoking erases the datum on the server. */
  set: (kind: ConsentKind, granted: boolean, version?: string) =>
    apiClient.request(`/me/consents/${encodeURIComponent(kind)}`, consentSchema, {
      method: 'PUT',
      body: consentInput(granted, version),
    }),
};

/** The consent list from the cache, fetched once if this screen is the first to need it. */
export function loadConsents(queryClient: QueryClient): Promise<Consent[]> {
  return queryClient.fetchQuery({ queryKey: consentQueryKey, queryFn: consentService.list, staleTime: 60_000 });
}

/** Current version of one consent text; `undefined` (server default) when it cannot be read. */
export async function consentVersionOf(queryClient: QueryClient, kind: ConsentKind): Promise<string | undefined> {
  return currentConsentVersion(await loadConsents(queryClient).catch(() => undefined), kind);
}

/** Puts the server's answer for one kind into the cached list. */
export function storeConsent(queryClient: QueryClient, saved: Consent): void {
  queryClient.setQueryData<Consent[]>(consentQueryKey, (list) =>
    list ? list.map((item) => (item.kind === saved.kind ? saved : item)) : list,
  );
}
