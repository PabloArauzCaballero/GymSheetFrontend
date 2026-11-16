import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { IconButton } from '@/components/icon-button';
import { Skeleton } from '@/components/feedback';
import { Badge, ScrollScreen, ScreenHeader } from '@/components/layout';
import { HeroSurface } from '@/components/hero-surface';
import { Text } from '@/components/text';
import { TourTarget, useScreenTour } from '@/components/tour';
import { WeightIncrementPreference } from '@/components/weight-increment-preference';
import { AboutSection } from '@/features/profile-hero/about-section';
import { CompletionAvatar } from '@/features/profile-hero/completion-avatar';
import { CompletionError, CompletionNudge, CompletionSkeleton } from '@/features/profile-hero/completion-nudge';
import { usePointsAward } from '@/features/profile-hero/points-award';
import { editRouteFor } from '@/features/profile-hero/edit-routes';
import { fitnessNumbers } from '@/features/profile-hero/fitness-numbers';
import { FitnessRow } from '@/features/profile-hero/fitness-row';
import { ProfileActions, type ProfileAction } from '@/features/profile-hero/profile-actions';
import { RankChip } from '@/features/profile-hero/profile-hero';
import { AccountList, ActivityList, ConocerList } from '@/features/profile-hero/profile-lists';
import { proudStat, shareMyProfile } from '@/features/profile-hero/profile-share';
import { SendaCard } from '@/features/profile-hero/senda-card';
import { useCompleteSeen } from '@/features/profile-hero/use-complete-seen';
import { useOwnProfile } from '@/features/profile-hero/use-own-profile';
import { initialsOf, shortName } from '@/lib/format';
import { confirm, notify } from '@/notifications';
import { EnterUp } from '@/components/motion';
import { useAuthStore } from '@/state/auth-store';
import { radii, spacing } from '@/theme';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administración',
  CLIENTE: 'Socio',
  ENTRENADOR_EXTERNO: 'Entrenador externo',
  COACH: 'Entrenador',
  FRONT_DESK: 'Recepción',
};

/**
 * Perfil (rediseño 2026-11-15, a lo Tinder): la cara grande con el aro de
 * completitud, puntos · racha · sesiones bajo el nombre, tres acciones en
 * círculo —vista previa, editar, compartir— y, debajo, el empujón con los puntos reales que da cada dato que
 * falta. Luego, en el mismo orden que la web: «Sobre ti», tu senda, tu
 * actividad, Conocer gente, tu cuenta y, al final, el incremento de peso (un
 * ajuste).
 */
