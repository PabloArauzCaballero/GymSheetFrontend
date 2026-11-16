'use client';

import { consentCopy, consentInput, consentsSectionCopy } from '@gymsheet/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/api/api-error';
import { CONSENT_VERSION_OUTDATED, type Consent } from '@/shared/api/schemas';
import { queryKeys } from '@/shared/api/query-keys';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonList } from '@/shared/components/feedback/skeleton';
import { confirm, notify } from '@/shared/notifications';
import { privacyService } from '../services/privacy-service';
import { ConsentRow } from './consent-row';

/**
 * The separate consents with grant/revoke. Revoking asks first and says what
 * gets erased: the backend deletes the datum in the same transaction.
 */
export function ConsentsList() {
  const queryClient = useQueryClient();
  const consents = useQuery({ queryKey: queryKeys.consents, queryFn: privacyService.consents });

  const change = useMutation({
    mutationFn: ({ consent, granted }: { consent: Consent; granted: boolean }) =>
      privacyService.setConsent(consent.kind, consentInput(granted, consent.currentVersion)),
    onSuccess: async (_saved, { granted }) => {
      notify.success(granted ? consentsSectionCopy.grantedNotice : consentsSectionCopy.revokedNotice);
      // Revoking erases data other screens show (onboarding, Conocer, the map).
      await queryClient.invalidateQueries();
    },
    onError: async (error: Error) => {
      if (error instanceof ApiError && error.code === CONSENT_VERSION_OUTDATED) {
        await consents.refetch();
        notify.warning(consentsSectionCopy.versionChanged);
        return;
      }
      notify.error(error);
    },
  });

  async function askRevoke(consent: Consent) {
    const answer = await confirm({
      title: consentsSectionCopy.revokeTitle(consent.kind),
      message: consentCopy[consent.kind].revokeEffect,
      description: 'Puedes volver a aceptarlo después, pero el dato borrado no vuelve.',
      severity: 'danger',
      confirmLabel: consentsSectionCopy.revokeConfirm,
    });
    if (answer.confirmed) change.mutate({ consent, granted: false });
  }

  if (consents.isLoading) return <SkeletonList rows={4} variant="stacked" />;
  if (consents.isError) {
    return (
      <ErrorPanel
        error={consents.error}
        message={consents.error.message}
        onRetry={() => void consents.refetch()}
      />
    );
  }
  return (
    <div className="panel px-5 py-1">
      <ul aria-label={consentsSectionCopy.title} className="divide-y divide-[var(--border)]">
        {(consents.data ?? []).map((consent) => (
          <ConsentRow
            busy={change.isPending}
            consent={consent}
            key={consent.kind}
            onGrant={(target) => change.mutate({ consent: target, granted: true })}
            onRevoke={(target) => void askRevoke(target)}
          />
        ))}
      </ul>
    </div>
  );
}
