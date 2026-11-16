'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { draftOf, toUpdateInput, type SocialProfileDraft } from '../lib/social-profile-draft';
import { socialProfileKeys, socialProfileService } from '../services/social-profile-service';
import { ApiError } from '@/shared/api/api-error';
import { notify } from '@/shared/notifications';

/**
 * The Conocer answers being edited, shared by the onboarding step and the
 * profile section so both save exactly the same way.
 *
 * On a stale version (409) the fresh profile is fetched and the draft is kept:
 * the person sees the server's message and decides whether to save again, and
 * nothing they typed is thrown away.
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
      await queryClient.invalidateQueries({ queryKey: socialProfileKeys.readiness });
    },
    onError: async (error: Error) => {
      if (error instanceof ApiError && error.status === 409) await query.refetch();
      notify.error(error);
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
