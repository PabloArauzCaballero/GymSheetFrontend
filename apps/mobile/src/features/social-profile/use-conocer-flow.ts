import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ApiError } from '@gymsheet/api-client';
import { authDestination } from '@gymsheet/domain';
import { profilePhotosService } from '@/api/services';
import { socialProfileService } from '@/api/social-profile-service';
import { onboardingQueryKey } from '@/features/onboarding-guard/onboarding-gate';
import { notify, resolveError } from '@/notifications';
import { useAuthStore } from '@/state/auth-store';
import { CONOCER_STEPS, stepAt } from './conocer-steps';
import { refreshDiscoveryReadiness, socialProfileKeys } from './query-keys';
import { draftFromProfile, emptyDraft, missingPhotos, sameDraft, toUpdateInput, type SocialDraft } from './selection';

/** `onboarding`: offered after the questionnaire, closes the step. `perfil`: opened from Perfil, only edits. */
export type ConocerMode = 'onboarding' | 'perfil';

/**
 * State of the "Conocer" flow. Answers are saved on every «Siguiente», so
 * leaving halfway keeps what was answered and the flow can be resumed from
 * Perfil. The PUT replaces the whole profile, so the draft always holds all of it.
 */
export function useConocerFlow(mode: ConocerMode, initialStep: number) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const principal = useAuthStore((state) => state.principal);
  const [step, setStep] = useState(initialStep);
  const [draft, setDraft] = useState<SocialDraft>(emptyDraft);
  const [saveError, setSaveError] = useState<string | undefined>();
  const hydrated = useRef(false);

  const profile = useQuery({ queryKey: socialProfileKeys.profile, queryFn: socialProfileService.get });
  const photos = useQuery({ queryKey: ['profile', 'photos'], queryFn: () => profilePhotosService.list() });

  useEffect(() => {
    if (hydrated.current || !profile.data) return;
    hydrated.current = true;
    setDraft(draftFromProfile(profile.data));
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async (next: SocialDraft) => {
      const current = profile.data;
      if (current && sameDraft(next, draftFromProfile(current))) return current;
      return socialProfileService.update(toUpdateInput(next, current?.version ?? 0));
    },
    onSuccess: async (saved) => {
      setSaveError(undefined);
      queryClient.setQueryData(socialProfileKeys.profile, saved);
      await refreshDiscoveryReadiness(queryClient);
    },
    onError: async (error: Error) => {
      if (error instanceof ApiError && error.status === 409) {
        // Edited elsewhere: the server is the authority, show what it holds now.
        const fresh = await profile.refetch();
        if (fresh.data) setDraft(draftFromProfile(fresh.data));
        notify.warning('Tu perfil cambió en otro dispositivo. Te mostramos lo último guardado.');
        return;
      }
      setSaveError(resolveError(error).message);
      notify.error(error);
    },
  });

  const close = useMutation({
    mutationFn: (action: 'DONE' | 'SKIP') => socialProfileService.finishOnboardingStep(action),
    onSuccess: (onboarding) => {
      queryClient.setQueryData(onboardingQueryKey(principal?.id), onboarding);
      router.replace(authDestination.mobile.afterLogin);
    },
    onError: (error: Error) => notify.error(error),
  });

  const leave = () => (mode === 'onboarding' ? close.mutate('SKIP') : router.back());

  const next = async () => {
    try {
      await save.mutateAsync(draft);
    } catch {
      return; // Stay on the step: the error is already on screen.
    }
    if (step < CONOCER_STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (mode === 'onboarding') close.mutate('DONE');
    else router.back();
  };

  const photoCount = photos.data?.length;
  return {
    step,
    current: stepAt(step),
    isLast: step === CONOCER_STEPS.length - 1,
    draft,
    update: (patch: Partial<SocialDraft>) => setDraft((value) => ({ ...value, ...patch })),
    profile,
    photoCount,
    // Finishing the onboarding step needs the photos to appear in Conocer; skipping does not.
    finishBlocked: mode === 'onboarding' && (photoCount === undefined || missingPhotos(photoCount) > 0),
    saveError,
    busy: save.isPending || close.isPending,
    leaving: close.isPending && close.variables === 'SKIP',
    advance: () => setStep((value) => Math.min(value + 1, CONOCER_STEPS.length - 1)),
    back: () => setStep((value) => Math.max(0, value - 1)),
    next: () => void next(),
    leave,
  };
}
