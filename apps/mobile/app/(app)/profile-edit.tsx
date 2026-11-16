import { useQueryClient } from '@tanstack/react-query';
import { profileProgress } from '@gymsheet/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';
import { GenderPreference } from '@/components/gender-preference';
import { Card, ScreenHeader, ScrollScreen, Section } from '@/components/layout';
import { NavRow } from '@/components/list';
import { SegmentedPill } from '@/components/motion';
import { BackLink } from '@/components/nav';
import { ProfilePhotoGallery } from '@/components/profile-photo-gallery';
import { SocialStatusEditor } from '@/components/social-status-editor';
import { Text } from '@/components/text';
import { Skeleton } from '@/components/feedback';
import { BioEditor } from '@/features/profile-edit/bio-editor';
import { PendingPoints } from '@/features/profile-edit/pending-points';
import { ProfilePreview } from '@/features/profile-edit/profile-preview';
import { TrainingEditor } from '@/features/profile-edit/training-editor';
import { confirmDiscardDrafts, useLeaveGuard } from '@/features/profile-edit/unsaved-guard';
import { useAwardDetector } from '@/features/profile-hero/points-award';
import { PROFILE_COMPLETION_KEY, useOwnProfile } from '@/features/profile-hero/use-own-profile';
import { GOAL_LABEL } from '@/lib/format';
import { colors, minTouchTarget, radii, spacing } from '@/theme';

type Tab = 'edit' | 'preview';
type SectionKey = 'photos' | 'about' | 'training' | 'data' | 'senda' | 'social';

/** Qué sección abre cada dato del empujón: la pedida sube arriba del todo. */
const SECTION_OF: Record<string, SectionKey> = {
  FOTO: 'photos',
  FOTOS_3: 'photos',
  BIO: 'about',
  NIVEL: 'training',
  INTERESES: 'training',
  GENERO: 'senda',
};

/**
 * Editar perfil (a lo Tinder): «Editar» y «Vista previa» en dos pestañas. En
 * «Editar» cada sección guarda por su cuenta y dice cuántos puntos le quedan
 * por dar; en «Vista previa» está tu carta tal como la ve el resto.
 */
export default function ProfileEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string; section?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'preview' ? 'preview' : 'edit');
  const own = useOwnProfile();
  const queryClient = useQueryClient();
  const completion = own.completion.data;
  // An award earned by a save here answers at once (haptic + spoken line); the hero shows it on return.
  useAwardDetector(completion, own.principal?.id);
  // Unsaved sections are never dropped silently: leaving or switching to the preview asks first.
  useLeaveGuard();

  // The photo gallery only refreshes its own list: re-read completion after it changes.
  const photosVersion = own.photos.dataUpdatedAt;
  useEffect(() => {
    if (photosVersion) void queryClient.invalidateQueries({ queryKey: PROFILE_COMPLETION_KEY });
  }, [photosVersion, queryClient]);

  const profile = own.profile.data;
  const sections: Record<SectionKey, ReactNode> = {
    // Every section says what it still pays in the same place: the first row of its card.
    photos: <ProfilePhotoGallery header={<PendingPoints codes={['FOTO', 'FOTOS_3']} completion={completion} />} key="photos" />,
    about: <BioEditor bio={own.bio} footer={<PendingPoints codes={['BIO']} completion={completion} />} key={`about-${own.bio ?? ''}`} />,
    training: (
      <TrainingEditor
        footer={<PendingPoints codes={['NIVEL', 'INTERESES']} completion={completion} />}
        interests={own.onboarding.data?.trainingPreferences ?? []}
        key={`training-${own.onboarding.data?.experienceLevel ?? ''}|${(own.onboarding.data?.trainingPreferences ?? []).join('|')}`}
        level={own.onboarding.data?.experienceLevel ?? null}
      />
    ),
    data: (
      <Section key="data" title="Tus datos">
        <Card list>
          <PendingPoints codes={['DATOS', 'NACIMIENTO']} completion={completion} />
          <NavRow
            onPress={() => router.push('/profile-data')}
            subtitle={profile ? `${profile.pesoKg.toLocaleString('es-ES')} kg · ${profile.estaturaCm} cm · ${GOAL_LABEL[profile.objetivo]}` : 'Añade peso, estatura y objetivo'}
            testID="profile-edit-data"
            title="Peso, estatura, nacimiento y objetivo"
          />
        </Card>
      </Section>
    ),
    senda: <GenderPreference header={<PendingPoints codes={['GENERO']} completion={completion} />} key="senda" />,
    social: <SocialStatusEditor key="social" />,
  };
  const first = SECTION_OF[params.section ?? ''];
  const order: SectionKey[] = ['photos', 'about', 'training', 'data', 'senda', 'social'];
  const ordered = first ? [first, ...order.filter((key) => key !== first)] : order;

  return (
    <ScrollScreen>
      <BackLink fallbackHref="/profile" label="Perfil" neutral />
      <ScreenHeader
        subtitle={completion ? profileProgress(completion).label : 'Lo que ven los demás y lo que ajusta tus entrenos.'}
        title="Editar perfil"
      />
      <SegmentedPill
        fill
        onChange={(next) => {
          void confirmDiscardDrafts().then((go) => go && setTab(next));
        }}
        options={[
          { value: 'edit', accessibilityLabel: 'Editar' },
          { value: 'preview', accessibilityLabel: 'Vista previa' },
        ]}
        pillColor={colors.surfaceHighest}
        renderItem={(option, active) => (
          <Text strong={active} tone={active ? 'default' : 'secondary'} variant="subhead">
            {option.value === 'edit' ? 'Editar' : 'Vista previa'}
          </Text>
        )}
        style={{ backgroundColor: colors.surfaceLow, borderRadius: radii.full, padding: spacing.xs }}
        itemStyle={{ minHeight: minTouchTarget, alignItems: 'center', justifyContent: 'center' }}
        value={tab}
      />
      {tab === 'preview' ? (
        own.cardEntry && !own.photos.isPending && !own.branches.isLoading ? <ProfilePreview entry={own.cardEntry} /> : <Skeleton height={420} />
      ) : (
        ordered.map((key) => sections[key])
      )}
    </ScrollScreen>
  );
}
