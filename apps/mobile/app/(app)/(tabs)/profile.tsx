import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { ApiError } from '@gymsheet/api-client';
import { NavRow } from '@/components/list';
import {
  Badge,
  Card,
  Columns,
  Divider,
  Row,
  ScrollScreen,
  ScreenHeader,
  Section,
} from '@/components/layout';
import { Button } from '@/components/ui';
import { GenderPreference } from '@/components/gender-preference';
import { ProfilePhotoGallery } from '@/components/profile-photo-gallery';
import { SocialStatusEditor } from '@/components/social-status-editor';
import { WeightIncrementPreference } from '@/components/weight-increment-preference';
import { BadgeTile, RankHero } from '@/components/progression';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import {
  membershipService,
  profilePhotosService,
  profileService,
  progressionService,
} from '@/api/services';
import { useAuthStore } from '@/state/auth-store';
import { useTourStore } from '@/state/tour-store';
import { TourTarget, useScreenTour } from '@/components/tour';
import {
  GOAL_LABEL,
  MEMBERSHIP_LABEL,
  MEMBERSHIP_TONE,
  formatDate,
  initialsOf,
  shortName,
} from '@/lib/format';
import { colors, fontSizes, radii, spacing } from '@/theme';

const MEASUREMENT_SOURCE_LABEL: Record<string, string> = {
  ONBOARDING: 'Onboarding',
  PROFILE: 'Perfil',
  USER: 'Manual',
  ADMIN: 'Personal del gimnasio',
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administración',
  CLIENTE: 'Cliente',
  ENTRENADOR_EXTERNO: 'Entrenador externo',
  COACH: 'Entrenador',
  FRONT_DESK: 'Recepción',
};

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
    // A user who has not onboarded has no profile yet: that is an empty state,
    // not a failure, so retrying the 404 would only delay the screen.
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.kind === 'not-found') && failureCount < 1,
  });
  const membership = useQuery({
    queryKey: ['membership', 'me'],
    queryFn: () => membershipService.getMine(),
  });

  // Misma clave que la galería y la tira de stories: subir o borrar una foto ya
  // invalida esta caché, así que el avatar se actualiza sin código extra.
  const photos = useQuery({
    queryKey: ['profile', 'photos'],
    queryFn: () => profilePhotosService.list(),
    staleTime: 60_000,
  });
  const avatarUrl = photos.data?.[0]?.url ?? null;

  // Misma clave que /trayectoria: entrar al detalle no vuelve a pedir lo que
  // esta pantalla ya trajo.
  const progression = useQuery({
    queryKey: ['progression', 'me'],
    queryFn: () => progressionService.get(),
  });
  const earnedBadges = (progression.data?.badges ?? []).filter((badge) => badge.earned);
  // Tres caben sin empujar el resto del perfil fuera de la pantalla; el resto
  // está a un toque, en la senda completa.
  const shownBadges = earnedBadges.slice(0, 3);

  const missingProfile = profile.error instanceof ApiError && profile.error.kind === 'not-found';

  return (
    <ScrollScreen
      onRefresh={() => {
        void profile.refetch();
        void membership.refetch();
        void photos.refetch();
        void progression.refetch();
      }}
      refreshing={
        profile.isFetching || membership.isFetching || photos.isFetching || progression.isFetching
      }
    >
      <ScreenHeader title="Perfil" />

      <TourTarget id="profile.identity">
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          {/* Quien ya subió una foto la ve aquí: seguir pintando iniciales
              encima de una cuenta con foto se lee como si no se hubiera
              guardado. Las iniciales siguen siendo el fondo de armario. */}
          {avatarUrl ? (
            <Image
              contentFit="cover"
              source={{ uri: avatarUrl }}
              style={{
                width: 56,
                height: 56,
                borderRadius: radii.full,
                backgroundColor: colors.surfaceHigh,
              }}
              transition={200}
            />
          ) : (
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: radii.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.volt,
              }}
            >
              <Text
                style={{ color: colors.background, fontSize: fontSizes.lg, fontWeight: '700' }}
              >
                {initialsOf(principal?.nombreCompleto, principal?.email)}
              </Text>
            </View>
          )}
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text
              numberOfLines={1}
              style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: '700' }}
            >
              {principal?.nombreCompleto ?? shortName(undefined, principal?.email)}
            </Text>
            <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
              {principal?.email}
            </Text>
            <Badge label={ROLE_LABEL[principal?.role ?? ''] ?? principal?.role ?? '—'} />
          </View>
        </View>

        {/* Editing was only reachable from a navigation row far below the fold:
            on a phone the user had to scroll past two data cards to find out
            their own details could be changed at all. The action belongs next
            to the identity it edits, and it is the only entry point: the same
            destination also sat in the navigation list below, so the screen
            offered one action twice under two different names. */}
        <Button
          label="Editar mis datos"
          onPress={() => router.push('/profile-edit')}
          variant="ghost"
        />
      </Card>
      </TourTarget>

      {/* Los puntos y las insignias estaban solo detrás de un enlace: lo que se
          gana entrenando no puede vivir a un toque de distancia del perfil que
          lo gana. Aquí va el resumen —rango, puntos y lo ya conseguido— y el
          detalle completo sigue en /trayectoria. */}
      <Section icon="trophy-outline" title="Tu senda">
        {progression.isPending ? (
          <Skeleton height={200} />
        ) : progression.isError || !progression.data ? (
          <ErrorState error={progression.error} onRetry={() => void progression.refetch()} />
        ) : (
          <>
            <RankHero
              level={progression.data.level}
              levelProgress={progression.data.levelProgress}
              nextLevel={progression.data.nextLevel}
              points={progression.data.points}
              pointsToNextLevel={progression.data.pointsToNextLevel}
            />
            {shownBadges.length ? (
              <View style={{ gap: spacing.sm }}>
                {shownBadges.map((badge) => (
                  <BadgeTile
                    badge={badge}
                    key={badge.code}
                    onPress={() => router.push('/trayectoria')}
                  />
                ))}
                {earnedBadges.length > shownBadges.length ? (
                  // Enseñar tres de siete sin decirlo haría creer que solo hay
                  // tres: la cuenta que falta se dice, no se esconde.
                  <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                    {`Y ${earnedBadges.length - shownBadges.length} insignia${
                      earnedBadges.length - shownBadges.length === 1 ? '' : 's'
                    } más en tu senda.`}
                  </Text>
                ) : null}
              </View>
            ) : (
              <EmptyState
                icon="ribbon-outline"
                message="Registra tu primer entrenamiento y la primera insignia llega sola."
                title="Sin insignias todavía"
              />
            )}
          </>
        )}
      </Section>

      {/* Both are short label/value cards: side by side on a tablet, where one
          full-width card stretches "Peso … 75 kg" across the whole screen. */}
      <Columns>
        <Section icon="body-outline" title="Datos físicos">
        {profile.isPending ? (
          <Skeleton height={130} />
        ) : missingProfile ? (
          <EmptyState
            icon="body-outline"
            message="Completa tu onboarding en la web para ver aquí peso, estatura y objetivo."
            title="Perfil sin completar"
          />
        ) : profile.isError ? (
          <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
        ) : profile.data ? (
          <Card>
            <Row icon="scale-outline" label="Peso" value={`${profile.data.pesoKg} kg`} />
            <Divider />
            <Row icon="resize-outline" label="Estatura" value={`${profile.data.estaturaCm} cm`} />
            <Divider />
            <Row icon="calendar-outline" label="Edad" value={profile.data.edad ? `${profile.data.edad} años` : '—'} />
            <Divider />
            <Row icon="flag-outline" label="Objetivo" value={GOAL_LABEL[profile.data.objetivo]} />
            {profile.data.fechaActualizacion ? (
              <>
                <Divider />
                <Row
                  icon="time-outline"
                  label="Actualizado"
                  value={formatDate(profile.data.fechaActualizacion)}
                />
              </>
            ) : null}
          </Card>
        ) : null}
      </Section>

      <Section icon="card-outline" title="Membresía">
        {membership.isPending ? (
          <Skeleton height={110} />
        ) : membership.isError ? (
          <ErrorState error={membership.error} onRetry={() => void membership.refetch()} />
        ) : membership.data?.membership ? (
          <Card>
            <Row
              icon="pricetag-outline"
              label="Plan"
              value={membership.data.membership.plan?.nombre ?? 'Plan actual'}
            />
            <Divider />
            <Row icon="play-outline" label="Inicio" value={formatDate(membership.data.membership.iniciaEl)} />
            <Divider />
            <Row icon="flag-outline" label="Vence" value={formatDate(membership.data.membership.venceEl)} />
            <Divider />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Estado</Text>
              <Badge
                label={MEMBERSHIP_LABEL[membership.data.membership.estado]}
                tone={MEMBERSHIP_TONE[membership.data.membership.estado]}
              />
            </View>
          </Card>
          ) : (
            <EmptyState
              icon="card-outline"
              message="No hay una membresía asociada a tu cuenta."
              title="Sin membresía"
            />
          )}
        </Section>
      </Columns>

      <ProfilePhotoGallery />

      <SocialStatusEditor />

      <Section icon="trending-up-outline" title="Evolución del peso">
        {measurements.isPending ? (
          <Skeleton height={130} />
        ) : measurements.isError ? (
          <ErrorState error={measurements.error} onRetry={() => void measurements.refetch()} />
        ) : measurements.data?.length ? (
          <Card>
            {measurements.data.map((item, index) => (
              <View key={item.id}>
                {index > 0 ? <Divider /> : null}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: spacing.xs,
                  }}
                >
                  <View>
                    <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: '600' }}>
                      {formatDate(item.measuredOn)}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                      {MEASUREMENT_SOURCE_LABEL[item.source] ?? item.source}
                    </Text>
                  </View>
                  <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: '700' }}>
                    {item.weight} {item.unit}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        ) : (
          <EmptyState
            icon="trending-up-outline"
            message="Cada vez que actualices tu peso, queda registrado aquí."
            title="Sin mediciones todavía"
          />
        )}
        {/* Hasta ahora el histórico sólo se llenaba de rebote, al editar el
            perfil entero. Anotar un pesaje es lo que se hace cada semana, así
            que la acción vive junto a la evolución que alimenta. */}
        <Button
          icon="add"
          label="Registrar peso"
          onPress={() => router.push('/registrar-peso')}
          variant="ghost"
        />
      </Section>

      <GenderPreference />

      <WeightIncrementPreference />

      <Card>
        <NavRow
          onPress={() => router.push('/trayectoria')}
          subtitle="El camino completo, la clasificación y tus días de descanso"
          title="Ver toda la senda"
        />
        <Divider />
        <NavRow onPress={() => router.push('/chat')} subtitle="Habla con tus conexiones" title="Chat" />
        <Divider />
        <NavRow
          onPress={() => router.push('/membership')}
          subtitle="Plan, vencimiento, historial y renovación"
          title="Mi suscripción"
        />
        <Divider />
        <NavRow
          onPress={() => router.push('/notifications')}
          subtitle="Qué avisos quieres recibir"
          title="Notificaciones"
        />
        <Divider />
        <NavRow
          onPress={() => void resetTour()}
          subtitle="Vuelve a ver la bienvenida y los avisos de cada pantalla"
          title="Ver tutorial"
        />
        <Divider />
        <NavRow
          onPress={() => router.push('/settings')}
          subtitle="Cuenta, versión y cierre de sesión"
          title="Ajustes"
        />
      </Card>
    </ScrollScreen>
  );
}
