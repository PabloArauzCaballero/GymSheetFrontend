import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { IconButton } from '@/components/icon-button';
import { Skeleton } from '@/components/feedback';
import { Badge, ScrollScreen, ScreenHeader } from '@/components/layout';
import { HeroSurface } from '@/components/hero-surface';
import { Text } from '@/components/text';
import { TourTarget, useScreenTour } from '@/components/tour';
import { Button } from '@/components/ui';
import { WeightIncrementPreference } from '@/components/weight-increment-preference';
import { AboutSection } from '@/features/profile-hero/about-section';
import { CompletionAvatar } from '@/features/profile-hero/completion-avatar';
import { CompletionNudge } from '@/features/profile-hero/completion-nudge';
import { editRouteFor } from '@/features/profile-hero/edit-routes';
import { ProfileActions } from '@/features/profile-hero/profile-actions';
import { RankChip } from '@/features/profile-hero/profile-hero';
import { AccountList, ActivityList } from '@/features/profile-hero/profile-lists';
import { SendaCard } from '@/features/profile-hero/senda-card';
import { useOwnProfile } from '@/features/profile-hero/use-own-profile';
import { initialsOf, shortName } from '@/lib/format';
import { confirm, notify } from '@/notifications';
import { useAuthStore } from '@/state/auth-store';
import { spacing } from '@/theme';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administración',
  CLIENTE: 'Socio',
  ENTRENADOR_EXTERNO: 'Entrenador externo',
  COACH: 'Entrenador',
  FRONT_DESK: 'Recepción',
};

/**
 * Perfil (rediseño 2026-11-15, a lo Tinder): la cara grande con el aro de
 * completitud, tres acciones en círculo —ver como te ven, editar, añadir
 * fotos— y, debajo, el empujón con los puntos reales que da cada dato que
 * falta. Luego «Sobre ti», tu senda y las listas de siempre.
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

  // Lo recién ganado se celebra una vez: el servidor solo lo marca en la lectura que lo otorga.
  const celebrated = useRef('');
  const awardedNow = completion.data?.awardedNow ?? [];
  useEffect(() => {
    const key = awardedNow.join(',');
    if (!key || key === celebrated.current || !completion.data) return;
    celebrated.current = key;
    const points = completion.data.items.filter((item) => awardedNow.includes(item.code)).reduce((sum, item) => sum + item.points, 0);
    notify.success(`+${points} puntos por completar tu perfil.`);
  }, [awardedNow, completion.data]);

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
  const rank = own.progression.data ? (own.progression.data.level?.name ?? 'Sin empezar') : null;

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
        <HeroSurface testID="profile-hero" watermark>
          <CompletionAvatar initials={initialsOf(principal?.nombreCompleto, principal?.email)} percent={completion.data?.percent ?? null} photoUrl={own.cardEntry?.photoUrl ?? null} />
          <View style={{ alignItems: 'center', gap: spacing.sm }}>
            <Text accessibilityRole="header" numberOfLines={2} style={{ textAlign: 'center' }} variant="title">
              {age !== null ? `${name}, ${age}` : name}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {rank ? <RankChip label={rank} /> : null}
              {principal?.role && principal.role !== 'CLIENTE' ? <Badge label={roleLabel} /> : null}
            </View>
          </View>
          <ProfileActions
            actions={[
              { key: 'preview', label: 'Ver como te ven', icon: 'eye-outline', onPress: () => router.push('/profile-edit?tab=preview'), testID: 'profile-preview' },
              { key: 'edit', label: 'Editar perfil', icon: 'create-outline', onPress: () => router.push('/profile-edit'), primary: true, testID: 'profile-edit' },
              { key: 'photos', label: 'Añadir fotos', icon: 'camera-outline', onPress: () => router.push('/profile-edit?section=FOTO'), testID: 'profile-add-photos' },
            ]}
          />
        </HeroSurface>
      </TourTarget>

      {completion.isPending ? <Skeleton height={180} /> : completion.data ? <CompletionNudge completion={completion.data} onItemPress={(code) => router.push(editRouteFor(code))} /> : null}

      <AboutSection bio={own.bio} chips={own.chips} onEdit={() => router.push('/profile-edit?section=BIO')} />

      <SendaCard
        error={own.progression.error}
        onRetry={() => void own.progression.refetch()}
        pending={own.progression.isPending}
        progress={own.progression.data}
        userId={principal?.id ?? null}
      />

      <ActivityList />
      <WeightIncrementPreference />
      <AccountList missingProfile={own.missingProfile} profile={own.profile.data} profilePending={own.profile.isPending} />

      <View style={{ gap: spacing.sm }}>
        {principal?.email ? (
          <Text numberOfLines={1} selectable style={{ textAlign: 'center' }} tone="muted" variant="footnote">
            {`${roleLabel} · ${principal.email}`}
          </Text>
        ) : null}
        <Button icon="log-out-outline" label="Cerrar sesión" loading={signingOut} onPress={() => void onLogout()} size="lg" variant="danger" />
      </View>
    </ScrollScreen>
  );
}
