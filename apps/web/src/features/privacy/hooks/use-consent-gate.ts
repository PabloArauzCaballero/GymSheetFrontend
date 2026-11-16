'use client';

import {
  consentCopy,
  consentInput,
  consentRequiredKind,
  consentsSectionCopy,
  currentConsentVersion,
  isConsentActive,
} from '@gymsheet/domain';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import type { ConsentKind } from '@/shared/api/schemas';
import { queryKeys } from '@/shared/api/query-keys';
import { confirm, notify } from '@/shared/notifications';
import { privacyService } from '../services/privacy-service';

/**
 * Asks for a separate consent right where a sensitive datum is saved.
 *
 * - `grant(kind)`: records the consent to the current text (the person already
 *   read its purpose inline, e.g. a checkbox).
 * - `ensure(kind)`: grants it after a dialog with its purpose, unless active.
 * - `withConsent(save)`: runs `save`; on a 400 `CONSENT_REQUIRED` it asks for
 *   that consent and retries once. Any other failure is rethrown untouched.
 */
export function useConsentGate() {
  const queryClient = useQueryClient();

  const grant = useCallback(
    async (kind: ConsentKind) => {
      // Always the server's current version: a cached one could be outdated (409).
      const consents = await queryClient.fetchQuery({
        queryKey: queryKeys.consents,
        queryFn: privacyService.consents,
        staleTime: 0,
      });
      const saved = await privacyService.setConsent(
        kind,
        consentInput(true, currentConsentVersion(consents, kind)),
      );
      queryClient.setQueryData(queryKeys.consents, (current: typeof consents | undefined) =>
        current?.map((entry) => (entry.kind === kind ? saved : entry)),
      );
      return saved;
    },
    [queryClient],
  );

  const ensure = useCallback(
    async (kind: ConsentKind, options: { force?: boolean } = {}) => {
      if (!options.force) {
        const known = await queryClient
          .fetchQuery({ queryKey: queryKeys.consents, queryFn: privacyService.consents, staleTime: 60_000 })
          // Unknown state: asking once more is the safe answer.
          .catch(() => undefined);
        if (isConsentActive(known?.find((entry) => entry.kind === kind))) return true;
      }
      const answer = await confirm({
        title: consentsSectionCopy.promptTitle(kind),
        message: consentCopy[kind].purpose,
        description: 'Puedes retirarlo cuando quieras en Ajustes, en Privacidad y datos.',
        severity: 'info',
        confirmLabel: consentsSectionCopy.promptConfirm,
      });
      if (!answer.confirmed) return false;
      try {
        await grant(kind);
        return true;
      } catch (error: unknown) {
        notify.error(error instanceof Error ? error : consentsSectionCopy.versionChanged);
        return false;
      }
    },
    [grant, queryClient],
  );

  const withConsent = useCallback(
    async <T>(save: () => Promise<T>): Promise<T> => {
      try {
        return await save();
      } catch (error: unknown) {
        const kind = consentRequiredKind(error);
        // The server says it is missing, whatever the cache thinks.
        if (!kind || !(await ensure(kind, { force: true }))) throw error;
        return save();
      }
    },
    [ensure],
  );

  return useMemo(() => ({ grant, ensure, withConsent }), [grant, ensure, withConsent]);
}
