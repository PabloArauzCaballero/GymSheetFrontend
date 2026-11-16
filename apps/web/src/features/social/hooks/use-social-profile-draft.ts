'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { draftOf, toUpdateInput, type SocialProfileDraft } from '../lib/social-profile-draft';
import { socialProfileKeys, socialProfileService } from '../services/social-profile-service';
import { refreshDiscoveryReadiness, socialProfileSaveFailure } from '@/shared/api/query-keys';
import { notify } from '@/shared/notifications';

/**
 * The Conocer answers being edited, shared by the onboarding step and the
 * profile section so both save exactly the same way.
 *
 * On a stale version (409) the shared merge rule applies, as on mobile: the
 * draft is kept, the server copy is re-read only for its version, and the
 * person is told the profile changed elsewhere and saves again when ready.
 */
export function useSocialProfileDraft() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: socialProfileKeys.profile, queryFn: socialProfileService.get });
  const [draft, setDraft] = useState<SocialProfileDraft | null>(null);
  // Seed the draft once, while rendering, so the first frame already shows the saved answers.
  if (query.data && draft === null) setDraft(draftOf(query.data));

  const save = useMutation({
    mutationFn: (next: SocialProfileDraft) =>
      socialProfileService.update(toUpdateInput(next, query.data?.version ?? 0)),
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
    /** Saves the current draft; resolves `true` only when the server accepted it. */
    saveDraft: async () => {
      if (!draft) return false;
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
