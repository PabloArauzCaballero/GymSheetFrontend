import { IconButton } from '@/components/icon-button';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { ApiError } from '@gymsheet/api-client';
import { ErrorState, Skeleton } from '@/components/feedback';
import { GenderPreference } from '@/components/gender-preference';
import { Badge, Card, Divider, ScrollScreen, ScreenHeader, Section } from '@/components/layout';
import { NavRow } from '@/components/list';
import { PressableScale } from '@/components/motion';
import { ProfilePhotoGallery } from '@/components/profile-photo-gallery';
import { ProgressTrack } from '@/components/progression';
import { SocialStatusEditor } from '@/components/social-status-editor';
import { Text } from '@/components/text';
import { TourTarget, useScreenTour } from '@/components/tour';
import { Button } from '@/components/ui';
import { WeightIncrementPreference } from '@/components/weight-increment-preference';
import { completionMessage, profileCompletion } from '@/features/profile-hero/profile-completion';
import { HeroStats, ProfileHero, plural } from '@/features/profile-hero/profile-hero';
import { proudStat, shareMyProfile } from '@/features/profile-hero/profile-share';
import { confirm, notify } from '@/notifications';
import { membershipService, profilePhotosService, profileService, progressionService } from '@/api/services';
import { GOAL_LABEL, MEMBERSHIP_LABEL, MEMBERSHIP_TONE, formatDate, initialsOf, shortName } from '@/lib/format';
import { routes } from '@/lib/routes';
import { useAuthStore } from '@/state/auth-store';
import { useTourStore } from '@/state/tour-store';
import { colors, iconSizes, spacing } from '@/theme';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administración',
  CLIENTE: 'Socio',
  ENTRENADOR_EXTERNO: 'Entrenador externo',
  COACH: 'Entrenador',
  FRONT_DESK: 'Recepción',
};

/**
 * Glifo de fila, callado: un trazo gris en vez de una ficha de color animada
 * por fila. El protagonista de la pantalla es el héroe, no la lista.
 */
function RowGlyph({ icon }: { icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: iconSizes.lg, alignItems: 'center' }}>
      <Ionicons color={colors.textSecondary} name={icon} size={iconSizes.md} />
    </View>
  );
}

/** Lista agrupada de filas que navegan: el patrón de ajustes de iOS. */
function RowGroup({ children }: { children: ReactNode[] }) {
  const items = children.filter(Boolean);
  return (
    <Card list>
      {items.map((child, index) => (
        <View key={index}>
          {index > 0 ? <Divider /> : null}
          {child}
        </View>
      ))}
    </Card>
  );
}

/**
 * Perfil (rediseño 2026-10-18): un héroe de identidad —foto con aro, nombre,
 * rango y tres cifras reales— que es lo que alguien capturaría y compartiría.
 * Debajo, el empujón para completar el perfil y dos listas calladas (tu
 * actividad, tu cuenta). El correo es privado: va al pie, no al héroe.
 */
