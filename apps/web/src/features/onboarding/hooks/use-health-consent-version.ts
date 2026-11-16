'use client';

import { consentsSectionCopy, currentConsentVersion } from '@gymsheet/domain';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '@/shared/api/api-error';
import { CONSENT_VERSION_OUTDATED } from '@/shared/api/schemas';
import { queryKeys } from '@/shared/api/query-keys';
import { notify } from '@/shared/notifications';
import { privacyService } from '@/features/privacy/services/privacy-service';

/**
 * Current version of the health consent text, sent with the training step so
 * the backend records exactly which text was accepted. Without it the backend
 * applies the current one, so a failed lookup never blocks the step.
 */
export function useHealthConsentVersion() {
  const consents = useQuery({
    queryKey: queryKeys.consents,
    queryFn: privacyService.consents,
    retry: false,
  });
  return {
    version: currentConsentVersion(consents.data, 'HEALTH'),
    /** A 409 means the text changed: re-read the version and ask to save again. */
    handleError: (error: Error) => {
      if (error instanceof ApiError && error.code === CONSENT_VERSION_OUTDATED) {
        void consents.refetch();
        notify.warning(consentsSectionCopy.versionChanged);
        return;
      }
      notify.error(error);
    },
  };
}
