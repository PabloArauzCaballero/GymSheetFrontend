import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { View, Text } from 'react-native';
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
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { membershipService, profileService } from '@/api/services';
import { useAuthStore } from '@/state/auth-store';
import {
  GOAL_LABEL,
  MEMBERSHIP_LABEL,
  MEMBERSHIP_TONE,
  formatDate,
  initialsOf,
  shortName,
} from '@/lib/format';
import { colors, fontSizes, radii, spacing } from '@/theme';

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

  const missingProfile = profile.error instanceof ApiError && profile.error.kind === 'not-found';

  return (
    <ScrollScreen
      onRefresh={() => {
        void profile.refetch();
        void membership.refetch();
      }}
      refreshing={profile.isFetching || membership.isFetching}
    >
      <ScreenHeader title="Perfil" />

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
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
            to the identity it edits. The row below stays as well — removing it
            would break the habit of anyone who already knows where it lives. */}
        <Button
          label="Editar mis datos"
          onPress={() => router.push('/profile-edit')}
          variant="ghost"
        />
      </Card>

      {/* Both are short label/value cards: side by side on a tablet, where one
          full-width card stretches "Peso … 75 kg" across the whole screen. */}
      <Columns>
        <Section title="Datos físicos">
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
            <Row label="Peso" value={`${profile.data.pesoKg} kg`} />
            <Divider />
            <Row label="Estatura" value={`${profile.data.estaturaCm} cm`} />
            <Divider />
            <Row label="Edad" value={profile.data.edad ? `${profile.data.edad} años` : '—'} />
            <Divider />
            <Row label="Objetivo" value={GOAL_LABEL[profile.data.objetivo]} />
            {profile.data.fechaActualizacion ? (
              <>
                <Divider />
                <Row
                  label="Actualizado"
                  value={formatDate(profile.data.fechaActualizacion)}
                />
              </>
            ) : null}
          </Card>
        ) : null}
      </Section>

      <Section title="Membresía">
        {membership.isPending ? (
          <Skeleton height={110} />
        ) : membership.isError ? (
          <ErrorState error={membership.error} onRetry={() => void membership.refetch()} />
        ) : membership.data?.membership ? (
          <Card>
            <Row
              label="Plan"
              value={membership.data.membership.plan?.nombre ?? 'Plan actual'}
            />
            <Divider />
            <Row label="Inicio" value={formatDate(membership.data.membership.iniciaEl)} />
            <Divider />
            <Row label="Vence" value={formatDate(membership.data.membership.venceEl)} />
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

      <Card>
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
          onPress={() => router.push('/profile-edit')}
          subtitle="Peso, estatura, edad y objetivo"
          title="Editar perfil"
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