export default function ProfileScreen() {
  const principal = useAuthStore((state) => state.principal);
  const logout = useAuthStore((state) => state.logout);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const resetTour = useTourStore((state) => state.reset);
  useScreenTour('profile');

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

  const measurements = useQuery({
    queryKey: ['profile', 'body-measurements'],
    queryFn: () => profileService.measurements(),
  });
  const profile = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => profileService.get(),
    // Sin onboarding no hay perfil: es un estado vacío, no un fallo.
    retry: (failureCount, error) => !(error instanceof ApiError && error.kind === 'not-found') && failureCount < 1,
  });
  const membership = useQuery({ queryKey: ['membership', 'me'], queryFn: () => membershipService.getMine() });
  const photos = useQuery({
    queryKey: ['profile', 'photos'],
    queryFn: () => profilePhotosService.list(),
    staleTime: 60_000,
  });
  const progression = useQuery({ queryKey: ['progression', 'me'], queryFn: () => progressionService.get() });

  const avatarUrl = photos.data?.[0]?.url ?? null;
  const missingProfile = profile.error instanceof ApiError && profile.error.kind === 'not-found';
  const earned = (progression.data?.badges ?? []).filter((badge) => badge.earned).length;
  const lastWeight = measurements.data?.[0];
  const firstWeight = measurements.data?.[measurements.data.length - 1];
  const weightTrend =
    lastWeight && firstWeight && lastWeight.id !== firstWeight.id
      ? `${lastWeight.weight - firstWeight.weight > 0 ? '+' : '−'}${Math.abs(lastWeight.weight - firstWeight.weight).toLocaleString('es-ES', { maximumFractionDigits: 1 })} ${lastWeight.unit.toLowerCase()} desde ${formatDate(firstWeight.measuredOn)}`
      : null;
  const member = membership.data?.membership;
  const displayName = principal?.nombreCompleto ?? shortName(undefined, principal?.email);
  const roleLabel = ROLE_LABEL[principal?.role ?? ''] ?? principal?.role ?? '—';

  const progress = progression.data;
  const rank = progress?.level?.name ?? null;
  const points = progress?.points ?? 0;
  const streak = progress ? (progress.streak?.current ?? progress.stats.currentStreakDays) : 0;
  const sessions = progress?.stats.totalSessions ?? 0;

  const completion = profileCompletion({
    profileKnown: Boolean(profile.data) || missingProfile,
    hasProfile: Boolean(profile.data),
    photosKnown: Boolean(photos.data),
    hasPhoto: Boolean(photos.data?.length),
    measurementsKnown: Boolean(measurements.data),
    hasMeasurement: Boolean(measurements.data?.length),
  });
  const completionText = completionMessage(completion.missing);

  const dataSubtitle = profile.isPending
    ? 'Cargando…'
    : missingProfile
      ? 'Completa tu perfil: peso, estatura y objetivo'
      : profile.data
        ? `${profile.data.pesoKg.toLocaleString('es-ES')} kg · ${profile.data.estaturaCm} cm · ${GOAL_LABEL[profile.data.objetivo]}`
        : 'No se pudieron cargar tus datos';

  return (
    <ScrollScreen
      onRefresh={() => {
        void profile.refetch();
        void membership.refetch();
        void photos.refetch();
        void progression.refetch();
        void measurements.refetch();
      }}
      refreshing={profile.isFetching || membership.isFetching || photos.isFetching || progression.isFetching}
    >
      <ScreenHeader
        action={<IconButton icon="settings-outline" label="Ajustes" onPress={() => router.push('/settings')} testID="profile-settings" />}
        title="Perfil"
        tourKey="profile"
      />

      <TourTarget id="profile.identity">
        <ProfileHero
          initials={initialsOf(principal?.nombreCompleto, principal?.email)}
          meta={principal?.role && principal.role !== 'CLIENTE' ? <Badge label={roleLabel} /> : null}
          name={displayName}
          photoUrl={avatarUrl}
          rank={progress ? (rank ?? 'Sin empezar') : null}
          testID="profile-hero"
        >
          {/* La senda: el dato que se gana entrenando; tocarla abre el detalle. */}
          {progression.isPending ? (
            <Skeleton height={96} />
          ) : progression.isError || !progress ? (
            <ErrorState error={progression.error} onRetry={() => void progression.refetch()} />
          ) : (
            <PressableScale
              accessibilityLabel={`Tu senda: ${rank ?? 'sin empezar'}, ${progress.points} puntos, ${earned} insignias. Ver la senda completa.`}
              onPress={() => router.push('/trayectoria')}
              style={{ gap: spacing.smd }}
            >
              <HeroStats
                stats={[
                  { key: 'points', value: points, label: 'puntos' },
                  { key: 'streak', value: streak, label: plural(streak, 'día de racha', 'días de racha') },
                  { key: 'sessions', value: sessions, label: plural(sessions, 'sesión', 'sesiones') },
                ]}
              />
              <ProgressTrack color={colors.textSecondary} ratio={progress.levelProgress} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Text style={{ flex: 1 }} tone="secondary" variant="footnote">
                  {[
                    progress.nextLevel && progress.pointsToNextLevel !== null
                      ? `Faltan ${progress.pointsToNextLevel.toLocaleString('es-ES')} para ${progress.nextLevel.name}`
                      : 'Senda completa',
                    earned === 1 ? '1 insignia' : `${earned} insignias`,
                  ].join(' · ')}
                </Text>
                <Ionicons color={colors.textSecondary} name="chevron-forward" size={iconSizes.sm} />
              </View>
            </PressableScale>
          )}
          {progress && rank && principal?.id ? (
            <Button
              haptic="light"
              icon="share-outline"
              label="Compartir mi perfil"
              onPress={() => shareMyProfile({ userId: principal.id, rank, stat: proudStat({ streak, sessions, points }) })}
              size="sm"
              style={{ alignSelf: 'flex-start' }}
              testID="profile-share"
              // Secundaria: el relleno de acento es de «Completar mi perfil» si aparece.
              variant={missingProfile ? 'ghost' : 'primary'}
            />
          ) : null}
        </ProfileHero>
      </TourTarget>

      {/* Empujón para completar el perfil, solo con lo que ya se sabe. */}
      {completionText ? (
        <View style={{ gap: spacing.sm }}>
          <Text tone="secondary" variant="subhead">
            {completionText}
          </Text>
          <ProgressTrack color={colors.textSecondary} height={4} ratio={completion.ratio} />
          {missingProfile ? (
            <Button icon="create-outline" label="Completar mi perfil" onPress={() => router.push('/onboarding')} size="sm" style={{ alignSelf: 'flex-start' }} />
          ) : null}
        </View>
      ) : null}

      <Section title="Tu actividad">
        <RowGroup>
          {[
            <NavRow key="entrenos" leading={<RowGlyph icon="barbell-outline" />} onPress={() => router.push('/workouts')} subtitle="Todas tus sesiones, con sus series" title="Mis entrenos" />,
            <NavRow
              key="ejercicios" leading={<RowGlyph icon="star-outline" />}
              onPress={() => router.push(routes.exerciseFavorites())}
              subtitle="Tus favoritos ☆ y el catálogo completo"
              testID="profile-exercises"
              title="Mis ejercicios y favoritos"
            />,
            <NavRow key="chat" leading={<RowGlyph icon="chatbubbles-outline" />} onPress={() => router.push('/chat')} subtitle="Habla con tus conexiones" title="Chat" />,
            <NavRow key="training-invitations" leading={<RowGlyph icon="people-outline" />} onPress={() => router.push('/training-invitations')} subtitle="Invitaciones recibidas y encuentros" title="Entrenar juntos" />,
          ]}
        </RowGroup>
      </Section>

      <ProfilePhotoGallery />
      <SocialStatusEditor />
      <GenderPreference />
      <WeightIncrementPreference />

      {/* Cuenta y app en una sola lista: una tarjeta menos. */}
      <Section title="Tu cuenta">
        <RowGroup>
          {[
            <NavRow
              key="datos" leading={<RowGlyph icon="person-circle-outline" />}
              onPress={() => router.push(missingProfile ? '/onboarding' : '/profile-edit')}
              subtitle={dataSubtitle}
              testID="profile-data"
              title="Mis datos"
            />,
            <NavRow
              key="peso" leading={<RowGlyph icon="scale-outline" />}
              onPress={() => router.push('/registrar-peso')}
              subtitle={
                measurements.isError
                  ? 'No se pudo cargar tu evolución'
                  : lastWeight
                    ? `Último: ${lastWeight.weight.toLocaleString('es-ES')} ${lastWeight.unit.toLowerCase()}${weightTrend ? ` · ${weightTrend}` : ''}`
                    : 'Anota tu primer pesaje'
              }
              title="Registrar peso"
            />,
            membership.isError ? (
              <View key="membresia-error" style={{ paddingVertical: spacing.sm }}>
                <ErrorState error={membership.error} onRetry={() => void membership.refetch()} />
              </View>
            ) : (
              <NavRow
                key="membresia" leading={<RowGlyph icon="card-outline" />}
                meta={member ? <Badge label={MEMBERSHIP_LABEL[member.estado]} tone={MEMBERSHIP_TONE[member.estado]} /> : null}
                onPress={() => router.push('/membership')}
                subtitle={
                  membership.isPending
                    ? 'Cargando…'
                    : member
                      ? `${member.plan?.nombre ?? 'Plan actual'} · vence ${formatDate(member.venceEl)}`
                      : 'Sin membresía asociada'
                }
                title="Membresía"
              />
            ),
            <NavRow key="notif" leading={<RowGlyph icon="notifications-outline" />} onPress={() => router.push('/notifications')} subtitle="Qué avisos quieres recibir" title="Notificaciones" />,
            <NavRow
              key="tour"
              leading={<RowGlyph icon="help-buoy-outline" />}
              onPress={() => void resetTour()}
              subtitle="Vuelve a ver la bienvenida y los avisos de cada pantalla"
              title="Ver tutorial"
            />,
            <NavRow key="ajustes" leading={<RowGlyph icon="settings-outline" />} onPress={() => router.push('/settings')} subtitle="Cuenta, versión y cierre de sesión" title="Ajustes" />,
          ]}
        </RowGroup>
      </Section>

      <View style={{ gap: spacing.sm }}>
        {principal?.email ? (
          <Text numberOfLines={1} selectable style={{ textAlign: 'center' }} tone="muted" variant="footnote">
            {`${roleLabel} · ${principal.email}`}
          </Text>
        ) : null}
        <Button
          icon="log-out-outline"
          label="Cerrar sesión"
          loading={signingOut}
          onPress={() => void onLogout()}
          size="lg"
          variant="danger"
        />
      </View>
    </ScrollScreen>
  );
}