export default function ProfileScreen() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const [signingOut, setSigningOut] = useState(false);
  useScreenTour('profile');
  const own = useOwnProfile();
  const { principal, completion } = own;

  // Volver de editar trae datos nuevos: la completitud se relee (y otorga) al enfocar.
  const refetchCompletion = completion.refetch;
  useFocusEffect(useCallback(() => void refetchCompletion(), [refetchCompletion]));

  // Lo recién ganado se celebra una vez, donde viven los puntos (el servidor solo lo marca en la lectura que lo otorga).
  const award = usePointsAward(completion.data, principal?.id);
  // The 100 % card is said once per device: full the first time, a quiet line after.
  const completeSeen = useCompleteSeen(principal?.id, completion.data?.percent);

  const onLogout = async () => {
    const result = await confirm({
      title: 'Cerrar sesión',
      message: 'Se cerrará la sesión en este dispositivo. Deberás iniciar sesión de nuevo.',
      confirmLabel: 'Cerrar sesión',
      cancelLabel: 'Volver',
    });
    if (!result.confirmed) return;
    setSigningOut(true);
    try {
      await logout();
      notify.success('Sesión cerrada.');
    } finally {
      setSigningOut(false);
    }
  };

  const name = own.account.data?.nombreCompleto ?? principal?.nombreCompleto ?? shortName(undefined, principal?.email);
  const age = own.profile.data?.edad ?? null;
  const roleLabel = ROLE_LABEL[principal?.role ?? ''] ?? principal?.role ?? '—';
  const progress = own.progression.data;
  const rank = progress ? (progress.level?.name ?? 'Sin empezar') : null;
  // Three fixed slots, Editar always centred: Compartir waits (inert) for real numbers instead of popping in.
  const userId = principal?.id ?? null;
  // A failed read with nothing cached is said out loud (ring and card), never hidden.
  const completionFailed = completion.isError && !completion.data;
  const retryCompletion = () => void completion.refetch();
  const hasPhoto = Boolean(own.cardEntry?.photoUrl);
  const shareStat = progress ? proudStat(fitnessNumbers(progress)) : null;
  const actions: ProfileAction[] = [
    { key: 'preview', label: 'Vista previa', icon: 'eye-outline', onPress: () => router.push('/profile-edit?tab=preview'), testID: 'profile-preview' },
    { key: 'edit', label: 'Editar', icon: 'create-outline', onPress: () => router.push('/profile-edit'), primary: true, testID: 'profile-edit' },
    {
      key: 'share',
      label: 'Compartir',
      icon: 'share-outline',
      onPress: () => {
        if (userId && rank && shareStat) shareMyProfile({ userId, rank, stat: shareStat });
      },
      disabled: !(userId && rank && shareStat),
      disabledLabel: own.progression.isError ? 'Compartir: no se pudo cargar tu senda' : 'Compartir: cargando tu senda',
      testID: 'profile-share',
    },
  ];

  return (
    <ScrollScreen
      onRefresh={() => {
        for (const query of [own.account, own.profile, own.onboarding, own.photos, own.progression, completion]) void query.refetch();
      }}
      refreshing={own.profile.isFetching || own.photos.isFetching || own.progression.isFetching || completion.isFetching}
    >
      <ScreenHeader
        action={<IconButton icon="settings-outline" label="Ajustes" onPress={() => router.push('/settings')} testID="profile-settings" />}
        title="Perfil"
        tourKey="profile"
      />

      <TourTarget id="profile.identity">
        <EnterUp>
        <HeroSurface testID="profile-hero" watermark watermarkAt="top">
          <CompletionAvatar
            // The face is a button (Tinder): with a photo it shows how others see you; without, it asks for one.
            accessibilityHint={hasPhoto ? 'Ver cómo te ven en Conocer' : 'Añadir una foto'}
            onPress={() => router.push(hasPhoto ? '/profile-edit?tab=preview' : editRouteFor('FOTO'))}
            initials={initialsOf(principal?.nombreCompleto, principal?.email)}
            failed={completionFailed}
            percent={completion.data?.percent ?? null}
            photoUrl={own.cardEntry?.photoUrl ?? null}
          />
          <View style={{ alignItems: 'center', gap: spacing.sm }}>
            <Text accessibilityRole="header" numberOfLines={2} style={{ textAlign: 'center' }} variant="title">
              {age !== null ? `${name}, ${age}` : name}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {/* The rank slot always holds something of the chip's height, so the hero never jumps. */}
              {rank ? <RankChip label={rank} /> : own.progression.isPending ? <Skeleton height={28} radius={radii.full} width={104} /> : <RankChip label="Sin cargar" />}
              {principal?.role && principal.role !== 'CLIENTE' ? <Badge label={roleLabel} /> : null}
            </View>
          </View>
          {/* The count-up waits for the re-read progression, so it never starts from a stale total. */}
          <FitnessRow award={award && own.progression.dataUpdatedAt >= award.at ? award : null} pending={own.progression.isPending} progress={progress} />
          <ProfileActions actions={actions} />
        </HeroSurface>
        </EnterUp>
      </TourTarget>

      {/* Sections enter once, in reading order (≤6 × 40 ms); with Reduce Motion they simply appear. */}
      <EnterUp index={1}>
        {completion.isPending ? (
          <CompletionSkeleton />
        ) : completion.data ? (
          <CompletionNudge completion={completion.data} onItemPress={(code) => router.push(editRouteFor(code))} onSeePreview={() => router.push('/profile-edit?tab=preview')} seenBefore={completeSeen} />
        ) : completionFailed ? (
          <CompletionError onRetry={retryCompletion} retrying={completion.isFetching} />
        ) : null}
      </EnterUp>

      <EnterUp index={2}>
        <AboutSection bio={own.bio} chips={own.chips} onEdit={() => router.push('/profile-edit?section=BIO')} />
      </EnterUp>

      <EnterUp index={3}>
        <SendaCard error={own.progression.error} onRetry={() => void own.progression.refetch()} pending={own.progression.isPending} progress={progress} />
      </EnterUp>

      <EnterUp index={4}>
        <ActivityList />
      </EnterUp>
      <EnterUp index={5}>
        <ConocerList />
      </EnterUp>
      <EnterUp index={6}>
        <AccountList
          missingProfile={own.missingProfile}
          onLogout={() => void onLogout()}
          profile={own.profile.data}
          profilePending={own.profile.isPending}
          signingOut={signingOut}
        />
      </EnterUp>
      <WeightIncrementPreference />

      {principal?.email ? (
        <Text numberOfLines={1} selectable style={{ textAlign: 'center' }} tone="muted" variant="footnote">
          {`${roleLabel} · ${principal.email}`}
        </Text>
      ) : null}
    </ScrollScreen>
  );
}
