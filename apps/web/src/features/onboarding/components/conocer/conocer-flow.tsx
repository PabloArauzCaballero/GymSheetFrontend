'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ProfilePhotoGallery } from '@/features/profile/components/profile-photo-gallery';
import { profilePhotosService } from '@/features/profile/services/profile-photos-service';
import { DiscoveryPreferencesCard } from '@/features/social/components/discovery-preferences-card';
import { SocialProfileEditor } from '@/features/social/components/conocer/social-profile-editor';
import { useSocialProfileDraft } from '@/features/social/hooks/use-social-profile-draft';
import { queryKeys } from '@/shared/api/query-keys';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { LoadingPanel } from '@/shared/components/feedback/loading-panel';
import { Card, CardContent } from '@/shared/components/ui/card';
import { notify } from '@/shared/notifications';
import { onboardingService } from '../../services/onboarding-service';
import { ConocerFooter } from './conocer-footer';
import { CONOCER_MIN_PHOTOS, conocerSteps } from './conocer-steps';

/**
 * The optional "Conocer" step after the four onboarding questions. Every
 * substep saves on «Continuar»; «Saltar por ahora» closes the step as SKIPPED
 * and the answers already saved stay saved. It never blocks the portal.
 */
export function ConocerFlow() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(0);
  const { query, draft, setDraft, saveDraft, saving, orientationConsent } = useSocialProfileDraft();
  const photos = useQuery({ queryKey: queryKeys.profilePhotos, queryFn: profilePhotosService.list });
  const close = useMutation({
    mutationFn: onboardingService.setSocialStep,
    onSuccess: (state) => {
      queryClient.setQueryData(queryKeys.onboarding, state);
      router.replace('/comunidad');
    },
    onError: (error: Error) => notify.error(error),
  });

  if (query.isError) return <ErrorPanel message={query.error.message} onRetry={() => void query.refetch()} />;
  const step = conocerSteps[index];
  if (!draft || !step) return <LoadingPanel rows={5} />;

  const isLast = index === conocerSteps.length - 1;
  const next = () => setIndex((current) => Math.min(current + 1, conocerSteps.length - 1));
  const photoCount = photos.data?.length ?? 0;
  const onContinue = async () => {
    if (step.key === 'photos') return close.mutate('DONE');
    if (await saveDraft()) next();
  };

  return (
    <main className="mx-auto grid w-full max-w-2xl gap-6 px-4 py-8 sm:py-12">
      <div className="grid gap-2">
        <div
          aria-label={`Conocer, paso ${index + 1} de ${conocerSteps.length}`}
          aria-valuemax={conocerSteps.length}
          aria-valuemin={1}
          aria-valuenow={index + 1}
          className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-high)]"
          role="progressbar"
        >
          <div
            className="h-full rounded-full bg-[var(--volt)] transition-[width] duration-[var(--dur-4)] ease-[var(--ease-out)] motion-reduce:transition-none"
            style={{ width: `${((index + 1) / conocerSteps.length) * 100}%` }}
          />
        </div>
        <p className="data-label mt-3 text-[var(--text-muted)]">Conocer · opcional</p>
        <h1 className="display-title">{step.title}</h1>
        <p className="t-subhead text-[var(--text-muted)] sm:text-[17px]">{step.subline}</p>
      </div>

      {step.key === 'preferences' ? (
        <DiscoveryPreferencesCard embedded onSaved={next} submitLabel="Continuar" />
      ) : step.key === 'photos' ? (
        <ProfilePhotoGallery />
      ) : (
        <Card>
          <CardContent>
            <SocialProfileEditor
              draft={draft}
              onChange={setDraft}
              orientationConsent={orientationConsent}
              section={step.key}
            />
          </CardContent>
        </Card>
      )}

      {step.key === 'photos' && photoCount < CONOCER_MIN_PHOTOS ? (
        <p className="t-footnote text-[var(--text-muted)]">
          {`Te ${CONOCER_MIN_PHOTOS - photoCount === 1 ? 'falta 1 foto' : `faltan ${CONOCER_MIN_PHOTOS - photoCount} fotos`}. Puedes saltar este paso y subirlas después.`}
        </p>
      ) : null}

      <ConocerFooter
        canGoBack={index > 0}
        continueDisabled={step.key === 'photos' && photoCount < CONOCER_MIN_PHOTOS}
        hideContinue={step.key === 'preferences'}
        isLast={isLast}
        onBack={() => setIndex((current) => Math.max(current - 1, 0))}
        onContinue={() => void onContinue()}
        onSkip={() => close.mutate('SKIP')}
        pending={saving || (close.isPending && close.variables === 'DONE')}
        skipping={close.isPending && close.variables === 'SKIP'}
      />
    </main>
  );
}
