'use client';

import { profileProgress } from '@gymsheet/domain';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BodyWeightCard } from '@/features/profile/components/body-weight-card';
import { ProfileMeasurements } from '@/features/profile/components/profile-measurements';
import { ProfilePhotoGallery } from '@/features/profile/components/profile-photo-gallery';
import { PROFILE_COMPLETION_KEY, useOwnProfile } from '@/features/profile/hooks/use-own-profile';
import { GenderPreferenceField } from '@/features/progression/components/gender-preference-field';
import { SocialStatusCard } from '@/features/social/components/social-status-card';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonDetail, SkeletonPageHeader, SkeletonScreen } from '@/shared/components/feedback/skeleton';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Section } from '@/shared/components/mobile/section';
import { Segmented } from '@/shared/components/ui/segmented';
import { BioEditor } from './bio-editor';
import { PendingPoints } from './pending-points';
import { ProfileDataForm } from './profile-data-form';
import { ProfilePreview } from './profile-preview';
import { TrainingEditor } from './training-editor';

type Tab = 'edit' | 'preview';

/**
 * Editar perfil (espejo de `apps/mobile/app/(app)/profile-edit.tsx`): «Editar»
 * y «Vista previa». Cada sección guarda por su cuenta, tiene su ancla
 * (`#fotos`, `#sobre-ti`, `#entreno`, `#datos`, `#senda`) y dice cuántos
 * puntos le quedan por dar.
 */
export function ProfileEditClient() {
  const router = useRouter();
  const params = useSearchParams();
  const tab: Tab = params.get('tab') === 'preview' ? 'preview' : 'edit';
  const own = useOwnProfile();
  const queryClient = useQueryClient();
  const completion = own.completion.data;

  // The gallery only refreshes its own list: re-read completion when photos change.
  const photosVersion = own.photos.dataUpdatedAt;
  useEffect(() => {
    if (photosVersion) void queryClient.invalidateQueries({ queryKey: PROFILE_COMPLETION_KEY });
  }, [photosVersion, queryClient]);

  if (own.profile.isPending || own.user.isPending) {
    return (
      <SkeletonScreen className="gap-8" label="Cargando tu perfil">
        <SkeletonPageHeader />
        <SkeletonDetail />
      </SkeletonScreen>
    );
  }
  // Never render the form blank on a failed read: saving would overwrite real data.
  if (own.profile.isError || own.user.isError) {
    return (
      <ErrorPanel
        message={(own.profile.error ?? own.user.error)?.message ?? 'No se pudo cargar tu perfil.'}
        onRetry={() => {
          void own.profile.refetch();
          void own.user.refetch();
        }}
      />
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[640px] grid-cols-1 gap-8">
      <Link className="t-subhead inline-flex min-h-11 w-fit items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text)]" href="/profile">
        <ChevronLeft aria-hidden className="size-4" />
        Perfil
      </Link>
      <PageHeader
        description={completion ? profileProgress(completion).label : 'Lo que ven los demás y lo que ajusta tus entrenos.'}
        title="Editar perfil"
        tutorialId="page:profile"
      />
      <Segmented
        label="Modo"
        onChange={(next) => router.replace(next === 'preview' ? '/profile/editar?tab=preview' : '/profile/editar', { scroll: false })}
        options={[
          { value: 'edit', label: 'Editar' },
          { value: 'preview', label: 'Vista previa' },
        ]}
        value={tab}
      />

      {tab === 'preview' ? (
        own.cardEntry && !own.branches.isLoading ? <ProfilePreview entry={own.cardEntry} /> : null
      ) : (
        <>
          {/* Every section says what it still pays in the same place: the first row of its card. */}
          <section className="scroll-mt-24" id="fotos">
            <ProfilePhotoGallery header={<PendingPoints codes={['FOTO', 'FOTOS_3']} completion={completion} />} />
          </section>
          <section className="scroll-mt-24" id="sobre-ti">
            <Section title="Sobre ti">
              <BioEditor bio={own.bio} key={own.bio ?? ''} footer={<PendingPoints codes={['BIO']} completion={completion} />} />
            </Section>
          </section>
          <section className="scroll-mt-24" id="entreno">
            <Section title="Tu entreno">
              <TrainingEditor
                key={`${own.onboarding.data?.experienceLevel ?? ''}|${(own.onboarding.data?.trainingPreferences ?? []).join('|')}`}
                footer={<PendingPoints codes={['NIVEL', 'INTERESES']} completion={completion} />}
                interests={own.onboarding.data?.trainingPreferences ?? []}
                level={own.onboarding.data?.experienceLevel ?? null}
              />
            </Section>
          </section>
          <section className="scroll-mt-24" id="datos">
            <ProfileDataForm footer={<PendingPoints codes={['DATOS', 'NACIMIENTO']} completion={completion} />} profile={own.profile.data ?? null} />
          </section>
          <section className="scroll-mt-24" id="senda">
            <Section title="Rangos de tu senda">
              <div className="panel grid gap-3 p-5">
                <PendingPoints codes={['GENERO']} completion={completion} />
                <GenderPreferenceField value={own.user.data?.genero ?? null} />
              </div>
            </Section>
          </section>
          <SocialStatusCard />
          <section className="grid scroll-mt-24 gap-5" id="progress">
            <BodyWeightCard />
            <ProfileMeasurements />
          </section>
        </>
      )}
    </div>
  );
}
