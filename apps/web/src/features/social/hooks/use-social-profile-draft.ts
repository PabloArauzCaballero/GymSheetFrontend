'use client';

import { isConsentActive } from '@gymsheet/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { draftOf, toUpdateInput, type SocialProfileDraft } from '../lib/social-profile-draft';
import { socialProfileKeys, socialProfileService } from '../services/social-profile-service';
import { useConsentGate } from '@/features/privacy/hooks/use-consent-gate';
import { privacyService } from '@/features/privacy/services/privacy-service';
import { queryKeys, refreshDiscoveryReadiness, socialProfileSaveFailure } from '@/shared/api/query-keys';
import { notify } from '@/shared/notifications';

export const orientationConsentMissing = 'Marca el consentimiento para guardar tu orientación.';

/**
 * The Conocer answers being edited, shared by the onboarding step and the
 * profile section so both save exactly the same way.
 *
 * On a stale version (409) the shared merge rule applies, as on mobile: the
 * draft is kept, the server copy is re-read only for its version, and the
 * person is told the profile changed elsewhere and saves again when ready.
 *
 * An orientation is a sensitive datum: saving one needs the ORIENTATION
 * consent. The editor asks for it inline (`orientationConsent`), the save
 * records it first, and a 400 CONSENT_REQUIRED still prompts and retries once.
 */
export function useSocialProfileDraft() {
  const queryClient = useQueryClient();
  const gate = useConsentGate();
  const query = useQuery({ queryKey: socialProfileKeys.profile, queryFn: socialProfileService.get });
  const [draft, setDraft] = useState<SocialProfileDraft | null>(null);
  const [orientationChecked, setOrientationChecked] = useState(false);
  // Seed the draft once, while rendering, so the first frame already shows the saved answers.
  if (query.data && draft === null) setDraft(draftOf(query.data));

  const withOrientation = draft?.orientation != null;
  const consents = useQuery({
    queryKey: queryKeys.consents,
    queryFn: privacyService.consents,
    enabled: withOrientation,
    retry: false,
  });
  const orientationActive = isConsentActive(consents.data?.find((entry) => entry.kind === 'ORIENTATION'));
  const needsOrientationConsent = withOrientation && consents.isFetched && !orientationActive;

  const save = useMutation({
    mutationFn: async (next: SocialProfileDraft) => {
      if (next.orientation !== null && needsOrientationConsent && orientationChecked) {
        await gate.grant('ORIENTATION');
      }
      return gate.withConsent(() =>
        socialProfileService.update(toUpdateInput(next, query.data?.version ?? 0)),
      );
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData(socialProfileKeys.profile, saved);
      await refreshDiscoveryReadiness(queryClient);
    },
    onError: async (error: Error) => {
      const failure = socialProfileSaveFailure(error);
      if (!failure.conflict) {
        notify.error(error);
        return;
      }
      await query.refetch();
      notify.warning(failure.message);
    },
  });

  return {
    query,
    draft,
    setDraft,
    /** Inline ORIENTATION consent: `needed` only while an orientation is chosen and not consented. */
    orientationConsent: {
      needed: needsOrientationConsent,
      checked: orientationChecked,
      onChange: setOrientationChecked,
    },
    /** Saves the current draft; resolves `true` only when the server accepted it. */
    saveDraft: async () => {
      if (!draft) return false;
      if (draft.orientation !== null && needsOrientationConsent && !orientationChecked) {
        notify.warning(orientationConsentMissing);
        return false;
      }
      try {
        await save.mutateAsync(draft);
        return true;
      } catch {
        return false;
      }
    },
    saving: save.isPending,
  };
}
