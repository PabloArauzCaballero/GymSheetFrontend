import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { ApiError } from '@gymsheet/api-client';
import { ErrorState, Skeleton } from '@/components/feedback';
import { GenderPreference } from '@/components/gender-preference';
import { Badge, Card, Divider, ScrollScreen, ScreenHeader, Section } from '@/components/layout';
import { NavRow } from '@/components/list';
import { ProfilePhotoGallery } from '@/components/profile-photo-gallery';
import { ProgressTrack } from '@/components/progression';
import { SocialStatusEditor } from '@/components/social-status-editor';
import { Text } from '@/components/text';
import { TourTarget, useScreenTour } from '@/components/tour';
import { Button } from '@/components/ui';
import { WeightIncrementPreference } from '@/components/weight-increment-preference';
import { membershipService, profilePhotosService, profileService, progressionService } from '@/api/services';
import { GOAL_LABEL, MEMBERSHIP_LABEL, MEMBERSHIP_TONE, formatDate, initialsOf, shortName } from '@/lib/format';
import { routes } from '@/lib/routes';
import { useAuthStore } from '@/state/auth-store';
import { useTourStore } from '@/state/tour-store';
import { colors, radii, spacing } from '@/theme';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administración',
  CLIENTE: 'Socio',
  ENTRENADOR_EXTERNO: 'Entrenador externo',
  COACH: 'Entrenador',
  FRONT_DESK: 'Recepción',
};

const AVATAR = 64;

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
 * Perfil (C8.3.8): la identidad arriba, la senda en una tarjeta, y todo lo
 * demás como filas `NavRow` agrupadas (tu cuenta, tu actividad, la app). Los
 * datos ya no son cuatro tarjetas de tabla: cada fila resume su dato en el
 * subtítulo y abre su pantalla.
 */
export default function ProfileScreen() {
  const principal = useAuthStore((state) => state.principal);
  const router = useRouter();
  const resetTour = useTourStore((state) => state.reset);
  useScreenTour('profile');

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
      <ScreenHeader title="Perfil" tourKey="profile" />

      <TourTarget id="profile.identity">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          {avatarUrl ? (
            <Image
              accessibilityIgnoresInvertColors
              contentFit="cover"
              source={{ uri: avatarUrl }}
              style={{ width: AVATAR, height: AVATAR, borderRadius: radii.full, backgroundColor: colors.surfaceHigh }}
              transition={200}
            />
          ) : (
            <View
              style={{
                width: AVATAR,
                height: AVATAR,
                borderRadius: radii.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surfaceHighest,
              }}
            >
              <Text tone="secondary" variant="title">
                {initialsOf(principal?.nombreCompleto, principal?.email)}
              </Text>
            </View>
          )}
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <Text numberOfLines={2} variant="title">
              {principal?.nombreCompleto ?? shortName(undefined, principal?.email)}
            </Text>
            <Text numberOfLines={1} selectable tone="muted" variant="subhead">
              {principal?.email}
            </Text>
            <View style={{ marginTop: spacing.xs }}>
              <Badge label={ROLE_LABEL[principal?.role ?? ''] ?? principal?.role ?? '—'} />
            </View>
          </View>
        </View>
      </TourTarget>

      {/* La senda: el dato que se gana entrenando, en una tarjeta que abre el detalle. */}
      {progression.isPending ? (
        <Skeleton height={132} />
      ) : progression.isError || !progression.data ? (
        <ErrorState error={progression.error} onRetry={() => void progression.refetch()} />
      ) : (
        <Card
          accessibilityLabel={`Tu senda: ${progression.data.level?.name ?? 'sin empezar'}, ${progression.data.points} puntos, ${earned} insignias. Ver la senda completa.`}
          onPress={() => router.push('/trayectoria')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm }}>
            <Text variant="headline">{progression.data.level?.name ?? 'Sin empezar'}</Text>
            <Text tabular tone="secondary" variant="subhead">
              {`${progression.data.points.toLocaleString('es-ES')} pts`}
            </Text>
          </View>
          <ProgressTrack color={colors.textSecondary} ratio={progression.data.levelProgress} />
          <Text tone="muted" variant="footnote">
            {[
              progression.data.nextLevel && progression.data.pointsToNextLevel !== null
                ? `Faltan ${progression.data.pointsToNextLevel.toLocaleString('es-ES')} para ${progression.data.nextLevel.name}`
                : 'Senda completa',
              earned === 1 ? '1 insignia' : `${earned} insignias`,
            ].join(' · ')}
          </Text>
        </Card>
      )}

      <Section title="Tu cuenta">
        <RowGroup>
          {[
            <NavRow
              key="datos"
              onPress={() => router.push(missingProfile ? '/onboarding' : '/profile-edit')}
              subtitle={dataSubtitle}
              testID="profile-data"
              title="Mis datos"
            />,
            <NavRow
              key="peso"
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
                key="membresia"
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
          ]}
        </RowGroup>
        {missingProfile ? (
          <Button label="Completar mi perfil" onPress={() => router.push('/onboarding')} size="sm" style={{ alignSelf: 'flex-start' }} />
        ) : null}
      </Section>

      <Section title="Tu actividad">
        <RowGroup>
          {[
            <NavRow key="entrenos" onPress={() => router.push('/workouts')} subtitle="Todas tus sesiones, con sus series" title="Mis entrenos" />,
            <NavRow
              key="ejercicios"
              onPress={() => router.push(routes.exerciseFavorites())}
              subtitle="Tus favoritos ☆ y el catálogo completo"
              testID="profile-exercises"
              title="Mis ejercicios y favoritos"
            />,
            <NavRow key="chat" onPress={() => router.push('/chat')} subtitle="Habla con tus conexiones" title="Chat" />,
          ]}
        </RowGroup>
      </Section>

      <ProfilePhotoGallery />
      <SocialStatusEditor />
      <GenderPreference />
      <WeightIncrementPreference />

      <Section title="La app">
        <RowGroup>
          {[
            <NavRow key="notif" onPress={() => router.push('/notifications')} subtitle="Qué avisos quieres recibir" title="Notificaciones" />,
            <NavRow
              key="tour"
              onPress={() => void resetTour()}
              subtitle="Vuelve a ver la bienvenida y los avisos de cada pantalla"
              title="Ver tutorial"
            />,
            <NavRow key="ajustes" onPress={() => router.push('/settings')} subtitle="Cuenta, versión y cierre de sesión" title="Ajustes" />,
          ]}
        </RowGroup>
      </Section>
    </ScrollScreen>
  );
}
