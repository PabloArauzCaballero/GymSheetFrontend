import { useCallback, useMemo } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { confirm, notify } from '@/notifications';
import { isConsentActive } from '@gymsheet/domain';
import type { ConsentKind } from '@gymsheet/schemas';
import { consentPromptMessage, consentsSectionCopy, requestConsent, runWithConsent } from './consent-logic';
import { consentQueryKey, consentService, loadConsents, storeConsent } from './consent-service';

/** Asks for `kind` inline (the system confirmation) and records the grant. */
export function askForConsent(queryClient: QueryClient, kind: ConsentKind): Promise<boolean> {
  return requestConsent(kind, {
    confirm: async (asked) => {
      const result = await confirm({
        title: consentsSectionCopy.promptTitle(asked),
        message: consentPromptMessage(asked, true),
        confirmLabel: consentsSectionCopy.promptConfirm,
        cancelLabel: 'Ahora no',
        severity: 'info',
      });
      return result.confirmed;
    },
    currentVersion: async (asked) =>
      (await loadConsents(queryClient)).find((item) => item.kind === asked)?.currentVersion,
    grant: async (asked, version) => {
      storeConsent(queryClient, await consentService.set(asked, true, version));
    },
    onOutdated: () => {
      void queryClient.invalidateQueries({ queryKey: consentQueryKey });
      notify.warning(consentsSectionCopy.versionChanged);
    },
  });
}

/**
 * The consent gate for any write that may answer 400 CONSENT_REQUIRED:
 * `withConsent(save)` runs `save`, asks for the consent the server names and
 * retries once. `ensure(kind)` asks up front, before a write that needs it.
 */
export function useConsentGate() {
  const queryClient = useQueryClient();
  const ensure = useCallback(async (kind: ConsentKind) => {
    const consents = await loadConsents(queryClient).catch(() => undefined);
    if (isConsentActive(consents?.find((item) => item.kind === kind))) return true;
    return askForConsent(queryClient, kind);
  }, [queryClient]);
  const withConsent = useCallback(
    <T,>(action: () => Promise<T>) => runWithConsent(action, (kind) => askForConsent(queryClient, kind)),
    [queryClient],
  );
  return useMemo(() => ({ ensure, withConsent }), [ensure, withConsent]);
}
